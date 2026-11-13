const PAGE_SIZE = 1000;

const amountInPaise = value => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error('Invalid donation amount');
  const paise = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
  if (paise <= 0n) throw new Error('Invalid donation amount');
  return paise;
};
const recentOrder = (a, b) => {
  const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : -Infinity;
  return (time(b.created_at) - time(a.created_at) || a.id.localeCompare(b.id));
};

function summarizeDonations(rows) {
  // Provider IDs are internal deduplication keys and never leave this service.
  const payments = new Map();
  const donations = [];
  for (const row of [...rows].sort(recentOrder)) {
    if (row.status !== 'completed' || row.campaign_credited === false) continue;
    const keys = [`row:${row.id}`];
    if (row.razorpay_payment_id) keys.push(`payment:${row.razorpay_payment_id}`);
    if (row.razorpay_order_id) keys.push(`order:${row.razorpay_order_id}`);
    const matches = [...new Set(keys.map(key => payments.get(key)).filter(Boolean))].sort(recentOrder);
    const existing = matches[0];
    if (existing) {
      // Conflicting duplicate records must never reveal an anonymous name.
      existing.is_anonymous = existing.is_anonymous || row.is_anonymous;
      // A later row may connect an order-only copy to a payment-only copy.
      for (const duplicate of matches.slice(1)) {
        existing.is_anonymous = existing.is_anonymous || duplicate.is_anonymous;
        for (const key of duplicate.aliases) { payments.set(key, existing); existing.aliases.add(key); }
        duplicate.active = false;
      }
      for (const key of keys) { payments.set(key, existing); existing.aliases.add(key); }
      continue;
    }
    const copy = { ...row, aliases: new Set(keys), active: true };
    donations.push(copy);
    for (const key of keys) payments.set(key, copy);
  }
  const totals = new Map();
  const uniqueDonations = donations.filter(row => row.active);
  for (const row of uniqueDonations) {
    const anonymous = row.is_anonymous === true;
    const name = anonymous ? 'Anonymous' : row.users?.display_name?.trim() || 'Donor';
    // Never attach anonymous amounts to someone's publicly named total. Deleted
    // users (NULL donor_id) remain separate instead of becoming one fake donor.
    const key = `${anonymous ? 'anonymous' : 'named'}:${row.donor_id || row.id}`;
    const donor = totals.get(key) || { key, donor_name: name, paise: 0n, is_anonymous: anonymous };
    donor.paise += amountInPaise(row.amount);
    totals.set(key, donor);
  }
  const ranked = [...totals.values()].sort((a, b) => a.paise === b.paise
    ? a.key.localeCompare(b.key) : a.paise > b.paise ? -1 : 1);
  return {
    top_donors: ranked.slice(0, 5).map((donor, index) => ({
      rank: index + 1, donor_name: donor.donor_name, amount: Number(donor.paise) / 100,
      is_anonymous: donor.is_anonymous,
    })),
    recent_donations: uniqueDonations.sort(recentOrder).slice(0, 5).map(row => ({
      id: row.id, donor_name: row.is_anonymous ? 'Anonymous' : row.users?.display_name?.trim() || 'Donor',
      amount: Number(amountInPaise(row.amount)) / 100,
      is_anonymous: row.is_anonymous === true, created_at: row.created_at,
    })),
  };
}

async function loadCampaignDonors(database, campaignId) {
  const rows = [];
  let cursor;
  // Keyset paging avoids Supabase's default 1000-row truncation and offset
  // duplication when new records arrive. Usually this is one donation query.
  for (;;) {
    let query = database.from('donations').select('*, users(display_name)')
      .eq('campaign_id', campaignId).eq('status', 'completed')
      .order('id', { ascending: true }).limit(PAGE_SIZE);
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) throw new Error('Donation lookup failed');
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    const next = data[data.length - 1].id;
    if (!next || (cursor && next <= cursor)) throw new Error('Invalid donation cursor');
    cursor = next;
  }
  return summarizeDonations(rows);
}

module.exports = { loadCampaignDonors, summarizeDonations };
