import { useEffect, useState } from 'react';
import api from '../utils/api';

function MetricCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-5 text-white ${color}`}>
      <p className="text-sm opacity-80 font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
    </div>
  );
}

export default function AdminPanel() {
  const [metrics, setMetrics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, campaignsRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/campaigns'),
      ]);
      setMetrics(metricsRes.data);
      setCampaigns(campaignsRes.data.campaigns || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/admin/campaigns/${id}/approve`);
      setActionMsg('Campaign approved.');
      fetchData();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Approve failed');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await api.patch(`/admin/campaigns/${rejectModal}/reject`, { reason: rejectReason });
      setActionMsg('Campaign rejected.');
      setRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Reject failed');
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {actionMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {actionMsg}
          <button className="ml-3 text-green-500 hover:text-green-700" onClick={() => setActionMsg('')}>✕</button>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard label="Total Donations" value={`₹${Number(metrics.totalDonations).toLocaleString('en-IN')}`} color="bg-indigo-600" />
          <MetricCard label="Active Campaigns" value={metrics.activeCampaigns} color="bg-emerald-600" />
          <MetricCard label="Total Donors" value={metrics.totalDonors} color="bg-sky-600" />
          <MetricCard label="Flagged Items" value={metrics.flaggedItems} color="bg-rose-600" />
        </div>
      )}

      {/* Pending campaigns */}
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Pending Campaign Approvals</h2>
      {campaigns.length === 0 ? (
        <p className="text-gray-400 text-sm">No campaigns pending review.</p>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{c.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>Goal: <strong className="text-gray-700">₹{Number(c.goal_amount).toLocaleString('en-IN')}</strong></span>
                    <span>Owner: <strong className="text-gray-700">{c.users?.display_name || c.users?.email || 'Unknown'}</strong></span>
                    <span>Submitted: {new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(c.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setRejectModal(c.id); setRejectReason(''); }}
                    className="px-3 py-1.5 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-3">Reject Campaign</h3>
            <p className="text-sm text-gray-500 mb-4">Optionally provide a reason. It will be emailed to the campaign owner.</p>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
