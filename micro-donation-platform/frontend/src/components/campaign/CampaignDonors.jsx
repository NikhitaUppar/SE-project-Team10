import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatDonationAmount, formatDonationTime } from '../../utils/donationDisplay';

const publicName = donor => donor.is_anonymous ? 'Anonymous' : donor.donor_name || 'Donor';

export default function CampaignDonors({ campaignId, refreshKey = 0 }) {
  const [data, setData] = useState({ top_donors: [], recent_donations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.get(`/campaigns/${campaignId}/donors`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) { setData(data); setNow(Date.now()); } })
      .catch(() => { if (!controller.signal.aborted) setError('Unable to load campaign donors. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [campaignId, refreshKey, retry]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  return <section aria-label="Campaign supporters" className="rounded-2xl border border-orange-200 bg-white p-5 sm:p-7 shadow-sm min-w-0">
    <h2 className="text-xl font-bold text-orange-950">Top Donors</h2>
    <p className="mt-1 text-sm text-orange-800">Top five supporters by completed contributions.</p>
    {loading ? <p role="status" className="mt-4 text-sm text-orange-800">Loading donors…</p>
      : error ? <div className="mt-4">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 font-semibold text-orange-800 underline">Retry loading donors</button>
      </div> : <>
        {data.top_donors.length === 0 ? <p className="mt-4 text-sm text-orange-800">No completed donations yet. Be the first to support this campaign.</p>
          : <ol aria-label="Top donors ranking" className="mt-4 divide-y divide-orange-100">
            {data.top_donors.map(donor => <li key={donor.rank} className="flex items-center gap-3 py-3">
              <span aria-label={`Rank ${donor.rank}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-900">{donor.rank}</span>
              <span className="min-w-0 flex-1 break-words text-sm font-semibold text-orange-950">{publicName(donor)}</span>
              <span className="shrink-0 text-sm font-bold text-orange-800 tabular-nums">{formatDonationAmount(donor.amount)}</span>
            </li>)}
          </ol>}
        <h3 className="mt-6 border-t border-orange-100 pt-5 text-lg font-bold text-orange-950">Recent Donations</h3>
        {data.recent_donations.length === 0 ? <p className="mt-3 text-sm text-orange-800">No recent donations yet.</p>
          : <ul aria-label="Recent donations" className="mt-2 divide-y divide-orange-100">
            {data.recent_donations.map(donation => <li key={donation.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-orange-950">{publicName(donation)}</p>
                <time dateTime={Number.isFinite(Date.parse(donation.created_at)) ? donation.created_at : undefined}
                  className="text-xs text-orange-800">{formatDonationTime(donation.created_at, now)}</time>
              </div>
              <span className="shrink-0 text-sm font-bold text-orange-800 tabular-nums">{formatDonationAmount(donation.amount)}</span>
            </li>)}
          </ul>}
      </>}
  </section>;
}
