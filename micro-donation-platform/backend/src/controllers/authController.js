const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./emailController');

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
  const { error: insertError } = await supabase.from('users').insert({
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

  return res.status(201).json({ message: 'Registration successful' });
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
  // TODO (harishreddy2005): Implement email verification
  // 1. Find token in 'email_tokens' table
  // 2. Check it hasn't expired
  // 3. Set user is_verified=true
  // 4. Delete the token
  // 5. Redirect to frontend login page
  res.status(501).json({ error: 'Not implemented yet' });
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

module.exports = { register, login, verifyEmail, forgotPassword, resetPassword };
