import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const { user, loading: authLoading } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState({});
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      fetchData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const approveCampaign = async (id) => {
    try {
      await api.patch(`/admin/campaigns/${id}/approve`);
      setMessage('Campaign approved and verified successfully!');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Approval failed.');
    }
  };

  const rejectCampaign = async (id, reason) => {
    if (!reason?.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }

    try {
      await api.patch(`/admin/campaigns/${id}/reject`, {
        reason: reason.trim(),
      });

      setMessage('Campaign rejected successfully.');
      setRejectModal(null);
      setRejectReason('');
      setReasons((prev) => ({ ...prev, [id]: '' }));
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Rejection failed.');
    }
  };

  if (authLoading) {
    return <p className="text-center py-20">Checking login...</p>;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">
          Only administrators can access this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Review campaign documents before approving campaigns.
      </p>

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {message}
          <button
            className="ml-3"
            onClick={() => setMessage('')}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard
            label="Total Donations"
            value={`₹${Number(metrics.totalDonations).toLocaleString('en-IN')}`}
            color="bg-indigo-600"
          />
          <MetricCard
            label="Active Campaigns"
            value={metrics.activeCampaigns}
            color="bg-emerald-600"
          />
          <MetricCard
            label="Total Donors"
            value={metrics.totalDonors}
            color="bg-sky-600"
          />
          <MetricCard
            label="Flagged Items"
            value={metrics.flaggedItems}
            color="bg-rose-600"
          />
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Pending Campaign Approvals
      </h2>

      {campaigns.length === 0 ? (
        <p className="text-gray-500">
          No campaigns waiting for approval.
        </p>
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white border rounded-xl p-6 shadow-sm"
            >
              <h3 className="text-xl font-bold">{campaign.title}</h3>

              <p className="text-gray-600 mt-2">
                {campaign.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                <span>Category: {campaign.category || 'N/A'}</span>
                <span>
                  Goal: ₹{Number(campaign.goal_amount).toLocaleString('en-IN')}
                </span>
                <span>
                  Owner: {campaign.users?.display_name || campaign.users?.email || 'Unknown'}
                </span>
                <span>
                  Submitted: {new Date(campaign.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>

              <h4 className="font-semibold mt-5 mb-2">
                Uploaded Documents
              </h4>

              {campaign.campaign_files?.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {campaign.campaign_files.map((file, index) => (
                    <li key={index}>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        View Document {index + 1} ({file.file_type})
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">
                  No documents uploaded.
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => approveCampaign(campaign.id)}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg"
                >
                  Approve & Verify
                </button>

                <button
                  onClick={() => {
                    setRejectModal(campaign.id);
                    setRejectReason(reasons[campaign.id] || '');
                  }}
                  className="bg-red-600 text-white px-5 py-2 rounded-lg"
                >
                  Reject Campaign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchData}
        className="mt-6 border px-4 py-2 rounded-lg"
      >
        Refresh Dashboard
      </button>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-3">
              Reject Campaign
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              Enter the reason for rejection. It will be saved and shown to the campaign owner.
            </p>

            <textarea
              className="w-full border rounded-lg p-3"
              rows="3"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => rejectCampaign(rejectModal, rejectReason)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
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