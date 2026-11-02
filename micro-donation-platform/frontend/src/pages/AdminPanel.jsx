import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState({});
  const [message, setMessage] = useState('');

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/admin/campaigns');
      setCampaigns(response.data.campaigns || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      fetchCampaigns();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const approveCampaign = async (id) => {
    try {
      await api.patch(`/admin/campaigns/${id}/approve`);
      setMessage('Campaign approved and verified successfully!');
      fetchCampaigns();
    } catch (err) {
      setError(err.response?.data?.error || 'Approval failed.');
    }
  };

  const rejectCampaign = async (id) => {
    const reason = reasons[id]?.trim();

    if (!reason) {
      setError('Please enter a rejection reason.');
      return;
    }

    try {
      await api.patch(`/admin/campaigns/${id}/reject`, { reason });
      setMessage('Campaign rejected successfully.');
      setReasons((prev) => ({ ...prev, [id]: '' }));
      fetchCampaigns();
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
      <p className="text-gray-600 mb-8">
        Review campaign documents before approving campaigns.
      </p>

      {message && (
        <p className="bg-green-100 text-green-700 p-3 rounded mb-4">
          {message}
        </p>
      )}

      {error && (
        <p className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-gray-600">No campaigns waiting for approval.</p>
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white border rounded-xl p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold">{campaign.title}</h2>

              <p className="text-gray-600 mt-2">
                {campaign.description}
              </p>

              <p className="mt-3 text-sm text-gray-500">
                Category: {campaign.category}
              </p>

              <h3 className="font-semibold mt-5 mb-2">
                Uploaded Documents
              </h3>

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

              <div className="mt-6">
                <button
                  onClick={() => approveCampaign(campaign.id)}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg mr-3"
                >
                  Approve & Verify
                </button>

                <div className="mt-4">
                  <textarea
                    value={reasons[campaign.id] || ''}
                    onChange={(e) =>
                      setReasons((prev) => ({
                        ...prev,
                        [campaign.id]: e.target.value,
                      }))
                    }
                    placeholder="Enter reason for rejection..."
                    className="w-full border rounded-lg p-3"
                    rows="2"
                  />

                  <button
                    onClick={() => rejectCampaign(campaign.id)}
                    className="bg-red-600 text-white px-5 py-2 rounded-lg mt-2"
                  >
                    Reject Campaign
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchCampaigns}
        className="mt-6 border px-4 py-2 rounded-lg"
      >
        Refresh Campaigns
      </button>
    </div>
  );
}