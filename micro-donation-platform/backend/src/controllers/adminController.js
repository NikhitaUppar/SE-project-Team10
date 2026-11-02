const supabase = require('../config/supabase');
const transporter = require('../config/mailer');

// Get all campaigns waiting for admin approval
const getPendingCampaigns = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, campaign_files(file_url, file_type), users(email, display_name)')
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

    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, title, owner_id, users(email, display_name)')
      .eq('id', id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

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

    const ownerEmail = campaign.users?.email;

    if (ownerEmail) {
      transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
        to: ownerEmail,
        subject: `Your campaign "${campaign.title}" has been approved`,
        text: `Great news! Your campaign "${campaign.title}" has been approved and is now live on the platform.`,
        html: `<p>Great news! Your campaign <strong>${campaign.title}</strong> has been approved and is now live on the platform.</p>`,
      }).catch((e) => {
        console.warn('[AdminController] Approve email failed:', e.message);
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

    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, title, owner_id, users(email, display_name)')
      .eq('id', id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
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

    const ownerEmail = campaign.users?.email;

    if (ownerEmail) {
      transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
        to: ownerEmail,
        subject: `Your campaign "${campaign.title}" was not approved`,
        text: `Unfortunately, your campaign "${campaign.title}" was not approved.\n\nReason: ${reason}\n\nIf you have questions, please contact support.`,
        html: `<p>Unfortunately, your campaign <strong>${campaign.title}</strong> was not approved.</p><p><strong>Reason:</strong> ${reason}</p><p>If you have questions, please contact support.</p>`,
      }).catch((e) => {
        console.warn('[AdminController] Reject email failed:', e.message);
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

// Platform metrics (FR-21)
const getMetrics = async (req, res) => {
  try {
    const [donationsRes, campaignsRes, donorsRes, flaggedRes] = await Promise.all([
      supabase.from('donations').select('amount', { count: 'exact' }).eq('status', 'completed'),
      supabase.from('campaigns').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('donations').select('donor_id').eq('status', 'completed'),
      supabase.from('campaigns').select('id', { count: 'exact' }).eq('status', 'flagged'),
    ]);

    if (donationsRes.error) return res.status(500).json({ error: donationsRes.error.message });
    if (campaignsRes.error) return res.status(500).json({ error: campaignsRes.error.message });
    if (donorsRes.error) return res.status(500).json({ error: donorsRes.error.message });
    if (flaggedRes.error) return res.status(500).json({ error: flaggedRes.error.message });

    const totalDonations = (donationsRes.data || []).reduce(
      (sum, donation) => sum + (donation.amount || 0),
      0
    );

    const uniqueDonors = new Set(
      (donorsRes.data || []).map((donation) => donation.donor_id)
    ).size;

    return res.status(200).json({
      totalDonations,
      activeCampaigns: campaignsRes.count || 0,
      totalDonors: uniqueDonors,
      flaggedItems: flaggedRes.count || 0,
    });
  } catch (err) {
    console.error('Metrics error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  getMetrics,
};