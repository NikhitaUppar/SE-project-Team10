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

  const [ownerCampaigns, setOwnerCampaigns] = useState([]);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [ownerError, setOwnerError] = useState('');

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

  const loadOwnerCampaigns = async () => {
    setOwnerLoading(true);
    setOwnerError('');

    try {
      const response = await api.get('/users/me/campaigns');
      const campaigns = response.data.campaigns || [];

      const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
          try {
            const statsResponse = await api.get(
              `/campaigns/${campaign.id}/stats`
            );

            return {
              ...campaign,
              fundraising: statsResponse.data,
            };
          } catch {
            return {
              ...campaign,
              fundraising: null,
            };
          }
        })
      );

      setOwnerCampaigns(campaignsWithStats);
    } catch (err) {
      setOwnerError(
        err.response?.data?.error ||
          'Could not load your campaigns. Please try again.'
      );
    } finally {
      setOwnerLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setOwnerLoading(false);
      return;
    }

    loadDonations();
    loadOwnerCampaigns();
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
          Loading your dashboard...
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
        <h2>Your Dashboard</h2>
        <p>Please log in to view your dashboard.</p>
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

      {/* DONOR IMPACT DASHBOARD - FR-19 */}

      <h2 style={{ color: '#7C2D12', marginBottom: 16 }}>
        Your Donation Impact
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Total Donated', value: money(stats.totalDonated) },
          { label: 'Campaigns Supported', value: stats.campaignsSupported },
          { label: 'Donations Made', value: donations.length },
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
            style={{ marginLeft: 12, textDecoration: 'underline' }}
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
            marginBottom: 24,
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
            marginBottom: 40,
          }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #FED7AA' }}>
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
                    <td style={{ padding: 14 }}>{money(donation.amount)}</td>
                    <td style={{ padding: 14 }}>{date(donation.created_at)}</td>
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

      {/* CAMPAIGN OWNER DASHBOARD - FR-20 */}

      <div style={{ marginTop: 40 }}>
        <p
          style={{
            color: '#EA580C',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          FR-20
        </p>

        <h2 style={{ color: '#7C2D12', margin: '4px 0 8px' }}>
          My Campaigns
        </h2>

        <p style={{ color: '#92400E', marginBottom: 24 }}>
          Track the fundraising progress of campaigns you created.
        </p>

        {ownerLoading && (
          <p style={{ color: '#92400E' }}>Loading your campaigns...</p>
        )}

        {ownerError && (
          <div
            role="alert"
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: 12,
              padding: 16,
            }}
          >
            {ownerError}
            <button
              onClick={loadOwnerCampaigns}
              style={{ marginLeft: 12, textDecoration: 'underline' }}
            >
              Try again
            </button>
          </div>
        )}

        {!ownerLoading && !ownerError && ownerCampaigns.length === 0 && (
          <div
            style={{
              background: '#fff',
              border: '2px dashed #FED7AA',
              borderRadius: 20,
              padding: 36,
              textAlign: 'center',
            }}
          >
            <h3 style={{ color: '#7C2D12' }}>No campaigns created yet</h3>
            <p style={{ color: '#92400E', marginBottom: 20 }}>
              Campaigns you create will appear here with their fundraising
              statistics.
            </p>
            <Link to="/campaigns">Explore Campaigns</Link>
          </div>
        )}

        <div style={{ display: 'grid', gap: 24 }}>
          {ownerCampaigns.map((campaign) => {
            const fundraising = campaign.fundraising;
            const goal = Number(campaign.goal_amount || 0);
            const raised = Number(
              fundraising?.stats?.total_raised ?? campaign.raised_amount ?? 0
            );
            const donorCount = fundraising?.stats?.donor_count ?? 0;
            const progress =
              goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
            const timeline = fundraising?.timeline || [];
            const maxAmount = Math.max(
              ...timeline.map((item) => Number(item.amount || 0)),
              1
            );

            return (
              <div
                key={campaign.id}
                style={{
                  background: '#fff',
                  border: '1.5px solid #FED7AA',
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h3 style={{ color: '#7C2D12', margin: '0 0 8px' }}>
                      {campaign.title}
                    </h3>
                    <span
                      style={{
                        color: '#92400E',
                        fontSize: '0.8rem',
                        textTransform: 'capitalize',
                      }}
                    >
                      {String(campaign.status || 'unknown').replaceAll('_', ' ')}
                    </span>
                  </div>

                  <Link to={`/campaigns/${campaign.id}`}>
                    View Campaign
                  </Link>
                </div>

                {!fundraising ? (
                  <p style={{ color: '#991B1B' }}>
                    Could not load statistics for this campaign.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <strong style={{ color: '#C2410C' }}>
                        {money(raised)} raised
                      </strong>
                      <span style={{ color: '#78350F' }}>
                        Goal: {money(goal)}
                      </span>
                    </div>

                    <div
                      style={{
                        height: 12,
                        background: '#FFEDD5',
                        borderRadius: 20,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: '#EA580C',
                          borderRadius: 20,
                        }}
                      />
                    </div>

                    <p
                      style={{
                        color: '#92400E',
                        fontSize: '0.85rem',
                        marginTop: 8,
                      }}
                    >
                      {progress.toFixed(1)}% of fundraising goal reached
                    </p>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))',
                        gap: 12,
                        marginTop: 20,
                      }}
                    >
                      <div
                        style={{
                          background: '#FFF7ED',
                          borderRadius: 12,
                          padding: 16,
                        }}
                      >
                        <strong style={{ color: '#C2410C', fontSize: '1.3rem' }}>
                          {donorCount}
                        </strong>
                        <p style={{ color: '#78350F', fontSize: '0.8rem' }}>
                          Unique Donors
                        </p>
                      </div>

                      <div
                        style={{
                          background: '#FFF7ED',
                          borderRadius: 12,
                          padding: 16,
                        }}
                      >
                        <strong style={{ color: '#C2410C', fontSize: '1.3rem' }}>
                          {timeline.length}
                        </strong>
                        <p style={{ color: '#78350F', fontSize: '0.8rem' }}>
                          Donation Days
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                      <h4 style={{ color: '#7C2D12', marginBottom: 16 }}>
                        Donations Over Time
                      </h4>

                      {timeline.length === 0 ? (
                        <p style={{ color: '#92400E', fontSize: '0.9rem' }}>
                          No completed donations to display yet.
                        </p>
                      ) : (
                        <div
                          role="img"
                          aria-label={`Donation amounts over time for ${campaign.title}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: 12,
                            minHeight: 150,
                            overflowX: 'auto',
                            padding: '12px 4px 0',
                            borderBottom: '1px solid #FED7AA',
                          }}
                        >
                          {timeline.map((item) => {
                            const amount = Number(item.amount || 0);
                            const height = Math.max(
                              8,
                              (amount / maxAmount) * 110
                            );

                            return (
                              <div
                                key={item.date}
                                style={{
                                  minWidth: 58,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 6,
                                  height: 140,
                                }}
                              >
                                <span
                                  style={{
                                    color: '#78350F',
                                    fontSize: '0.7rem',
                                    textAlign: 'center',
                                  }}
                                >
                                  {money(amount)}
                                </span>
                                <div
                                  style={{
                                    width: 32,
                                    height: `${height}px`,
                                    background: '#F97316',
                                    borderRadius: '6px 6px 0 0',
                                  }}
                                />
                                <span
                                  style={{
                                    color: '#92400E',
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {date(item.date)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
