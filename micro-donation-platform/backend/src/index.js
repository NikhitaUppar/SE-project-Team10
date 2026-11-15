require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const donationRoutes = require('./routes/donations');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const { closePastDeadlineCampaigns } = require('./controllers/campaignController');

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl) or matching origin
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Cron: auto-close expired campaigns (runs daily at midnight) ──────────────
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Checking for expired campaigns...');
    await closePastDeadlineCampaigns();
  });
}

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
}

module.exports = app;
