const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/db');
const { newToken, hashToken, EMAIL_RE } = require('../utils/tokens');
const { sendMailInBackground, frontendUrl } = require('../services/mailer');
const tpl = require('../services/emailTemplates');

const mapUser = (r) => ({
  id: r.id, name: r.name, email: r.email, role: r.role, phone: r.phone,
  companyName: r.company_name, sector: r.sector, description: r.description,
  logo: r.logo, website: r.website, verified: r.verified, cv: r.cv,
  skills: r.skills || [], experience: r.experience, education: r.education,
  isAdmin: !!r.is_admin, createdAt: r.created_at, updatedAt: r.updated_at
});
const sanitize = mapUser;
const tokenFor = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, companyName, sector, phone, acceptTerms } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ success:false, message:'Todos los campos obligatorios son requeridos' });
    if (!['candidato','empresa'].includes(role)) return res.status(400).json({ success:false, message:'Rol inválido' });
    if (password.length < 6) return res.status(400).json({ success:false, message:'La contraseña debe tener al menos 6 caracteres' });
    if (acceptTerms !== true && acceptTerms !== 'true') return res.status(400).json({ success:false, message:'Debes aceptar el Aviso de Privacidad y los Términos para crear tu cuenta' });

    const exists = await query('SELECT id FROM users WHERE lower(email)=lower($1)', [email]);
    if (exists.rowCount) return res.status(409).json({ success:false, message:'Este correo ya está registrado' });

    const hash = await bcrypt.hash(password, 12);
    const result = await query(`INSERT INTO users
      (name,email,password,role,phone,company_name,sector,description,verified,skills,experience,education,accepted_terms_at)
      VALUES ($1,lower($2),$3,$4,$5,$6,$7,$8,false,'[]'::jsonb,'','',NOW()) RETURNING *`,
      [name, email, hash, role, phone || null, role === 'empresa' ? (companyName || name) : null, role === 'empresa' ? (sector || 'General') : null, role === 'empresa' ? '' : null]);
    const user = mapUser(result.rows[0]);
    res.status(201).json({ success:true, message:'Cuenta creada exitosamente', token:tokenFor(user), user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success:false, message:'Correo y contraseña requeridos' });
    const result = await query('SELECT * FROM users WHERE lower(email)=lower($1)', [email]);
    if (!result.rowCount) return res.status(401).json({ success:false, message:'Credenciales incorrectas' });
    const row = result.rows[0];
    if (!await bcrypt.compare(password, row.password)) return res.status(401).json({ success:false, message:'Credenciales incorrectas' });
    const user = mapUser(row);
    res.json({ success:true, message:'Sesión iniciada correctamente', token:tokenFor(user), user });
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!result.rowCount) return res.status(404).json({ success:false, message:'Usuario no encontrado' });
    res.json({ success:true, user:mapUser(result.rows[0]) });
  } catch (err) { next(err); }
};

const GENERIC_FORGOT = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.';
const RESET_TTL_MIN = 60;
const MAX_RESETS_PER_HOUR = 3;

// Responde siempre lo mismo (exista o no la cuenta) y envía el correo en segundo plano,
// para no revelar qué correos están registrados.
const forgotPassword = async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ success:false, message:'Escribe un correo válido' });
  res.json({ success:true, message:GENERIC_FORGOT });
  try {
    const u = await query('SELECT id,name,email FROM users WHERE lower(email)=$1', [email]);
    if (!u.rowCount) return;
    const user = u.rows[0];
    const recent = await query(`SELECT COUNT(*)::int AS n FROM password_resets WHERE user_id=$1 AND created_at > NOW() - INTERVAL '1 hour'`, [user.id]);
    if (recent.rows[0].n >= MAX_RESETS_PER_HOUR) return;
    const token = newToken();
    await query(`INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,NOW() + ($3 || ' minutes')::interval)`, [user.id, hashToken(token), String(RESET_TTL_MIN)]);
    const url = `${frontendUrl()}/restablecer-contrasena.html?token=${token}`;
    if (process.env.NODE_ENV !== 'production') console.log(`[dev] Enlace de restablecimiento para ${user.email}: ${url}`);
    sendMailInBackground({ to: user.email, ...tpl.passwordReset({ name: user.name.split(' ')[0], url }) });
  } catch (err) { console.error('[forgotPassword]', err.message); }
};

const resetPassword = async (req, res, next) => {
  const client = await getClient();
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return res.status(400).json({ success:false, message:'El enlace no es válido. Solicita uno nuevo.' });
    if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ success:false, message:'La contraseña debe tener al menos 6 caracteres' });
    const hash = await bcrypt.hash(password, 12);
    await client.query('BEGIN');
    // Reclamo atómico: el enlace solo sirve una vez.
    const claim = await client.query(`UPDATE password_resets SET used_at=NOW() WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW() RETURNING user_id`, [hashToken(token)]);
    if (!claim.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ success:false, message:'El enlace no es válido o ya venció. Solicita uno nuevo.' }); }
    const userId = claim.rows[0].user_id;
    const u = await client.query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2 RETURNING name,email', [hash, userId]);
    await client.query('UPDATE password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [userId]);
    await client.query('COMMIT');
    sendMailInBackground({ to: u.rows[0].email, ...tpl.passwordChanged({ name: u.rows[0].name.split(' ')[0] }) });
    res.json({ success:true, message:'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
};

module.exports = { register, login, me, forgotPassword, resetPassword, mapUser, sanitize };
