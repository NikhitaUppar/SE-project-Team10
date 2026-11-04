const supabase = require('../config/supabase');

// Existing PostgreSQL campaign statuses; no new terminal state is introduced.
const CAMPAIGN_STATUS = Object.freeze({
  PENDING_REVIEW: 'pending_review', ACTIVE: 'active', REJECTED: 'rejected', CLOSED: 'closed',
});

const deadlineTime = campaign => Date.parse(campaign?.deadline);
const isExpired = (campaign, now = new Date()) => deadlineTime(campaign) < new Date(now).getTime();
const canAcceptDonations = (campaign, now = new Date()) =>
  campaign?.status === CAMPAIGN_STATUS.ACTIVE && Number.isFinite(deadlineTime(campaign)) &&
  Number.isFinite(new Date(now).getTime()) && !isExpired(campaign, now);

// Public reads reflect expiry even between the deadline and the next daily job.
// This is a presentation/permission rule, not a database write from a GET route.
const presentCampaign = (campaign, now = new Date()) => ({
  ...campaign,
  status: campaign.status === CAMPAIGN_STATUS.ACTIVE && isExpired(campaign, now)
    ? CAMPAIGN_STATUS.CLOSED : campaign.status,
  accepting_donations: canAcceptDonations(campaign, now),
});

async function closeExpiredCampaigns({ database = supabase, now = new Date() } = {}) {
  const cutoff = new Date(now);
  if (!Number.isFinite(cutoff.getTime())) throw new Error('Invalid campaign expiry cutoff');
  // A single conditional UPDATE is atomic and idempotent, including across
  // replicas. Nothing except eligible campaign status values is changed.
  const { count, data, error } = await database.from('campaigns')
    .update({ status: CAMPAIGN_STATUS.CLOSED }, { count: 'exact' })
    .eq('status', CAMPAIGN_STATUS.ACTIVE).lt('deadline', cutoff.toISOString())
    .select('id');
  if (error) throw new Error('Campaign expiry update failed');
  return { closedCount: count ?? data?.length ?? 0 };
}

module.exports = { CAMPAIGN_STATUS, isExpired, canAcceptDonations, presentCampaign, closeExpiredCampaigns };
