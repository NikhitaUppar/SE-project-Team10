const supabase = require('../config/supabase');

// FR-19: Get the logged-in donor's donation history and statistics
const getMyDonations = async (req, res) => {
  try {
    const donorId = req.user?.id;

    if (!donorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabase
      .from('donations')
      .select(
        'id, campaign_id, amount, is_anonymous, status, created_at, campaigns(title)'
      )
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donation history:', error.message);
      return res.status(500).json({
        error: 'Failed to fetch donation history',
      });
    }

    const donations = data || [];
    const completed = donations.filter(
      (donation) => donation.status === 'completed'
    );

    const totalDonated = completed.reduce(
      (sum, donation) => sum + Number(donation.amount || 0),
      0
    );

    const campaignsSupported = new Set(
      completed.map((donation) => donation.campaign_id).filter(Boolean)
    ).size;

    const donationHistory = donations.map((donation) => ({
      ...donation,
      campaign_name: Array.isArray(donation.campaigns)
        ? donation.campaigns[0]?.title || 'Campaign'
        : donation.campaigns?.title || 'Campaign',
    }));

    return res.status(200).json({
      stats: {
        totalDonated,
        campaignsSupported,
      },
      donations: donationHistory,
    });
  } catch (err) {
    console.error('Unexpected donation-history error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getMyDonations };
