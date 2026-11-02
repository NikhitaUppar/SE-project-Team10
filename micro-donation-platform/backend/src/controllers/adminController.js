
const supabase = require('../config/supabase');

// Get all campaigns waiting for admin approval
const getPendingCampaigns = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, campaign_files(file_url, file_type)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending campaigns:', error.message);
      return res.status(500).json({ error: 'Failed to fetch pending campaigns' });
    }

    return res.status(200).json({ campaigns: data || [] });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve campaign and automatically mark it as verified
const approveCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status: 'active',
        is_verified: true,
        rejection_reason: null,
      })
      .eq('id', id)
      .eq('status', 'pending_review')
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Pending campaign not found or could not be approved',
      });
    }

    return res.status(200).json({
      message: 'Campaign approved and verified successfully',
      campaign: data,
    });
  } catch (err) {
    console.error('Campaign approval error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject campaign and save the admin's reason
const rejectCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason?.trim();

    if (!reason) {
      return res.status(400).json({
        error: 'Rejection reason is required',
      });
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status: 'rejected',
        is_verified: false,
        rejection_reason: reason,
      })
      .eq('id', id)
      .eq('status', 'pending_review')
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Pending campaign not found or could not be rejected',
      });
    }

    return res.status(200).json({
      message: 'Campaign rejected successfully',
      campaign: data,
    });
  } catch (err) {
    console.error('Campaign rejection error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Platform metrics (existing FR-21 placeholder)
const getMetrics = async (req, res) => {
  return res.status(501).json({ error: 'Not implemented yet' });
};

module.exports = {
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  getMetrics,
};
