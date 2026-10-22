const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createPasswordResetLimiter } = require('../middleware/passwordResetRateLimit');
const {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
router.get('/verify/:token', verifyEmail);
router.post('/forgot-password', createPasswordResetLimiter({ limit: 5 }), forgotPassword);
router.post('/reset-password', createPasswordResetLimiter({ limit: 20 }), resetPassword);

module.exports = router;
