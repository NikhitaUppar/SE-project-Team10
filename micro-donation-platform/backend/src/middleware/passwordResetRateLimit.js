// Per-process, per-IP limits. Accounts also have a database-enforced cooldown.
// No email addresses, passwords, or tokens are kept in this map.
const createPasswordResetLimiter = ({ limit, windowMs = 15 * 60 * 1000, maxEntries = 10000, now = Date.now }) => {
  const clients = new Map();
  return (req, res, next) => {
    const timestamp = now();
    for (const [key, entry] of clients) {
      if (entry.expires <= timestamp) clients.delete(key);
    }
    const key = req.ip || req.socket.remoteAddress;
    let entry = clients.get(key);
    if (!entry) {
      if (clients.size >= maxEntries) {
        res.set('Retry-After', '60');
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
      entry = { count: 0, expires: timestamp + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.expires - timestamp) / 1000))));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
};

module.exports = { createPasswordResetLimiter };
