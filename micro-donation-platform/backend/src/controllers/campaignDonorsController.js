const supabase = require('../config/supabase');
const { loadCampaignDonors } = require('../services/campaignDonors');

async function getCampaignDonors(req, res) {
  const id = req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
    return res.status(400).json({ error: 'Invalid campaign ID' });
  }
  try {
    const { data, error } = await supabase.from('campaigns').select('id').eq('id', id).maybeSingle();
    if (error) throw new Error('Campaign lookup failed');
    if (!data) return res.status(404).json({ error: 'Campaign not found' });
    return res.json(await loadCampaignDonors(supabase, id));
  } catch {
    return res.status(500).json({ error: 'Unable to load campaign donors. Please try again.' });
  }
}

module.exports = { getCampaignDonors };
