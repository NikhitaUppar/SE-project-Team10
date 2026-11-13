const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded.id !== 'string' || !decoded.id || typeof decoded.exp !== 'number') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, display_name, is_verified, auth_version')
      .eq('id', decoded.id)
      .single();

    if (error || !user || !user.is_verified) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const tokenVersion = decoded.auth_version ?? 0;
    if (!Number.isInteger(tokenVersion) || tokenVersion < 0 || tokenVersion !== (user.auth_version ?? 0)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    const { auth_version, ...publicUser } = user;
    req.user = publicUser;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { authenticate, requireRole };
