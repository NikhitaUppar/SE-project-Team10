import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetchDonations = async () => {
      try {
        const response = await api.get('/users/me/donations');
        if (active) {
          setDonations(response.data.donations || []);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.error || 'Could not load your donation history.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDonations();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <div className="text-center py-20">Loading your donations...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800">Your Donations</h2>
        <p className="text-gray-600 mt-3">Please log in to view your donation history.</p>
        <Link to="/login" className="inline-block mt-5 bg-indigo-600 text-white px-5 py-2 rounded-lg">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900">My Donation History</h1>
      <p className="text-gray-600 mt-2 mb-6">
        View the donations made from your account.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-5">
          {error}
        </div>
      )}

      {!error && donations.length === 0 && (
        <div className="bg-white border rounded-xl p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-800">No donations yet</h2>
          <p className="text-gray-600 mt-2">Explore campaigns and make your first donation.</p>
          <Link to="/campaigns" className="inline-block mt-4 text-indigo-600 font-semibold hover:underline">
            Browse Campaigns
          </Link>
        </div>
      )}

      {donations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="p-4">Campaign</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Privacy</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((donation) => (
                <tr key={donation.id} className="border-t text-sm">
                  <td className="p-4 font-medium text-gray-800">
                    {donation.campaigns?.title || 'Campaign'}
                  </td>
                  <td className="p-4">
                    ₹{Number(donation.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    {donation.is_anonymous ? 'Anonymous' : 'Public'}
                  </td>
                  <td className="p-4 capitalize">{donation.status}</td>
                  <td className="p-4">
                    {donation.created_at
                      ? new Date(donation.created_at).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
