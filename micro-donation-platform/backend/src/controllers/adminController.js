const supabase = require('../config/supabase');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

// FR-08: Get pending campaigns
const getPendingCampaigns = async (req, res) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, title, description, goal_amount, created_at, owner_id, users(email, display_name)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ campaigns: data });
};

// FR-08: Approve campaign
const approveCampaign = async (req, res) => {
  const { id } = req.params;

  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('id, title, owner_id, users(email, display_name)')
    .eq('id', id)
    .single();

  if (fetchError || !campaign) return res.status(404).json({ error: 'Campaign not found' });

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'active' })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  const ownerEmail = campaign.users?.email;
  if (ownerEmail) {
    transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
      to: ownerEmail,
      subject: `Your campaign "${campaign.title}" has been approved`,
      text: `Great news! Your campaign "${campaign.title}" has been approved and is now live on the platform.`,
      html: `<p>Great news! Your campaign <strong>${campaign.title}</strong> has been approved and is now live on the platform.</p>`,
    }).catch((e) => console.warn('[AdminController] Approve email failed:', e.message));
  }

  res.json({ message: 'Campaign approved' });
};

// FR-08: Reject campaign
const rejectCampaign = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('id, title, owner_id, users(email, display_name)')
    .eq('id', id)
    .single();

  if (fetchError || !campaign) return res.status(404).json({ error: 'Campaign not found' });

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  const ownerEmail = campaign.users?.email;
  if (ownerEmail) {
    const reasonText = reason ? `\n\nReason: ${reason}` : '';
    transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
      to: ownerEmail,
      subject: `Your campaign "${campaign.title}" was not approved`,
      text: `Unfortunately, your campaign "${campaign.title}" was not approved.${reasonText}\n\nIf you have questions, please contact support.`,
      html: `<p>Unfortunately, your campaign <strong>${campaign.title}</strong> was not approved.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}<p>If you have questions, please contact support.</p>`,
    }).catch((e) => console.warn('[AdminController] Reject email failed:', e.message));
  }

  res.json({ message: 'Campaign rejected' });
};

// FR-21: Platform metrics
const getMetrics = async (req, res) => {
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

  const totalDonations = (donationsRes.data || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  const uniqueDonors = new Set((donorsRes.data || []).map((d) => d.donor_id)).size;

  res.json({
    totalDonations,
    activeCampaigns: campaignsRes.count || 0,
    totalDonors: uniqueDonors,
    flaggedItems: flaggedRes.count || 0,
  });
};

module.exports = { getPendingCampaigns, approveCampaign, rejectCampaign, getMetrics };
