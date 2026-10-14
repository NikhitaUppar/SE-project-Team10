const supabase = require('../config/supabase');
const { sendEmail } = require('./emailController');

// FR-08: Get pending campaigns
const getPendingCampaigns = async (req, res) => {
  // TODO (NikhitaUppar): Implement
  // Query campaigns where status='pending_review'
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-08: Approve campaign
const approveCampaign = async (req, res) => {
  // TODO (NikhitaUppar): Implement
  // 1. Update campaign status to 'active'
  // 2. Notify owner by email
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-08: Reject campaign
const rejectCampaign = async (req, res) => {
  // TODO (NikhitaUppar): Implement
  // 1. Update campaign status to 'rejected'
  // 2. Notify owner by email with req.body.reason
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-21: Platform metrics
const getMetrics = async (req, res) => {
  // TODO (NikhitaUppar): Implement
  // Aggregate: total donations, active campaigns, total donors, flagged items
  res.status(501).json({ error: 'Not implemented yet' });
};

module.exports = { getPendingCampaigns, approveCampaign, rejectCampaign, getMetrics };
