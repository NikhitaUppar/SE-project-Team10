const supabase = require('../config/supabase');

// FR-19: Get the logged-in donor's donation history
const getMyDonations = async (req, res) => {
  try {
    const donorId = req.user?.id;

    if (!donorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabase
      .from('donations')
      .select('id, campaign_id, amount, is_anonymous, status, created_at, campaigns(title)')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donation history:', error.message);
      return res.status(500).json({
        error: 'Failed to fetch donation history',
      });
    }

    return res.status(200).json({
      donations: data || [],
    });
  } catch (err) {
    console.error('getMyDonations unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getMyDonations };
