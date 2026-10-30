import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const res = await api.get('/users/me/donations');
        if (active) { setDonations(res.data.donations || []); setError(''); }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Could not load your donation history.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user, authLoading]);

  const totalGiven = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FED7AA', borderTop: '3px solid #EA580C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#A16207', fontSize: '0.9rem' }}>Loading your donations…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '32px 16px' }}>
        <div style={{ fontSize: '3rem' }}>🔐</div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.5rem', fontWeight: 900, color: '#7C2D12' }}>Your Donations</h2>
        <p style={{ color: '#92400E', fontSize: '0.95rem' }}>Please log in to view your donation history.</p>
        <Link to="/login" style={{ background: 'linear-gradient(135deg,#C2410C,#EA580C)', color: '#fff', textDecoration: 'none', padding: '10px 28px', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(194,65,12,0.25)' }}>
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px max(16px, env(safe-area-inset-left, 0px)) 64px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#EA580C', marginBottom: 8 }}>
          Welcome back
        </p>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 900, color: '#7C2D12', margin: '0 0 8px' }}>
          {user.display_name || 'Your'}'s Impact
        </h1>
        <p style={{ color: '#92400E', fontSize: '0.95rem', margin: 0 }}>
          Every donation you've made has helped change someone's life.
        </p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Total Donated', value: `₹${totalGiven.toLocaleString('en-IN')}`, icon: '💸', sub: 'all time' },
          { label: 'Campaigns Supported', value: new Set(donations.map(d => d.campaign_id)).size, icon: '🎯', sub: 'unique campaigns' },
          { label: 'Donations Made', value: donations.length, icon: '🤝', sub: 'transactions' },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} style={{ background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 14, padding: '20px 18px', boxShadow: '0 2px 10px rgba(194,65,12,0.06)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#C2410C', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78350F', marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: '0.7rem', color: '#A16207', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && donations.length === 0 && (
        <div style={{ background: '#fff', border: '2px dashed #FED7AA', borderRadius: 20, padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
          <h3 style={{ fontWeight: 800, color: '#7C2D12', marginBottom: 8 }}>No donations yet</h3>
          <p style={{ color: '#92400E', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Your first donation starts your impact story. Browse campaigns and find a cause you care about.
          </p>
          <Link to="/campaigns" style={{ background: 'linear-gradient(135deg,#C2410C,#EA580C)', color: '#fff', textDecoration: 'none', padding: '10px 28px', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(194,65,12,0.25)' }}>
            Browse Campaigns →
          </Link>
        </div>
      )}

      {/* Donation table */}
      {donations.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(194,65,12,0.06)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #FED7AA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontWeight: 800, color: '#7C2D12', fontSize: '1rem', margin: 0 }}>Donation History</h2>
            <span style={{ fontSize: '0.78rem', color: '#A16207', fontWeight: 600 }}>{donations.length} record{donations.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#FFF7ED' }}>
                  {['Campaign', 'Amount', 'Privacy', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 700, color: '#78350F', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {donations.map((d, i) => (
                  <tr key={d.id} style={{ borderTop: '1px solid #FEF3C7', background: i % 2 === 0 ? '#fff' : '#FFFDF9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#1C0A00', minWidth: 0 }}>
                      {d.campaigns?.title || 'Campaign'}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#C2410C', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Number(d.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                        background: d.is_anonymous ? '#F3F4F6' : '#FFF7ED',
                        color: d.is_anonymous ? '#4B5563' : '#92400E',
                        border: `1px solid ${d.is_anonymous ? '#E5E7EB' : '#FED7AA'}`,
                      }}>
                        {d.is_anonymous ? '🕵️ Anonymous' : '👤 Public'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, textTransform: 'capitalize',
                        background: d.status === 'completed' ? '#F0FDF4' : '#FFF7ED',
                        color: d.status === 'completed' ? '#14532D' : '#92400E',
                        border: `1px solid ${d.status === 'completed' ? '#BBF7D0' : '#FED7AA'}`,
                      }}>
                        {d.status === 'completed' ? '✅ ' : ''}{d.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#A16207', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
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
