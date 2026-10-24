const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendVerificationEmail } = require('../controllers/emailController');

// Only the digest is stored. The secret token goes exclusively into the email.
const sendVerificationForUser = async (user) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { data, error } = await supabase.rpc('issue_email_verification_token', {
    p_user_id: user.id,
    p_token_hash: tokenHash,
  });
  if (error || !['created', 'throttled', 'already_verified'].includes(data)) {
    throw new Error('Unable to prepare verification email');
  }
  if (data === 'created') await sendVerificationEmail(user.email, token);
  return data;
};

module.exports = { sendVerificationForUser };
