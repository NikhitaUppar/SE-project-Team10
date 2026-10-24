const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createPasswordResetLimiter } = require('../middleware/passwordResetRateLimit');
const signup = require('../controllers/signupController').createSignupController();
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/signup/send-code', createPasswordResetLimiter({ limit: 10 }), signup.send);
router.post('/signup/verify-code', createPasswordResetLimiter({ limit: 30 }), signup.verify);
router.post('/signup/complete', createPasswordResetLimiter({ limit: 10 }), signup.complete);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', createPasswordResetLimiter({ limit: 5 }), resendVerification);
router.post('/forgot-password', createPasswordResetLimiter({ limit: 5 }), forgotPassword);
router.post('/reset-password', createPasswordResetLimiter({ limit: 20 }), resetPassword);

module.exports = router;
