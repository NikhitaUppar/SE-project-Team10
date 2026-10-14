const supabase = require('../config/supabase');

// FR-19: Get donor's donation history
const getMyDonations = async (req, res) => {
  // TODO (ramithanayak98-ar): Implement
  // 1. Query 'donations' table where donor_id=req.user.id
  // 2. Join with 'campaigns' to get campaign name
  // 3. Return sorted newest-first
  res.status(501).json({ error: 'Not implemented yet' });
};

module.exports = { getMyDonations };
