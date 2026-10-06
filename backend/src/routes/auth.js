// routes/auth.js
const router = require('express').Router();
const { register, login, me, forgotPassword, resetPassword } = require('../controllers/authController');
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

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Enviar enlace para restablecer contraseña (respuesta siempre genérica)
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Cambiar la contraseña con el token recibido por correo
 * @access  Public
 */
router.post('/reset-password', resetPassword);

module.exports = router;
