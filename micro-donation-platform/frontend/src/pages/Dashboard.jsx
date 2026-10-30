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

    loadDonations();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <p style={{ color: '#A16207', fontSize: '0.9rem' }}>
          Loading your donations...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '32px 16px',
        }}
      >
        <h2>Your Donations</h2>
        <p>Please log in to view your donation history.</p>
        <Link to="/login">Log In</Link>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '32px 16px 64px',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#EA580C',
            marginBottom: 8,
          }}
        >
          Welcome back
        </p>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: '#7C2D12',
            margin: '0 0 8px',
          }}
        >
          {user.display_name || 'Your'}'s Impact
        </h1>

        <p style={{ color: '#92400E', fontSize: '0.95rem' }}>
          Every donation you've made has helped change someone's life.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
          gap: 16,
          marginBottom: 36,
        }}
      >
        {[
          {
            label: 'Total Donated',
            value: money(stats.totalDonated),
          },
          {
            label: 'Campaigns Supported',
            value: stats.campaignsSupported,
          },
          {
            label: 'Donations Made',
            value: donations.length,
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: '#fff',
              border: '1.5px solid #FED7AA',
              borderRadius: 14,
              padding: '20px 18px',
            }}
          >
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: '#C2410C',
              }}
            >
              {value}
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#78350F',
                marginTop: 8,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          {error}

          <button
            onClick={loadDonations}
            style={{
              marginLeft: 12,
              textDecoration: 'underline',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {!error && donations.length === 0 && (
        <div
          style={{
            background: '#fff',
            border: '2px dashed #FED7AA',
            borderRadius: 20,
            padding: 40,
            textAlign: 'center',
          }}
        >
          <h3 style={{ color: '#7C2D12' }}>No donations yet</h3>

          <p style={{ color: '#92400E', marginBottom: 20 }}>
            Your donations will appear here after you make them.
          </p>

          <Link to="/campaigns">Browse Campaigns</Link>
        </div>
      )}

      {donations.length > 0 && (
        <div
          style={{
            background: '#fff',
            border: '1.5px solid #FED7AA',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #FED7AA',
            }}
          >
            <h2 style={{ color: '#7C2D12', fontSize: '1rem' }}>
              Donation History
            </h2>

            <p style={{ color: '#92400E', fontSize: '0.85rem' }}>
              Your newest transactions appear first.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ background: '#FFF7ED' }}>
                  {['Campaign', 'Amount', 'Date', 'Privacy', 'Status'].map(
                    (heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 14,
                          textAlign: 'left',
                          color: '#78350F',
                        }}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {donations.map((donation) => (
                  <tr
                    key={donation.id}
                    style={{ borderTop: '1px solid #FEF3C7' }}
                  >
                    <td style={{ padding: 14 }}>
                      {donation.campaign_name ||
                        donation.campaigns?.title ||
                        'Campaign'}
                    </td>

                    <td style={{ padding: 14 }}>
                      {money(donation.amount)}
                    </td>

                    <td style={{ padding: 14 }}>
                      {date(donation.created_at)}
                    </td>

                    <td style={{ padding: 14 }}>
                      {donation.is_anonymous ? 'Anonymous' : 'Public'}
                    </td>

                    <td
                      style={{
                        padding: 14,
                        textTransform: 'capitalize',
                      }}
                    >
                      {donation.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}