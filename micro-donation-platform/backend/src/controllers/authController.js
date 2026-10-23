const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendPasswordResetEmail } = require('./emailController');
const { sendVerificationForUser } = require('../services/emailVerification');

// FR-01: Register
const register = async (req, res) => {
  const { display_name: displayName, email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    typeof displayName !== 'string' ||
    !displayName.trim() ||
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      error: 'A display name, valid email, and password of 8 to 72 bytes are required',
    });
  }

  try {
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      return res.status(500).json({ error: 'Unable to create account' });
    }
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      display_name: displayName.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      is_verified: false,
    });
    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      return res.status(500).json({ error: 'Unable to create account' });
    }

    try {
      const result = await sendVerificationForUser({ id: userId, email: normalizedEmail });
      if (result !== 'created') throw new Error('Verification email not sent');
    } catch (err) {
      return res.status(503).json({
        error: 'Account created, but the verification email could not be sent. Use Log in to resend it after one minute.',
      });
    }
    return res.status(201).json({
      message: 'Registration successful. Check your email to verify your account before logging in.',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to create account' });
  }
};

// FR-02: Login
const login = async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    typeof password !== 'string' || !password ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ error: 'A valid email and password are required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, display_name, is_verified, password_hash, auth_version')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'Unable to log in' });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, auth_version: user.auth_version ?? 0 },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );
    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, display_name: user.display_name },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to log in' });
  }
};

// FR-03: Verify email
const verifyEmail = async (req, res) => {
  const { token } = req.params;
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ error: 'Verification link is invalid or has already been used' });
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    // A database transaction verifies the user and consumes their tokens together.
    const { data, error } = await supabase.rpc('verify_email_token', { p_token_hash: tokenHash });
    if (error) return res.status(500).json({ error: 'Unable to verify email. Please try again.' });
    if (data === 'expired') {
      return res.status(410).json({ error: 'Verification link has expired. Log in to request a new email.' });
    }
    if (data !== 'verified') {
      return res.status(400).json({ error: 'Verification link is invalid or has already been used' });
    }
    if (req.accepts(['json', 'html']) === 'html') {
      return res.redirect(303, `${process.env.CLIENT_URL}/login?verified=1`);
    }
    return res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to verify email. Please try again.' });
  }
};

// Recover from an expired link or SMTP failure without creating a second account.
const resendVerification = async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (
    normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ error: 'A valid email and password are required' });
  }
  try {
    const { data: user, error } = await supabase.from('users')
      .select('id, email, password_hash, is_verified').eq('email', normalizedEmail).maybeSingle();
    if (error) throw new Error('User lookup failed');
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.is_verified) return res.json({ message: 'Your email is already verified. You can log in.' });
    const result = await sendVerificationForUser(user);
    if (result === 'already_verified') {
      return res.json({ message: 'Your email is already verified. You can log in.' });
    }
    if (result === 'throttled') {
      res.set('Retry-After', '60');
      return res.status(429).json({ error: 'Please wait one minute before requesting another verification email.' });
    }
    return res.json({ message: 'Check your email to verify your account.' });
  } catch (err) {
    return res.status(503).json({ error: 'Unable to send verification email. Please try again after one minute.' });
  }
};

// FR-04: Forgot password
const forgotPassword = async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  res.set('Cache-Control', 'no-store');
  // Acknowledge before account lookup/SMTP work so their timing is not exposed.
  const acknowledgement = res.json({ message: 'If an account exists for that email, a password reset link will be sent.' });
  try {
    const { data: user, error } = await supabase.from('users')
      .select('id, email').eq('email', normalizedEmail).maybeSingle();
    if (error) throw new Error('User lookup failed');
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const { data, error: tokenError } = await supabase.rpc('issue_password_reset_token', {
        p_user_id: user.id, p_token_hash: tokenHash,
      });
      if (tokenError || !['created', 'throttled', 'invalid'].includes(data)) {
        throw new Error('Token storage failed');
      }
      if (data === 'created') await sendPasswordResetEmail(user.email, token);
    }
  } catch (err) {
    // Do not expose account existence, provider errors, addresses, or secret tokens.
    console.warn('[Auth] Password reset request could not be processed');
  }
  return acknowledgement;
};

// FR-04: Reset password
const resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  res.set('Cache-Control', 'no-store');
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ error: 'Reset link is invalid or has already been used' });
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 bytes' });
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase.rpc('reset_password_with_token', {
      p_token_hash: tokenHash, p_password_hash: passwordHash,
    });
    if (error) return res.status(500).json({ error: 'Unable to reset password. Please try again.' });
    if (data === 'expired') {
      return res.status(410).json({ error: 'Reset link has expired. Please request a new link.' });
    }
    if (data !== 'reset') return res.status(400).json({ error: 'Reset link is invalid or has already been used' });
    return res.json({ message: 'Password reset successful. Please log in with your new password.' });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to reset password. Please try again.' });
  }
};

module.exports = { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword };
