// routes/auth.js
const router = require('express').Router();
const { register, login, me } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario (candidato o empresa)
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener usuario autenticado
 * @access  Private
 */
router.get('/me', authMiddleware, me);

module.exports = router;
