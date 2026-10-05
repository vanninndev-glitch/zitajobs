const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const mapUser = (r) => ({
  id: r.id, name: r.name, email: r.email, role: r.role, phone: r.phone,
  companyName: r.company_name, sector: r.sector, description: r.description,
  logo: r.logo, website: r.website, verified: r.verified, cv: r.cv,
  skills: r.skills || [], experience: r.experience, education: r.education,
  createdAt: r.created_at, updatedAt: r.updated_at
});
const sanitize = mapUser;
const tokenFor = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, companyName, sector, phone } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ success:false, message:'Todos los campos obligatorios son requeridos' });
    if (!['candidato','empresa'].includes(role)) return res.status(400).json({ success:false, message:'Rol inválido' });
    if (password.length < 6) return res.status(400).json({ success:false, message:'La contraseña debe tener al menos 6 caracteres' });

    const exists = await query('SELECT id FROM users WHERE lower(email)=lower($1)', [email]);
    if (exists.rowCount) return res.status(409).json({ success:false, message:'Este correo ya está registrado' });

    const hash = await bcrypt.hash(password, 12);
    const result = await query(`INSERT INTO users
      (name,email,password,role,phone,company_name,sector,description,verified,skills,experience,education)
      VALUES ($1,lower($2),$3,$4,$5,$6,$7,$8,false,'[]'::jsonb,'','') RETURNING *`,
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

module.exports = { register, login, me, mapUser, sanitize };
