const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./emailController');

// FR-01: Register
const register = async (req, res) => {
  // TODO (harishreddy2005): Implement registration
  // 1. Validate email + password (min 8 chars)
  // 2. Check if email already exists in 'users' table
  // 3. Hash password with bcrypt (work factor 12)
  // 4. Insert user into 'users' table with is_verified=false
  // 5. Generate verification token, save to 'email_tokens' table
  // 6. Call sendVerificationEmail(email, token)
  // 7. Return 201 with success message
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-02: Login
const login = async (req, res) => {
  // TODO (harishreddy2005): Implement login
  // 1. Find user by email
  // 2. Check is_verified — return 403 if not
  // 3. Compare password with bcrypt
  // 4. Sign JWT with { id, email, role }, expires in 7d
  // 5. Return token
  res.status(501).json({ error: 'Not implemented yet' });
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
  // TODO (harishreddy2005): Implement forgot password
  // 1. Find user by email (don't reveal if not found — always return 200)
  // 2. Generate reset token, expires in 1 hour
  // 3. Save to 'password_reset_tokens' table
  // 4. Call sendPasswordResetEmail(email, token)
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-04: Reset password
const resetPassword = async (req, res) => {
  // TODO (harishreddy2005): Implement reset password
  // 1. Find token in 'password_reset_tokens', check expiry
  // 2. Hash new password
  // 3. Update user password
  // 4. Delete the token
  res.status(501).json({ error: 'Not implemented yet' });
};

module.exports = { register, login, verifyEmail, forgotPassword, resetPassword };
