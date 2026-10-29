
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const money = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({
    totalDonated: 0,
    campaignsSupported: 0,
  });
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDonations = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/users/me/donations');
      setStats(
        response.data.stats || {
          totalDonated: 0,
          campaignsSupported: 0,
        }
      );
      setDonations(response.data.donations || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Could not load donation history. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetchDonations = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/users/me/donations');

        if (active) {
          setStats(
            response.data.stats || {
              totalDonated: 0,
              campaignsSupported: 0,
            }
          );
          setDonations(response.data.donations || []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.error ||
              'Could not load donation history. Please try again.'
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
    return (
      <div className="py-20 text-center text-gray-600">
        Loading your donations...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Your Donations
        </h2>
        <p className="mt-3 text-gray-600">
          Please log in to view your donation history.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-white"
        >
          Log In
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
          Your giving journey
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900">
          Donor Impact Dashboard
        </h1>
        <p className="mt-2 text-gray-500">
          See your contributions and the campaigns you support.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 p-4 text-red-700"
        >
          {error}
          <button onClick={loadDonations} className="ml-3 underline">
            Try again
          </button>
        </div>
      )}

      <div className="mb-8 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total donated</p>
          <p className="mt-3 text-3xl font-bold text-indigo-700">
            {money(stats.totalDonated)}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Completed donations
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Campaigns supported</p>
          <p className="mt-3 text-3xl font-bold text-indigo-700">
            {stats.campaignsSupported}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Campaigns with completed donations
          </p>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-xl font-bold text-gray-900">
            Donation history
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your newest transactions appear first.
          </p>
        </div>

        {error && donations.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            Unable to display your donation history.
          </p>
        ) : donations.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-semibold text-gray-800">
              No donations yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Your donations will appear here after you make them.
            </p>
            <Link
              to="/campaigns"
              className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white"
            >
              Explore campaigns
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Campaign</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Privacy</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {donations.map((donation) => (
                  <tr key={donation.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {donation.campaign_name ||
                        donation.campaigns?.title ||
                        'Campaign'}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {money(donation.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {date(donation.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {donation.is_anonymous ? 'Anonymous' : 'Public'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-700">
                        {donation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
