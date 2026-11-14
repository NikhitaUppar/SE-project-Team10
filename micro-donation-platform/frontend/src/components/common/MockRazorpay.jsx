import { useState, useEffect } from 'react';

/* ─── Static Data ─────────────────────────────────────────── */
const BANKS = [
  { name: 'State Bank of India',    code: 'SBI',  color: '#1b4f9b', logo: '🏛️' },
  { name: 'HDFC Bank',              code: 'HDFC', color: '#004c8f', logo: '🔵' },
  { name: 'ICICI Bank',             code: 'ICIC', color: '#f36f21', logo: '🟠' },
  { name: 'Axis Bank',              code: 'UTIB', color: '#97144c', logo: '🔴' },
  { name: 'Kotak Mahindra Bank',    code: 'KKBK', color: '#ef3929', logo: '🟥' },
  { name: 'Punjab National Bank',   code: 'PUNB', color: '#1e3a5f', logo: '🏦' },
  { name: 'Bank of Baroda',         code: 'BARB', color: '#f7941d', logo: '🟡' },
  { name: 'Canara Bank',            code: 'CNRB', color: '#004b87', logo: '🔷' },
];

const UPI_APPS = [
  { id: 'gpay',    label: 'Google Pay',  bg: '#fff',    border: '#e8f0fe', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/120px-Google_Pay_Logo.svg.png' },
  { id: 'phonepe', label: 'PhonePe',     bg: '#5f259f', border: '#5f259f', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/120px-PhonePe_Logo.svg.png', light: true },
  { id: 'paytm',   label: 'Paytm',       bg: '#00BAF2', border: '#00BAF2', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Paytm_logo.png', light: true },
  { id: 'bhim',    label: 'BHIM UPI',    bg: '#fff',    border: '#e2e8f0', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/BHIM_SVG_Logo.svg/120px-BHIM_SVG_Logo.svg.png' },
];

const NAV_ITEMS = [
  { id: 'upi',        label: 'UPI',         icon: UPIIcon },
  { id: 'card',       label: 'Card',         icon: CardIcon },
  { id: 'netbanking', label: 'Net Banking',  icon: BankIcon },
  { id: 'wallet',     label: 'Wallet',       icon: WalletIcon },
  { id: 'emi',        label: 'EMI',          icon: EMIIcon },
];

/* ─── SVG Icons ───────────────────────────────────────────── */
function UPIIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8"/>
      <path d="M7 12l3 3 7-7" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function CardIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8"/>
      <path d="M2 10h20" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8"/>
      <rect x="5" y="14" width="4" height="2" rx="0.5" fill={active ? '#528ff0' : '#94a3b8'}/>
    </svg>
  );
}
function BankIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 21h18M3 10h18M5 10V21M9 10V21M13 10V21M17 10V21M12 3L3 10h18L12 3z" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function WalletIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8"/>
      <path d="M16 13.5a1 1 0 110-2 1 1 0 010 2z" fill={active ? '#528ff0' : '#94a3b8'}/>
      <path d="M20 7V6a2 2 0 00-2-2H6" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function EMIIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8"/>
      <path d="M12 7v5l3 3" stroke={active ? '#528ff0' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#94a3b8" strokeWidth="2"/>
      <path d="M8 11V7a4 4 0 018 0v4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */
const fmt4 = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
const fmtExp = v => { const d=v.replace(/\D/g,'').slice(0,4); return d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d; };
const inp = (extra={}) => ({
  style:{
    width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:'0.875rem', boxSizing:'border-box', outline:'none',
    background:'#fff', color:'#1e293b', fontFamily:'inherit', transition:'border-color 0.15s',
    ...extra,
  },
  onFocus: e => e.target.style.borderColor='#528ff0',
  onBlur:  e => e.target.style.borderColor='#e2e8f0',
});

/* ─── Main Component ──────────────────────────────────────── */
export default function MockRazorpay({ options, onClose }) {
  const [tab, setTab]     = useState('upi');
  const [step, setStep]   = useState('pay');   // pay | processing | done
  const [upiApp, setUpiApp] = useState('');
  const [upiId, setUpiId]   = useState('');
  const [upiMode, setUpiMode] = useState('app'); // app | id
  const [card, setCard]     = useState({ number:'', name:'', expiry:'', cvv:'' });
  const [showCvv, setShowCvv] = useState(false);
  const [bank, setBank]     = useState('');
  const [wallet, setWallet] = useState('');
  const [error, setError]   = useState('');
  const [timer, setTimer]   = useState(null);

  const amount = options.amount / 100;

  /* UPI countdown timer when app selected */
  useEffect(() => {
    if (upiApp && upiMode === 'app' && step === 'pay') {
      let t = 300;
      setTimer(t);
      const iv = setInterval(() => { t--; setTimer(t); if (t <= 0) clearInterval(iv); }, 1000);
      return () => clearInterval(iv);
    } else { setTimer(null); }
  }, [upiApp, upiMode, step]);

  const validate = () => {
    if (tab === 'upi') {
      if (upiMode === 'id' && !upiId.includes('@')) { setError('Enter a valid UPI ID (e.g. name@upi)'); return false; }
      if (upiMode === 'app' && !upiApp) { setError('Please select a UPI app'); return false; }
    }
    if (tab === 'card') {
      if (card.number.replace(/\s/g,'').length < 16) { setError('Enter a valid 16-digit card number'); return false; }
      if (!card.name.trim()) { setError('Enter cardholder name'); return false; }
      if (!card.expiry.includes('/') || card.expiry.length < 5) { setError('Enter expiry as MM/YY'); return false; }
      if (card.cvv.length < 3) { setError('Enter a valid CVV (3–4 digits)'); return false; }
    }
    if (tab === 'netbanking' && !bank) { setError('Please select your bank'); return false; }
    if (tab === 'wallet' && !wallet) { setError('Please select a wallet'); return false; }
    if (tab === 'emi') { setError('EMI requires a valid card — use Card tab'); return false; }
    return true;
  };

  const handlePay = async () => {
    setError('');
    if (!validate()) return;
    setStep('processing');
    await new Promise(r => setTimeout(r, 800));
    const res = {
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_order_id:   options.order_id,
      razorpay_signature:  'dev_test_sig',
    };
    setStep('done');
    await new Promise(r => setTimeout(r, 600));
    onClose();
    options.handler(res);
  };

  const payLabel = () => {
    if (tab === 'upi' && upiMode === 'app' && upiApp) return `Pay ₹${amount.toLocaleString('en-IN')} via ${UPI_APPS.find(a=>a.id===upiApp)?.label||'UPI'}`;
    return `Pay ₹${amount.toLocaleString('en-IN')}`;
  };

  /* ── Sidebar ── */
  const Sidebar = () => (
    <div style={{
      width: 220, minWidth: 220, background: '#f8fafc', borderRight: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Merchant info */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{
            width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#C2410C,#EA580C)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'1rem',
          }}>M</div>
          <div>
            <div style={{ fontWeight:800, color:'#1e293b', fontSize:'0.875rem' }}>{options.name || 'MicroDonate'}</div>
            <div style={{ color:'#64748b', fontSize:'0.7rem' }}>Micro-Donation Platform</div>
          </div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ color:'#64748b', fontSize:'0.68rem', marginBottom:2 }}>Amount</div>
          <div style={{ color:'#1e293b', fontWeight:900, fontSize:'1.5rem' }}>₹{amount.toLocaleString('en-IN')}</div>
          <div style={{ color:'#94a3b8', fontSize:'0.65rem', marginTop:2 }}>Test Mode</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'12px 8px', flex:1 }}>
        {NAV_ITEMS.map(n => {
          const active = tab === n.id;
          const Icon = n.icon;
          return (
            <button key={n.id} onClick={() => { setTab(n.id); setError(''); }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer',
                background: active ? '#eff6ff' : 'transparent',
                color: active ? '#528ff0' : '#64748b',
                fontWeight: active ? 700 : 500, fontSize:'0.84rem',
                fontFamily:'inherit', marginBottom:2, transition:'all 0.12s',
                borderLeft: active ? '3px solid #528ff0' : '3px solid transparent',
              }}>
              <Icon active={active} />
              {n.label}
              {active && <span style={{ marginLeft:'auto', fontSize:'0.75rem' }}>›</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:6 }}>
        <LockIcon />
        <span style={{ fontSize:'0.65rem', color:'#94a3b8' }}>Secured by</span>
        <span style={{ fontSize:'0.7rem', fontWeight:800, color:'#528ff0', letterSpacing:'-0.5px' }}>razorpay</span>
      </div>
    </div>
  );

  /* ── Processing Screen ── */
  if (step === 'processing') return (
    <Overlay onClose={null}>
      <Modal>
        <Sidebar />
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, gap:20 }}>
          <div style={{
            width:60, height:60,
            border: '5px solid #e2e8f0', borderTop:'5px solid #528ff0',
            borderRadius:'50%', animation:'rzp-spin 0.9s linear infinite',
          }}/>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontWeight:800, color:'#1e293b', fontSize:'1rem', marginBottom:4 }}>Processing payment…</p>
            <p style={{ color:'#64748b', fontSize:'0.8rem' }}>Please do not press back or close</p>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:8, height:8, borderRadius:'50%', background:'#528ff0',
                animation:`rzp-bounce 1.2s ${i*0.2}s ease-in-out infinite`,
              }}/>
            ))}
          </div>
          <style>{`
            @keyframes rzp-spin { to { transform: rotate(360deg) }}
            @keyframes rzp-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
          `}</style>
        </div>
      </Modal>
    </Overlay>
  );

  /* ── Success Screen ── */
  if (step === 'done') return (
    <Overlay onClose={null}>
      <Modal>
        <Sidebar />
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, gap:16 }}>
          <div style={{
            width:72, height:72, borderRadius:'50%',
            background:'linear-gradient(135deg,#22c55e,#16a34a)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 24px rgba(34,197,94,0.35)',
            animation:'rzp-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontWeight:900, color:'#15803d', fontSize:'1.15rem', marginBottom:4 }}>Payment Successful!</p>
            <p style={{ color:'#64748b', fontSize:'0.8rem' }}>₹{amount.toLocaleString('en-IN')} paid to {options.name}</p>
          </div>
          <style>{`@keyframes rzp-pop { from{transform:scale(0)} to{transform:scale(1)} }`}</style>
        </div>
      </Modal>
    </Overlay>
  );

  /* ── Main Payment UI ── */
  return (
    <Overlay onClose={onClose}>
      <Modal>
        <Sidebar />

        {/* Right panel */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Panel header */}
          <div style={{ padding:'18px 24px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:800, color:'#1e293b', fontSize:'0.95rem' }}>
                {tab === 'upi' ? 'Pay via UPI' : tab === 'card' ? 'Pay via Card' : tab === 'netbanking' ? 'Net Banking' : tab === 'wallet' ? 'Wallets' : 'EMI'}
              </div>
              <div style={{ color:'#94a3b8', fontSize:'0.68rem' }}>Test Mode — no real money deducted</div>
            </div>
            <button onClick={onClose} style={{
              background:'#f1f5f9', border:'none', borderRadius:'50%', width:28, height:28,
              cursor:'pointer', color:'#64748b', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {/* Panel body */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

            {/* ── UPI tab ── */}
            {tab === 'upi' && (
              <div>
                {/* Mode switch */}
                <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:3, marginBottom:18, gap:3 }}>
                  {['app','id'].map(m => (
                    <button key={m} onClick={() => { setUpiMode(m); setError(''); }}
                      style={{
                        flex:1, padding:'7px 0', border:'none', borderRadius:6, cursor:'pointer',
                        background: upiMode===m ? '#fff' : 'transparent',
                        fontWeight: upiMode===m ? 700 : 500, fontSize:'0.8rem',
                        color: upiMode===m ? '#1e293b' : '#64748b',
                        boxShadow: upiMode===m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                        fontFamily:'inherit', transition:'all 0.15s',
                      }}>
                      {m === 'app' ? '📱 UPI App' : '⌨️ UPI ID'}
                    </button>
                  ))}
                </div>

                {upiMode === 'app' ? (
                  <div>
                    <p style={{ color:'#64748b', fontSize:'0.78rem', marginBottom:14 }}>Choose your preferred UPI app:</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                      {UPI_APPS.map(app => (
                        <button key={app.id} onClick={() => { setUpiApp(app.id); setError(''); }}
                          style={{
                            padding:'14px 10px', border:`2px solid ${upiApp===app.id ? '#528ff0' : '#e2e8f0'}`,
                            borderRadius:12, background: upiApp===app.id ? '#eff6ff' : '#fff',
                            cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                            transition:'all 0.15s', boxShadow: upiApp===app.id ? '0 0 0 3px rgba(82,143,240,0.15)' : 'none',
                          }}>
                          <div style={{ fontSize:'0.75rem', fontWeight:700, color: upiApp===app.id ? '#528ff0' : '#1e293b' }}>
                            {app.id === 'gpay' ? '🟢 Google Pay' : app.id === 'phonepe' ? '🟣 PhonePe' : app.id === 'paytm' ? '🔵 Paytm' : '🇮🇳 BHIM'}
                          </div>
                        </button>
                      ))}
                    </div>

                    {upiApp && (
                      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                        <div style={{ fontSize:'0.78rem', color:'#15803d', fontWeight:700, marginBottom:4 }}>
                          Waiting for payment confirmation…
                        </div>
                        {timer !== null && (
                          <div style={{ fontSize:'0.68rem', color:'#64748b' }}>
                            Request expires in <strong>{Math.floor(timer/60)}:{String(timer%60).padStart(2,'0')}</strong> min
                          </div>
                        )}
                        <div style={{ marginTop:10, display:'flex', justifyContent:'center', gap:4 }}>
                          {[0,1,2].map(i => (
                            <div key={i} style={{
                              width:7, height:7, borderRadius:'50%', background:'#22c55e',
                              animation:`rzp-bounce 1.2s ${i*0.2}s ease-in-out infinite`,
                            }}/>
                          ))}
                        </div>
                        <style>{`@keyframes rzp-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize:'0.78rem', fontWeight:700, color:'#475569', display:'block', marginBottom:6 }}>
                      Enter UPI ID
                    </label>
                    <div style={{ position:'relative' }}>
                      <input value={upiId} onChange={e => setUpiId(e.target.value)}
                        placeholder="yourname@upi" {...inp()}
                      />
                    </div>
                    <p style={{ color:'#94a3b8', fontSize:'0.68rem', marginTop:6 }}>
                      Example: mobilenumber@upi, name@okaxis, name@paytm
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Card tab ── */}
            {tab === 'card' && (
              <div>
                {/* Visual card preview */}
                <div style={{
                  background:'linear-gradient(135deg,#1e3a5f,#2563eb)',
                  borderRadius:14, padding:'20px 22px', marginBottom:20, color:'#fff',
                  boxShadow:'0 8px 24px rgba(37,99,235,0.3)', position:'relative', overflow:'hidden',
                }}>
                  <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
                  <div style={{ position:'absolute', bottom:-30, right:20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
                  <div style={{ fontSize:'0.65rem', opacity:0.7, marginBottom:16, letterSpacing:2, textTransform:'uppercase' }}>Test Card</div>
                  <div style={{ fontFamily:'monospace', fontSize:'1.1rem', letterSpacing:4, marginBottom:16, fontWeight:700 }}>
                    {card.number || '•••• •••• •••• ••••'}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    <div>
                      <div style={{ fontSize:'0.6rem', opacity:0.6, textTransform:'uppercase', letterSpacing:1 }}>Card Holder</div>
                      <div style={{ fontWeight:700, fontSize:'0.85rem', marginTop:2 }}>{card.name || 'YOUR NAME'}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'0.6rem', opacity:0.6, textTransform:'uppercase', letterSpacing:1 }}>Expires</div>
                      <div style={{ fontWeight:700, fontSize:'0.85rem', marginTop:2 }}>{card.expiry || 'MM/YY'}</div>
                    </div>
                    <div style={{ fontSize:'2rem', opacity:0.9 }}>💳</div>
                  </div>
                </div>

                {/* Test hint */}
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'9px 12px', marginBottom:16, fontSize:'0.72rem', color:'#15803d' }}>
                  🧪 Use test card: <strong>4111 1111 1111 1111</strong> · Exp <strong>12/26</strong> · CVV <strong>123</strong>
                </div>

                {/* Card Number */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Card Number</label>
                  <input value={card.number} placeholder="1234 5678 9012 3456"
                    onChange={e => setCard(c => ({ ...c, number: fmt4(e.target.value) }))}
                    {...inp()} maxLength={19}
                  />
                </div>

                {/* Name */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Name on Card</label>
                  <input value={card.name} placeholder="As printed on card"
                    onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
                    {...inp()}
                  />
                </div>

                {/* Expiry + CVV */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Expiry Date</label>
                    <input value={card.expiry} placeholder="MM / YY"
                      onChange={e => setCard(c => ({ ...c, expiry: fmtExp(e.target.value) }))}
                      {...inp()} maxLength={5}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>
                      CVV
                      <span style={{ marginLeft:6, color:'#94a3b8', fontSize:'0.65rem', fontWeight:400 }}>
                        {showCvv ? '👁 hide' : ''}
                      </span>
                    </label>
                    <div style={{ position:'relative' }}>
                      <input value={card.cvv} placeholder="•••"
                        type={showCvv ? 'text' : 'password'}
                        onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                        {...inp({ paddingRight:40 })} maxLength={4}
                      />
                      <button onClick={() => setShowCvv(v => !v)}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'0.75rem' }}>
                        {showCvv ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Net Banking tab ── */}
            {tab === 'netbanking' && (
              <div>
                <p style={{ color:'#64748b', fontSize:'0.78rem', marginBottom:14 }}>Popular banks:</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                  {BANKS.map(b => (
                    <button key={b.code} onClick={() => { setBank(b.code); setError(''); }}
                      style={{
                        padding:'12px 10px', border:`2px solid ${bank===b.code ? '#528ff0' : '#e2e8f0'}`,
                        borderRadius:10, background: bank===b.code ? '#eff6ff' : '#fff',
                        cursor:'pointer', display:'flex', alignItems:'center', gap:10, textAlign:'left',
                        transition:'all 0.15s', boxShadow: bank===b.code ? '0 0 0 3px rgba(82,143,240,0.12)' : 'none',
                      }}>
                      <span style={{ fontSize:'1.3rem' }}>{b.logo}</span>
                      <span style={{ fontSize:'0.76rem', fontWeight: bank===b.code ? 700 : 500, color: bank===b.code ? '#528ff0' : '#1e293b', lineHeight:1.3 }}>
                        {b.name}
                      </span>
                      {bank===b.code && (
                        <span style={{ marginLeft:'auto', color:'#528ff0' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {bank && (
                  <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', fontSize:'0.78rem', color:'#1d4ed8' }}>
                    You'll be redirected to <strong>{BANKS.find(b=>b.code===bank)?.name}</strong> secure portal to complete payment.
                  </div>
                )}
              </div>
            )}

            {/* ── Wallet tab ── */}
            {tab === 'wallet' && (
              <div>
                <p style={{ color:'#64748b', fontSize:'0.78rem', marginBottom:14 }}>Select your wallet:</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { id:'paytm',   name:'Paytm Wallet',  emoji:'🔵', desc:'Instant payment' },
                    { id:'phonepe', name:'PhonePe Wallet', emoji:'🟣', desc:'UPI & wallet' },
                    { id:'amazon',  name:'Amazon Pay',     emoji:'🟡', desc:'Amazon balance' },
                    { id:'free',    name:'Freecharge',     emoji:'🟢', desc:'Recharge & pay' },
                    { id:'jio',     name:'JioMoney',       emoji:'🔴', desc:'Reliance wallet' },
                  ].map(w => (
                    <button key={w.id} onClick={() => { setWallet(w.id); setError(''); }}
                      style={{
                        display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
                        border:`2px solid ${wallet===w.id ? '#528ff0' : '#e2e8f0'}`,
                        borderRadius:10, background: wallet===w.id ? '#eff6ff' : '#fff',
                        cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                      }}>
                      <span style={{ fontSize:'1.5rem' }}>{w.emoji}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight: wallet===w.id ? 700 : 600, color: wallet===w.id ? '#528ff0' : '#1e293b', fontSize:'0.875rem' }}>{w.name}</div>
                        <div style={{ color:'#94a3b8', fontSize:'0.68rem' }}>{w.desc}</div>
                      </div>
                      {wallet===w.id && <span style={{ color:'#528ff0', fontWeight:900 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── EMI tab ── */}
            {tab === 'emi' && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <div style={{ fontSize:'3rem', marginBottom:16 }}>📆</div>
                <p style={{ fontWeight:700, color:'#1e293b', marginBottom:8 }}>EMI available on credit cards</p>
                <p style={{ color:'#64748b', fontSize:'0.8rem', marginBottom:16 }}>Switch to the Card tab, enter your credit card details, and EMI options will appear at checkout.</p>
                <button onClick={() => { setTab('card'); setError(''); }}
                  style={{ background:'#528ff0', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontWeight:700, cursor:'pointer', fontSize:'0.875rem', fontFamily:'inherit' }}>
                  Go to Card Payment →
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, padding:'9px 12px', fontSize:'0.78rem', marginTop:16, display:'flex', gap:8, alignItems:'center' }}>
                <span>⚠️</span> {error}
              </div>
            )}
          </div>

          {/* Pay button */}
          {tab !== 'emi' && (
            <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9', background:'#fff' }}>
              <button onClick={handlePay}
                style={{
                  width:'100%', padding:'13px', border:'none', borderRadius:10,
                  background:'linear-gradient(135deg,#1d4ed8,#528ff0)',
                  color:'#fff', fontWeight:800, fontSize:'0.95rem', cursor:'pointer',
                  fontFamily:'inherit', boxShadow:'0 4px 16px rgba(82,143,240,0.4)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  transition:'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}
              >
                <LockIcon />
                {payLabel()}
              </button>
              <p style={{ textAlign:'center', fontSize:'0.65rem', color:'#94a3b8', marginTop:8 }}>
                🔒 256-bit SSL encrypted · Secured by Razorpay
              </p>
            </div>
          )}
        </div>
      </Modal>
    </Overlay>
  );
}

/* ─── Layout Helpers ──────────────────────────────────────── */
function Overlay({ children, onClose }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'rgba(15,23,42,0.75)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'DM Sans',system-ui,sans-serif", padding:16,
    }} onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      {children}
    </div>
  );
}
function Modal({ children }) {
  return (
    <div style={{
      background:'#fff', borderRadius:16, width:'100%', maxWidth:700, maxHeight:'92vh',
      boxShadow:'0 24px 80px rgba(0,0,0,0.35)', overflow:'hidden',
      display:'flex', animation:'rzp-modal-in 0.22s cubic-bezier(0.34,1.4,0.64,1)',
    }}>
      <style>{`
        @keyframes rzp-modal-in { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
      {children}
    </div>
  );
}
