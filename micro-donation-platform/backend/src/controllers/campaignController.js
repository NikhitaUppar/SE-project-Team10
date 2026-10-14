const supabase = require('../config/supabase');

// FR-16, FR-17: Get all active campaigns (public)
const getCampaigns = async (req, res) => {
  // TODO (ramithanayak98-ar): Implement
  // 1. Query 'campaigns' table where status='active'
  // 2. Support ?category= filter
  // 3. Return paginated results with progress %
  res.status(501).json({ error: 'Not implemented yet' });
};

// Get single campaign
const getCampaignById = async (req, res) => {
  // TODO (ramithanayak98-ar): Implement
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-06: Create campaign
const createCampaign = async (req, res) => {
  // TODO (ramithanayak98-ar): Implement
  // 1. Validate: title, description, goal_amount, category, deadline
  // 2. Insert into 'campaigns' table with status='pending_review', owner_id=req.user.id
  // 3. Return 201 with campaign
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-07: Upload campaign file
const uploadCampaignFile = async (req, res) => {
  // TODO (ramithanayak98-ar): Implement
  // 1. Check req.file exists and size <= 5MB
  // 2. Upload to Supabase Storage bucket 'campaign-files'
  // 3. Save public URL to 'campaign_files' table
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-09: Post campaign update
const postUpdate = async (req, res) => {
  // TODO (harishreddy2005): Implement
  // 1. Verify req.user.id === campaign.owner_id
  // 2. Insert into 'campaign_updates' table
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-20: Get campaign stats (owner only)
const getCampaignStats = async (req, res) => {
  // TODO (ramithanayak98-ar): Implement
  // 1. Verify req.user.id === campaign.owner_id
  // 2. Aggregate total raised, donor count from 'donations'
  // 3. Return timeline data grouped by date
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-10: Auto-close expired campaigns (called by cron)
const closePastDeadlineCampaigns = async () => {
  // TODO (harishreddy2005): Implement
  // 1. Query campaigns where deadline < now() AND status='active'
  // 2. Update status to 'closed'
  console.log('[CRON] closePastDeadlineCampaigns — not implemented yet');
};

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  uploadCampaignFile,
  postUpdate,
  getCampaignStats,
  closePastDeadlineCampaigns,
};
