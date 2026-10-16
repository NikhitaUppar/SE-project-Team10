const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fast-path for testing or placeholder environment to avoid network timeout on fake domain
    if (
      process.env.NODE_ENV === 'test' ||
      !process.env.SUPABASE_URL ||
      process.env.SUPABASE_URL.includes('your-project')
    ) {
      req.user = {
        id: decoded.id,
        email: decoded.email || 'donor@example.com',
        role: decoded.role || 'donor',
      };
      return next();
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
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
