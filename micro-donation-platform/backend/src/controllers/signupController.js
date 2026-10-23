const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { sendSignupCode } = require('./emailController');

// Pending signups belong to this local backend process, not the users table.
// Restarting the backend expires them; a new code starts the flow again.
function createSignupController({ database = supabase, sendCode = sendSignupCode, now = Date.now } = {}) {
  const pending = new Map();
  const secret = crypto.randomBytes(32);
  const digest = value => crypto.createHmac('sha256', secret).update(value).digest('hex');
  const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
  const validEmail = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const clean = () => {
    for (const [email, entry] of pending) if (entry.expires <= now() && entry.state !== 'creating') pending.delete(email);
  };
  const headers = res => res.set('Cache-Control', 'no-store');

  const send = async (req, res) => {
    headers(res);
    const { display_name: name, email: rawEmail } = req.body || {};
    const email = normalize(rawEmail);
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || !validEmail(email)) {
      return res.status(400).json({ error: 'Enter your name and a valid email address.' });
    }
    clean();
    try {
      const { data, error } = await database.from('users').select('id').eq('email', email).maybeSingle();
      if (error) throw new Error('Lookup failed');
      if (data) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      const previous = pending.get(email);
      if (previous?.state === 'creating' || previous?.state === 'sending' || previous?.sentAt + 60000 > now()) {
        res.set('Retry-After', '60');
        return res.status(429).json({ error: 'Wait one minute before sending another code.' });
      }
      if (!previous && pending.size >= 1000) return res.status(429).json({ error: 'Please try again in a few minutes.' });
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const entry = { name: name.trim(), codeHash: digest(email + ':' + code), sentAt: now(), expires: now() + 300000, attempts: 0, state: 'sending' };
      pending.set(email, entry); // A resend immediately invalidates the previous code and proof.
      try {
        await sendCode(email, code);
        entry.state = 'code';
      } catch {
        if (pending.get(email) === entry) pending.delete(email);
        return res.status(503).json({ error: 'Unable to send the code. Please try again.' });
      }
      return res.json({ message: 'Verification code sent. Enter the 6-digit code from your inbox.', expires_in: 300, resend_after: 60 });
    } catch {
      return res.status(503).json({ error: 'Unable to send the code. Please try again.' });
    }
  };

  const verify = (req, res) => {
    headers(res);
    clean();
    const email = normalize(req.body?.email);
    const code = req.body?.code;
    const entry = pending.get(email);
    if (!validEmail(email) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
    }
    if (!entry || entry.state !== 'code') return res.status(400).json({ error: 'Code expired or already used. Request a new code.' });
    if (entry.attempts >= 5) return res.status(429).json({ error: 'Too many incorrect codes. Request a new code.' });
    entry.attempts += 1;
    if (!crypto.timingSafeEqual(Buffer.from(entry.codeHash, 'hex'), Buffer.from(digest(email + ':' + code), 'hex'))) {
      return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
    }
    const proof = crypto.randomBytes(32).toString('hex');
    entry.state = 'verified';
    entry.proofHash = digest(proof);
    delete entry.codeHash;
    entry.expires = now() + 600000;
    return res.json({ message: 'Email verified. Choose your password to create your account.', verification_token: proof, expires_in: 600 });
  };

  const complete = async (req, res) => {
    headers(res);
    clean();
    const email = normalize(req.body?.email);
    const { password, verification_token: proof } = req.body || {};
    const entry = pending.get(email);
    if (!validEmail(email) || typeof proof !== 'string' || !/^[a-f0-9]{64}$/.test(proof) || !entry || entry.state !== 'verified' ||
      !crypto.timingSafeEqual(Buffer.from(entry.proofHash, 'hex'), Buffer.from(digest(proof), 'hex'))) {
      return res.status(400).json({ error: 'Verify your email before creating your account. Request a new code if needed.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 bytes.' });
    }
    entry.state = 'creating'; // Lock the single-use proof before asynchronous hashing/insertion.
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const { error } = await database.from('users').insert({ id: crypto.randomUUID(), email, display_name: entry.name, password_hash: passwordHash, is_verified: true });
      if (error) {
        entry.state = 'verified';
        if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
        throw new Error('Insert failed');
      }
      pending.delete(email);
      return res.status(201).json({ message: 'Account created and email verified. You can now log in.' });
    } catch {
      entry.state = 'verified';
      return res.status(503).json({ error: 'Unable to create your account. Please try again.' });
    }
  };
  return { send, verify, complete };
}

module.exports = { createSignupController };
