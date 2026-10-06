// middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado, inicia sesión nuevamente' });
    }
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción' });
  }
  next();
};

// Administrador = usuario con is_admin=TRUE en la base de datos (se asigna manualmente, ver README).
const requireAdmin = async (req, res, next) => {
  try {
    const { query } = require('../config/db');
    const r = await query('SELECT is_admin FROM users WHERE id=$1', [req.user.id]);
    if (!r.rowCount || !r.rows[0].is_admin) {
      return res.status(403).json({ success: false, message: 'Acceso solo para administradores' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authMiddleware, requireRole, requireAdmin };
