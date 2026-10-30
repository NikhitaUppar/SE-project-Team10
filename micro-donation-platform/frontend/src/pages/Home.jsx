import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import CampaignCard from '../components/campaign/CampaignCard';

/* ── Animated counter hook ─────────────────────────────────────── */
function useCounter(target, duration = 2000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target || target <= 0) { setVal(0); return; }
    const steps = 80;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

/* ── What ₹X does — specificity cards ─────────────────────────── */
const IMPACT_ROWS = [
  { amount: 50,  icon: '🍱', label: 'feeds a child for a day' },
  { amount: 100, icon: '💊', label: 'buys medicine for one patient' },
  { amount: 250, icon: '📖', label: 'funds a week of schoolbooks' },
  { amount: 500, icon: '🌱', label: 'plants five trees' },
];

/* ── Category quick-nav ────────────────────────────────────────── */
const CATEGORIES = [
  { name: 'Healthcare', icon: '🏥', color: '#FFF0F0', border: '#FECACA', text: '#991B1B' },
  { name: 'Education',  icon: '📚', color: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  { name: 'Relief',     icon: '🤝', color: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  { name: 'Animals',    icon: '🐾', color: '#F0FDF4', border: '#BBF7D0', text: '#14532D' },
  { name: 'Community',  icon: '🏘️', color: '#EFF6FF', border: '#BFDBFE', text: '#1E3A8A' },
  { name: 'Environment',icon: '🌱', color: '#F0FDF4', border: '#A7F3D0', text: '#064E3B' },
];

/* ── Stat tile ─────────────────────────────────────────────────── */
function StatTile({ value, label, sub, prefix = '', suffix = '' }) {
  const counted = useCounter(value);
  const display = value > 0 ? `${prefix}${counted.toLocaleString('en-IN')}${suffix}` : '—';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
        {display}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78350F', marginTop: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#A16207', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

export default function Home() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total_campaigns: 0, total_donations: 0, total_donors: 0 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Fetch featured campaigns sorted by deadline (most urgent first)
        const [campaignsRes, statsRes] = await Promise.all([
          api.get('/campaigns', { params: { limit: 3, page: 1, sort: 'deadline' } }),
          api.get('/campaigns/public-stats'),
        ]);
        const list = campaignsRes.data?.campaigns || (Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
        setCampaigns(list);
        setStats(statsRes.data);
      } catch (err) {
        console.error('[Home] Failed to load data:', err);
        setFetchError(err.response?.data?.error || err.message || 'Could not reach the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#FFFAF5' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap" />

      {/* ══════════════════ HERO ══════════════════ */}
      <section style={{
        background: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 45%, #EA580C 75%, #FB923C 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative blobs */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px max(16px, env(safe-area-inset-left, 0px)) 80px max(16px, env(safe-area-inset-right, 0px))', textAlign: 'center', position: 'relative' }}>
          <span style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999,
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '6px 18px', marginBottom: 28, color: '#FED7AA',
          }}>
            ✦ India's Micro-Donation Platform
          </span>

          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 24,
            textWrap: 'balance',
          }}>
            Someone is waiting for<br />
            <span style={{ color: '#FED7AA' }}>your ₹50 today.</span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#FED7AA', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7, fontWeight: 400 }}>
            Micro-donations between ₹1 and ₹500 pool together into real change —
            medicine, meals, education, and hope for communities across India.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/campaigns" style={{
              background: '#fff', color: '#C2410C',
              fontWeight: 700, fontSize: '1rem',
              padding: '14px 36px', borderRadius: 12,
              textDecoration: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              transition: 'transform 0.15s',
              display: 'inline-block',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Start Donating →
            </Link>
            <Link to="/register" style={{
              border: '2px solid rgba(255,255,255,0.5)', color: '#fff',
              fontWeight: 600, fontSize: '1rem',
              padding: '14px 32px', borderRadius: 12,
              textDecoration: 'none',
              display: 'inline-block',
            }}>
              Start a Campaign
            </Link>
          </div>

          {/* floating donation tags */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 44 }}>
            {[1, 10, 50, 100, 250, 500].map(n => (
              <span key={n} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#FEF3C7', borderRadius: 999, padding: '5px 16px',
                fontSize: '0.82rem', fontWeight: 600,
              }}>₹{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ TRUST STRIP ══════════════════ */}
      <div style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA', borderTop: '1px solid #FED7AA' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          padding: '16px max(16px, env(safe-area-inset-left, 0px)) 16px max(16px, env(safe-area-inset-right, 0px))',
          display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap',
        }}>
          {['🔒 100% Secure Payments', '✅ Verified Campaigns Only', '📊 Live Progress Tracking', '🤝 Anonymous Donations Supported'].map(t => (
            <span key={t} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400E', letterSpacing: '0.02em' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ══════════════════ IMPACT STATS ══════════════════ */}
      <section style={{ background: '#fff', padding: '64px 0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px)) 0 max(16px, env(safe-area-inset-right, 0px))' }}>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#EA580C', marginBottom: 48 }}>
            Real impact, right now
          </p>
          {fetchError && (
            <p style={{ textAlign: 'center', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', fontSize: '0.82rem', marginBottom: 32 }}>
              ⚠️ Could not load live stats — {fetchError}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40 }}>
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ height: 40, background: '#FED7AA', borderRadius: 8, marginBottom: 8, opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ height: 14, background: '#FDE68A', borderRadius: 6, width: '60%', margin: '0 auto', opacity: 0.4 }} />
                  </div>
                ))}
              </>
            ) : (
              <>
                <StatTile value={stats.total_campaigns} label="Active Campaigns" sub="Verified, live causes" />
                <StatTile value={stats.total_donations} label="Donations Made" sub="Completed transactions" />
                <StatTile value={stats.total_donors} label="Total Donors" sub="People who gave" />
              </>
            )}
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
        </div>
      </section>

      {/* ══════════════════ WHAT ₹X DOES ══════════════════ */}
      <section style={{ background: '#FFF7ED', padding: '72px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px)) 0 max(16px, env(safe-area-inset-right, 0px))' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, color: '#7C2D12', textWrap: 'balance' }}>
              Small amounts. Massive outcomes.
            </h2>
            <p style={{ color: '#92400E', marginTop: 12, fontSize: '1rem', lineHeight: 1.6 }}>
              Here's exactly what your donation does on the ground.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {IMPACT_ROWS.map(({ amount, icon, label }) => (
              <div key={amount} style={{
                background: '#fff',
                border: '1.5px solid #FED7AA',
                borderRadius: 16,
                padding: '28px 20px',
                textAlign: 'center',
                boxShadow: '0 2px 12px rgba(194,65,12,0.07)',
              }}>
                <div style={{ fontSize: '2.4rem', marginBottom: 14 }}>{icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#C2410C', marginBottom: 8 }}>₹{amount}</div>
                <div style={{ fontSize: '0.85rem', color: '#78350F', lineHeight: 1.5, fontWeight: 500 }}>{label}</div>
                <Link to="/campaigns" style={{
                  display: 'inline-block', marginTop: 18,
                  background: '#EA580C', color: '#fff',
                  borderRadius: 8, padding: '8px 20px',
                  fontSize: '0.8rem', fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  Give ₹{amount}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section style={{ background: '#fff', padding: '72px 0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px)) 0 max(16px, env(safe-area-inset-right, 0px))' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: '#1C0A00', textWrap: 'balance' }}>
              It takes under two minutes.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
            {[
              { n: '1', icon: '🔍', title: 'Find a cause', desc: 'Browse verified campaigns — healthcare, education, relief, animals, and more.' },
              { n: '2', icon: '💸', title: 'Give ₹1 – ₹500', desc: 'Any amount changes something. Donate securely in seconds.' },
              { n: '3', icon: '💛', title: 'See your impact', desc: 'Watch live progress. Your donation joins thousands of others.' },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg, #EA580C, #FB923C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', boxShadow: '0 4px 14px rgba(234,88,12,0.3)',
                }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#EA580C', marginBottom: 4 }}>Step {n}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1C0A00', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: '0.875rem', color: '#78350F', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ CATEGORIES ══════════════════ */}
      <section style={{ background: '#FFF7ED', padding: '64px 0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px)) 0 max(16px, env(safe-area-inset-right, 0px))' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#7C2D12', textAlign: 'center', marginBottom: 36, textWrap: 'balance' }}>
            What moves your heart?
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {CATEGORIES.map(({ name, icon, color, border, text }) => (
              <Link key={name} to={`/campaigns`} style={{
                background: color, border: `1.5px solid ${border}`,
                color: text, borderRadius: 999,
                padding: '10px 22px', textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
              >
                <span>{icon}</span><span>{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ FEATURED CAMPAIGNS ══════════════════ */}
      <section style={{ background: '#fff', padding: '72px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px)) 0 max(16px, env(safe-area-inset-right, 0px))' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#1C0A00', textWrap: 'balance' }}>
              Campaigns that need you now
            </h2>
            <Link to="/campaigns" style={{ color: '#EA580C', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
              See all campaigns →
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #FED7AA' }}>
                  <div style={{ height: 180, background: '#FDE68A', opacity: 0.4 }} />
                  <div style={{ padding: 20 }}>
                    {[75, 100, 60].map((w, j) => (
                      <div key={j} style={{ height: 12, background: '#FED7AA', borderRadius: 6, width: `${w}%`, marginBottom: 10, opacity: 0.5 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : campaigns.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#92400E' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🌱</div>
              <p style={{ fontWeight: 600 }}>No campaigns yet. <Link to="/campaigns/create" style={{ color: '#EA580C' }}>Start the first one!</Link></p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════ EMOTIONAL QUOTE ══════════════════ */}
      <section style={{ background: 'linear-gradient(135deg, #7C2D12, #9A3412)', padding: '72px 0' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px)) 0 max(16px, env(safe-area-inset-right, 0px))', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 20, opacity: 0.6 }}>"</div>
          <blockquote style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.2rem, 3vw, 1.7rem)',
            fontWeight: 700,
            color: '#FEF3C7',
            lineHeight: 1.55,
            margin: '0 0 28px',
            textWrap: 'balance',
          }}>
            No one who ever gave wholeheartedly ever regretted it.
          </blockquote>
          <p style={{ color: '#FBB77E', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            — Join thousands of donors changing India, ₹50 at a time
          </p>
        </div>
      </section>

      {/* ══════════════════ FINAL CTA ══════════════════ */}
      <section style={{ background: '#FFF7ED', padding: '80px 0' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px)) 0 max(16px, env(safe-area-inset-right, 0px))', textAlign: 'center' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 16 }}>❤️</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, color: '#7C2D12', marginBottom: 16, textWrap: 'balance' }}>
            You could be someone's hero today.
          </h2>
          <p style={{ color: '#92400E', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Every campaign on this platform is run by real people facing real struggles.
            Your ₹50 is not a small thing to them. It is everything.
          </p>
          <Link to="/campaigns" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #C2410C, #EA580C)',
            color: '#fff',
            fontWeight: 800, fontSize: '1.05rem',
            padding: '16px 52px', borderRadius: 14,
            textDecoration: 'none',
            boxShadow: '0 6px 28px rgba(194,65,12,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(194,65,12,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(194,65,12,0.35)'; }}
          >
            Start Donating
          </Link>
          <p style={{ color: '#A16207', fontSize: '0.78rem', marginTop: 18, fontWeight: 500 }}>
            Starts at ₹1 · Secure payment · Takes 90 seconds
          </p>
        </div>
      </section>
    </div>
  );
}
