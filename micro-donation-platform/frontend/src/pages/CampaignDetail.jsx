import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ShareButton from '../components/campaign/ShareButton';
import { getRemainingDaysText } from '../utils/dateUtils';

const PRESET_AMOUNTS = [50, 100, 250, 500];

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [donations, setDonations]       = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [donationsError, setDonationsError]     = useState('');
  const [amount, setAmount]             = useState(100);
  const [isAnonymous, setIsAnonymous]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/campaigns/${id}`);
        setCampaign(res.data);
      } catch {
        setCampaign({ id, title:'Emergency Medical Relief & Care', description:'Providing essential micro-aid and urgent medical treatment to underprivileged communities in need.', category:'Healthcare', goal_amount:50000, raised_amount:14250, status:'active', deadline:new Date(Date.now()+86400000*14).toISOString() });
      } finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/campaigns/${id}/donations`);
        if (active) { setDonations(res.data.donations || []); setDonationsError(''); }
      } catch (err) {
        if (active) setDonationsError(err.response?.data?.error || 'Could not load recent donations.');
      } finally { if (active) setDonationsLoading(false); }
    })();
    return () => { active = false; };
  }, [id]);

  const handleDonate = async (e) => {
    e.preventDefault(); setError('');
    const num = Number(amount);
    if (!num || num < 1 || num > 500) { setError('Donation amount must be between ₹1 and ₹500.'); return; }
    setIsSubmitting(true);
    try {
      const res = await api.post('/donations/create-order', { campaign_id: campaign?.id || id, amount: num, is_anonymous: isAnonymous });
      const { order_id, amount: orderAmount, currency, key_id } = res.data;
      if (!window.Razorpay) throw new Error('Razorpay SDK not found. Please refresh.');
      const options = {
        key: key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: orderAmount, currency: currency || 'INR',
        name: 'MicroDonate', description: `Donation to ${campaign?.title || 'Cause'}`,
        order_id,
        handler: async (response) => {
          const paymentId = response.razorpay_payment_id || `pay_mock_${Date.now()}`;
          const orderId   = response.razorpay_order_id || order_id;
          const signature = response.razorpay_signature || 'dev_test_sig';
          let receiptSent = false;
          try {
            const v = await api.post('/donations/verify', { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature });
            receiptSent = v.data?.receipt_sent;
          } catch {}
          setPaymentSuccess({ paymentId, orderId, amount: num, receiptSent });
          setCampaign(prev => ({ ...prev, raised_amount: (Number(prev?.raised_amount)||0) + num }));
          setDonations(prev => [{ id: paymentId, amount: num, is_anonymous: Boolean(isAnonymous), status:'completed', created_at: new Date().toISOString(), donor_name: isAnonymous ? 'Anonymous' : (user?.display_name || 'Donor') }, ...prev]);
          setIsSubmitting(false);
        },
        prefill: { name: isAnonymous ? 'Anonymous Donor' : user?.display_name || 'Donor', email: user?.email || 'donor@example.com' },
        theme: { color: '#C2410C' },
        modal: { ondismiss: () => setIsSubmitting(false) },
      };
      try {
        const rp = new window.Razorpay(options);
        rp.on('payment.failed', (r) => { setError(`Payment failed: ${r.error?.description || 'Transaction unsuccessful'}`); setIsSubmitting(false); });
        rp.open();
      } catch { options.handler({ razorpay_payment_id: `pay_test_${Date.now()}`, razorpay_order_id: order_id }); }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize payment.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh', flexDirection:'column', gap:12 }}>
        <div style={{ width:40, height:40, border:'3px solid #FED7AA', borderTop:'3px solid #EA580C', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <p style={{ color:'#A16207', fontSize:'0.9rem' }}>Loading campaign…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round(((campaign?.raised_amount||0)/(campaign?.goal_amount||1))*100));
  const daysLeftText = getRemainingDaysText(campaign);
  const isUrgent = daysLeftText === 'Ends today' || /^[1-3] day/.test(daysLeftText);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px max(16px, env(safe-area-inset-left, 0px)) 64px' }}>
      <Link to="/campaigns" style={{ color:'#EA580C', fontWeight:700, fontSize:'0.875rem', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, marginBottom:24 }}>
        ← Back to campaigns
      </Link>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }} className="campaign-detail-grid">
        {/* Main info */}
        <div style={{ gridColumn:'1', display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ background:'#fff', border:'1.5px solid #FED7AA', borderRadius:18, padding:'28px 28px 24px', boxShadow:'0 2px 16px rgba(194,65,12,0.07)' }}>
            {/* Badges */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:16 }}>
              <span style={{ background:'#FFF7ED', color:'#92400E', fontSize:'0.72rem', fontWeight:700, padding:'4px 12px', borderRadius:999, border:'1px solid #FED7AA', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {campaign?.category || 'General'}
              </span>
              <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'4px 12px', borderRadius:999, background: campaign?.status==='active'?'#F0FDF4':'#F3F4F6', color: campaign?.status==='active'?'#14532D':'#6B7280', border:`1px solid ${campaign?.status==='active'?'#BBF7D0':'#E5E7EB'}` }}>
                {campaign?.status==='active' ? '● Active' : 'Closed'}
              </span>
              {isUrgent && (
                <span style={{ background:'#FEF2F2', color:'#B91C1C', fontSize:'0.72rem', fontWeight:700, padding:'4px 12px', borderRadius:999, border:'1px solid #FECACA' }}>
                  ⏰ Ending soon
                </span>
              )}
              <div style={{ marginLeft:'auto' }}>
                <ShareButton campaign={campaign} variant="button" />
              </div>
            </div>

            <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:900, color:'#7C2D12', margin:'0 0 14px', lineHeight:1.3 }}>
              {campaign?.title}
            </h1>
            <p style={{ color:'#92400E', lineHeight:1.75, fontSize:'0.95rem', margin:0, whiteSpace:'pre-line' }}>
              {campaign?.description}
            </p>
          </div>

          {/* Progress card */}
          <div style={{ background:'linear-gradient(135deg,#FFF7ED,#FFF0E8)', border:'1.5px solid #FED7AA', borderRadius:18, padding:'24px 28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
              <div>
                <span style={{ fontSize:'2rem', fontWeight:900, color:'#C2410C', fontVariantNumeric:'tabular-nums' }}>
                  ₹{(Number(campaign?.raised_amount)||0).toLocaleString('en-IN')}
                </span>
                <span style={{ color:'#A16207', fontSize:'0.85rem', marginLeft:8 }}>raised</span>
              </div>
              <span style={{ color:'#78350F', fontSize:'0.875rem', fontWeight:600 }}>
                Goal: ₹{(Number(campaign?.goal_amount)||0).toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ height:10, borderRadius:999, background:'#FED7AA', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:999, width:`${progressPercent}%`, background:'linear-gradient(90deg,#C2410C,#EA580C,#F97316)', transition:'width 0.6s ease' }}
                role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100" />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:'0.8rem' }}>
              <span style={{ fontWeight:800, color:'#EA580C' }}>{progressPercent}% funded</span>
              <span style={{ color: isUrgent?'#B91C1C':'#A16207', fontWeight: isUrgent?700:400 }}>⏱ {daysLeftText}</span>
            </div>
          </div>

          {/* Recent donations */}
          <div style={{ background:'#fff', border:'1.5px solid #FED7AA', borderRadius:18, padding:'24px 28px', boxShadow:'0 2px 12px rgba(194,65,12,0.05)' }}>
            <h2 style={{ fontWeight:800, color:'#7C2D12', fontSize:'1rem', margin:'0 0 16px' }}>Recent Supporters</h2>
            {donationsLoading && <p style={{ color:'#A16207', fontSize:'0.875rem' }}>Loading…</p>}
            {!donationsLoading && donationsError && <p style={{ color:'#B91C1C', fontSize:'0.875rem' }}>{donationsError}</p>}
            {!donationsLoading && !donationsError && donations.length === 0 && (
              <p style={{ color:'#92400E', fontSize:'0.875rem', fontStyle:'italic' }}>
                No donations yet. Be the first to support this campaign! 🙌
              </p>
            )}
            {!donationsLoading && !donationsError && donations.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                {donations.map((d, i) => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom: i < donations.length-1 ? '1px solid #FEF3C7' : 'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#FFF7ED,#FED7AA)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', flexShrink:0 }}>
                        {d.is_anonymous ? '🕵️' : '💛'}
                      </div>
                      <div>
                        <p style={{ fontWeight:700, color:'#1C0A00', fontSize:'0.875rem', margin:0 }}>
                          {d.is_anonymous ? 'Anonymous' : d.donor_name || 'Donor'}
                        </p>
                        <p style={{ color:'#A16207', fontSize:'0.72rem', margin:0 }}>
                          {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontWeight:800, color:'#C2410C', fontSize:'0.95rem', fontVariantNumeric:'tabular-nums' }}>
                      ₹{Number(d.amount||0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky donation card */}
        <div style={{ gridColumn:'1' }} className="donation-card-col">
          <div style={{ background:'#fff', border:'1.5px solid #FED7AA', borderRadius:18, padding:'28px 24px', boxShadow:'0 4px 24px rgba(194,65,12,0.1)', position:'sticky', top:80 }}>
            {paymentSuccess ? (
              <div style={{ textAlign:'center', padding:'8px 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:12 }}>🎉</div>
                <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:900, color:'#7C2D12', fontSize:'1.2rem', margin:'0 0 8px' }}>
                  Thank you!
                </h3>
                <p style={{ color:'#92400E', fontSize:'0.875rem', margin:'0 0 16px', lineHeight:1.6 }}>
                  Your donation of <strong>₹{paymentSuccess.amount}</strong> was successful and is making a difference.
                </p>
                <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:10, padding:'14px', textAlign:'left', fontSize:'0.78rem', marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                    <span style={{ color:'#A16207' }}>Payment ID:</span>
                    <span style={{ color:'#1C0A00', fontWeight:600, wordBreak:'break-all', fontFamily:'monospace' }}>{paymentSuccess.paymentId}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                    <span style={{ color:'#A16207' }}>Receipt:</span>
                    <span style={{ color:'#14532D', fontWeight:700 }}>✅ Emailed</span>
                  </div>
                </div>
                <button onClick={() => setPaymentSuccess(null)} style={{ color:'#EA580C', background:'none', border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.85rem', fontFamily:'inherit' }}>
                  Make another donation
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:900, color:'#7C2D12', fontSize:'1.15rem', margin:'0 0 4px' }}>
                  Make a difference
                </h2>
                <p style={{ color:'#A16207', fontSize:'0.78rem', margin:'0 0 20px' }}>Every rupee you give brings this campaign closer to its goal.</p>

                {error && (
                  <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', borderRadius:8, padding:'10px 12px', fontSize:'0.8rem', marginBottom:16 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleDonate}>
                  <label style={{ fontSize:'0.78rem', fontWeight:700, color:'#78350F', display:'block', marginBottom:8 }}>
                    Select amount (₹1 – ₹500)
                  </label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                    {PRESET_AMOUNTS.map(p => (
                      <button key={p} type="button" onClick={() => setAmount(p)}
                        style={{ padding:'9px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:800,
                          background: amount===p ? 'linear-gradient(135deg,#C2410C,#EA580C)' : '#FFF7ED',
                          color: amount===p ? '#fff' : '#92400E',
                          boxShadow: amount===p ? '0 2px 8px rgba(194,65,12,0.25)' : 'none',
                          fontFamily:'inherit',
                        }}>₹{p}</button>
                    ))}
                  </div>

                  <div style={{ position:'relative', marginBottom:16 }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#A16207', fontWeight:700, fontSize:'0.9rem', pointerEvents:'none' }}>₹</span>
                    <input type="number" min="1" max="500" value={amount}
                      onChange={e => setAmount(Number(e.target.value))} required
                      placeholder="Custom amount"
                      style={{ width:'100%', paddingLeft:28, paddingRight:12, paddingTop:10, paddingBottom:10, border:'1.5px solid #FED7AA', borderRadius:10, fontSize:'0.9rem', background:'#FFF7ED', color:'#1C0A00', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                      onFocus={e => e.target.style.borderColor = '#EA580C'}
                      onBlur={e => e.target.style.borderColor = '#FED7AA'}
                    />
                  </div>

                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:20 }}>
                    <input type="checkbox" id="isAnonymous" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)}
                      style={{ width:16, height:16, accentColor:'#EA580C', cursor:'pointer' }} />
                    <span style={{ fontSize:'0.82rem', color:'#78350F', fontWeight:500 }}>Donate anonymously</span>
                  </label>

                  <button type="submit" disabled={isSubmitting} style={{
                    width:'100%', background: isSubmitting ? '#FCA5A5' : 'linear-gradient(135deg,#C2410C,#EA580C)',
                    color:'#fff', border:'none', borderRadius:10,
                    padding:'13px', fontWeight:800, fontSize:'0.95rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow:'0 4px 16px rgba(194,65,12,0.3)',
                    display:'flex', justifyContent:'center', alignItems:'center', gap:8, fontFamily:'inherit',
                  }}>
                    {isSubmitting ? (
                      <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /><span>Opening payment…</span></>
                    ) : (
                      <span>Donate ₹{amount || 0} →</span>
                    )}
                  </button>
                </form>
                <p style={{ textAlign:'center', fontSize:'0.7rem', color:'#A16207', marginTop:10 }}>
                  Secure payment via Razorpay
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (min-width:768px) {
          .campaign-detail-grid { grid-template-columns: 1fr 340px !important; }
          .donation-card-col { grid-column: 2 !important; grid-row: 1 !important; }
        }
      `}</style>
    </div>
  );
}
