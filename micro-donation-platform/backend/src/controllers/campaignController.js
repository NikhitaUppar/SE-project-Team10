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
  try {
    const {
      title,
      description,
      goal_amount,
      category,
      deadline,
    } = req.body;

    // Check required fields
    if (
      typeof title !== 'string' || !title.trim() ||
      typeof description !== 'string' || !description.trim() ||
      goal_amount === undefined || goal_amount === null ||
      typeof category !== 'string' || !category.trim() ||
      !deadline
    ) {
      return res.status(400).json({
        error: 'All fields are required: title, description, goal_amount, category, deadline',
      });
    }

    // Validate the fundraising goal
    const goal = Number(goal_amount);

    if (!Number.isFinite(goal) || goal <= 0) {
      return res.status(400).json({
        error: 'goal_amount must be a positive number',
      });
    }

    // Validate the deadline
    const deadlineDate = new Date(deadline);

    if (
      Number.isNaN(deadlineDate.getTime()) ||
      deadlineDate <= new Date()
    ) {
      return res.status(400).json({
        error: 'deadline must be a valid future date',
      });
    }

    // Save the campaign in Supabase
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        owner_id: req.user.id,
        title: title.trim(),
        description: description.trim(),
        goal_amount: goal,
        category: category.trim(),
        deadline: deadlineDate.toISOString(),
        status: 'pending_review',
      })
      .select()
      .single();

    if (error) {
      console.error('Campaign creation failed:', error.message);

      return res.status(500).json({
        error: 'Failed to create campaign',
      });
    }

    return res.status(201).json({
      message: 'Campaign created successfully and is awaiting review',
      campaign: data,
    });
  } catch (err) {
    console.error('Campaign creation error:', err.message);

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
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
