import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import CampaignCard from '../components/campaign/CampaignCard';

const CATEGORIES = ['All', 'Healthcare', 'Education', 'Relief', 'Animals', 'Community', 'Environment'];
const CAT_ICONS = { Healthcare:'🏥', Education:'📚', Relief:'🤝', Animals:'🐾', Community:'🏘️', Environment:'🌱', All:'✨' };

export default function Campaigns() {
  const [campaigns, setCampaigns]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedCategory, setCategory] = useState('All');
  const [searchQuery, setSearchQuery]   = useState('');
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({ page:1, limit:9, total:0, totalPages:1 });

  const fetchCampaigns = useCallback(async (cat, p, q) => {
    setLoading(true); setError(null);
    try {
      const params = { page: p, limit: 9 };
      if (cat && cat !== 'All') params.category = cat;
      if (q && q.trim()) params.search = q.trim();
      const res = await api.get('/campaigns', { params });
      if (res.data?.campaigns) {
        setCampaigns(res.data.campaigns);
        if (res.data.pagination) setPagination(res.data.pagination);
      } else if (Array.isArray(res.data)) {
        setCampaigns(res.data);
        setPagination({ page:p, limit:9, total:res.data.length, totalPages: Math.max(1, Math.ceil(res.data.length/9)) });
      } else setCampaigns([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load campaigns. Please try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCampaigns(selectedCategory, page, searchQuery); }, [selectedCategory, page, fetchCampaigns]);

  const handleCategory = (c) => { setCategory(c); setPage(1); };
  const handleSearch   = (e) => { e.preventDefault(); setPage(1); fetchCampaigns(selectedCategory, 1, searchQuery); };
  const handleClear    = () => { setCategory('All'); setSearchQuery(''); setPage(1); fetchCampaigns('All', 1, ''); };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px max(16px, env(safe-area-inset-left, 0px)) 64px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 40px' }}>
        <span style={{
          display: 'inline-block', background: '#FFF7ED', border: '1px solid #FED7AA',
          color: '#C2410C', fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '5px 14px', borderRadius: 999, marginBottom: 14,
        }}>Micro-Donation Platform</span>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 900, color: '#7C2D12', margin: '0 0 12px', textWrap: 'balance' }}>
          Find Your Cause
        </h1>
        <p style={{ color: '#92400E', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
          Browse verified campaigns and make a real difference — ₹1 to ₹500 at a time.
        </p>
      </div>

      {/* Filter + Search bar */}
      <div style={{ background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 16, padding: '20px 24px', marginBottom: 32, boxShadow: '0 2px 12px rgba(194,65,12,0.06)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Category pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="tablist">
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => handleCategory(cat)} role="tab" aria-selected={active}
                  style={{
                    padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 700,
                    background: active ? 'linear-gradient(135deg,#C2410C,#EA580C)' : '#FFF7ED',
                    color: active ? '#fff' : '#92400E',
                    boxShadow: active ? '0 2px 8px rgba(194,65,12,0.25)' : 'none',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  <span>{CAT_ICONS[cat]}</span><span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ position: 'relative', minWidth: 240 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A16207', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              style={{
                width: '100%', paddingLeft: 36, paddingRight: searchQuery ? 36 : 12,
                paddingTop: 9, paddingBottom: 9,
                border: '1.5px solid #FED7AA', borderRadius: 10,
                fontSize: '0.85rem', background: '#FFF7ED', color: '#7C2D12',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#EA580C'}
              onBlur={e => e.target.style.borderColor = '#FED7AA'}
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setPage(1); fetchCampaigns(selectedCategory, 1, ''); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A16207', fontSize: '1rem' }}>
                ×
              </button>
            )}
          </form>
        </div>

        {/* Active filter summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #FED7AA', fontSize: '0.78rem', color: '#92400E' }}>
          <span>
            Showing <strong style={{ color: '#7C2D12' }}>{pagination.total}</strong> campaign{pagination.total !== 1 ? 's' : ''}
            {selectedCategory !== 'All' && <> in <span style={{ color: '#C2410C', fontWeight: 700 }}>{selectedCategory}</span></>}
            {searchQuery && <> matching "<em>{searchQuery}</em>"</>}
          </span>
          {(selectedCategory !== 'All' || searchQuery) && (
            <button onClick={handleClear} style={{ color: '#EA580C', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => fetchCampaigns(selectedCategory, page, searchQuery)}
            style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 24 }}>
          {[...Array(6)].map((_,i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #FED7AA', overflow: 'hidden' }}>
              <div style={{ height: 188, background: '#FFF7ED', opacity: 0.6 }} />
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[70,100,55,80].map((w,j) => (
                  <div key={j} style={{ height: j===0?18:12, background: '#FED7AA', borderRadius: 6, width:`${w}%`, opacity:0.5, animation:'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ background: '#fff', border: '2px dashed #FED7AA', borderRadius: 20, padding: '60px 32px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌱</div>
          <h3 style={{ fontWeight: 800, color: '#7C2D12', marginBottom: 8 }}>No Campaigns Found</h3>
          <p style={{ color: '#92400E', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            {selectedCategory !== 'All'
              ? `No active campaigns in "${selectedCategory}" right now.`
              : 'No active campaigns yet.'}
          </p>
          {(selectedCategory !== 'All' || searchQuery) && (
            <button onClick={handleClear} style={{
              background: 'linear-gradient(135deg,#C2410C,#EA580C)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '10px 24px',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
            }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 24 }}>
          {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #FED7AA', background: page===1?'#FFF7ED':'#fff', color: page===1?'#FCA5A5':'#92400E', fontWeight: 600, cursor: page===1?'not-allowed':'pointer', fontSize: '0.85rem' }}>
            ← Prev
          </button>
          {[...Array(pagination.totalPages)].map((_,i) => {
            const p = i+1;
            return (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                  background: page===p ? 'linear-gradient(135deg,#C2410C,#EA580C)' : 'transparent',
                  color: page===p ? '#fff' : '#92400E',
                }}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page===pagination.totalPages}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #FED7AA', background: page===pagination.totalPages?'#FFF7ED':'#fff', color: page===pagination.totalPages?'#FCA5A5':'#92400E', fontWeight: 600, cursor: page===pagination.totalPages?'not-allowed':'pointer', fontSize: '0.85rem' }}>
            Next →
          </button>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}
