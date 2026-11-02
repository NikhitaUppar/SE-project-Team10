import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import PasswordInput from '../components/common/PasswordInput';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #FED7AA', background: '#FFF7ED',
  fontSize: '0.9rem', color: '#1C0A00', outline: 'none',
  boxSizing: 'border-box', marginTop: 6, fontFamily: 'inherit',
};
const readOnlyStyle = { ...inputStyle, background: '#F5F0EB', color: '#78350F', cursor: 'not-allowed' };

const STEPS = { email: 1, code: 2, password: 3, success: 4 };
const STEP_LABELS = ['Your info', 'Verify email', 'Set password', 'Done'];

export default function Register() {
  const [displayName, setDisplayName]         = useState('');
  const [email, setEmail]                     = useState('');
  const [code, setCode]                       = useState('');
  const [password, setPassword]               = useState('');
  const [verificationToken, setVToken]        = useState('');
  const [step, setStep]                       = useState('email');
  const [error, setError]                     = useState('');
  const [notice, setNotice]                   = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [resendAt, setResendAt]               = useState(0);
  const [seconds, setSeconds]                 = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [resendAt]);

  const sendCode = async () => {
    setError(''); setNotice('');
    if (!displayName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your name and a valid email address.'); return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/signup/send-code', { display_name: displayName.trim(), email: email.trim() });
      setStep('code'); setCode(''); setVToken('');
      setResendAt(Date.now() + data.resend_after * 1000);
      setNotice(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send code. Please try again.');
      const wait = Number(err.response?.headers?.['retry-after']);
      if (wait > 0) setResendAt(Date.now() + wait * 1000);
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 'email') return sendCode();
    setError(''); setNotice('');
    if (step === 'code' && !/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your inbox.'); return; }
    if (step === 'password' && (password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      setError('Password must be at least 8 characters and no more than 72 bytes.'); return;
    }
    setSubmitting(true);
    try {
      if (step === 'code') {
        const { data } = await api.post('/auth/signup/verify-code', { email: email.trim(), code });
        setVToken(data.verification_token); setCode(''); setStep('password'); setNotice(data.message);
      } else {
        const { data } = await api.post('/auth/signup/complete', { email: email.trim(), verification_token: verificationToken, password });
        setPassword(''); setVToken(''); setStep('success'); setNotice(data.message);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to continue. Please try again.');
    } finally { setSubmitting(false); }
  };

  const changeDetails = () => {
    setStep('email'); setVToken(''); setPassword(''); setCode('');
    setError(''); setNotice(''); setResendAt(0); setSeconds(0);
  };

  const stepNum = STEPS[step] || 1;

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex' }}>
      {/* Brand panel */}
      <div style={{
        width: '45%', background: 'linear-gradient(160deg,#7C2D12,#C2410C,#EA580C)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '48px 40px',
      }} className="auth-brand-panel">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🌱</div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.9rem', fontWeight: 900, color: '#fff', margin: '0 0 12px', textWrap: 'balance' }}>
            Join the movement.
          </h2>
          <p style={{ color: '#FEF3C7', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 280 }}>
            Thousands of donors are already changing lives with micro-donations. Start with just ₹1.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px', textAlign: 'left', maxWidth: 280 }}>
            <p style={{ color: '#FEF3C7', fontSize: '0.8rem', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              "I donated ₹100 last month and watched the campaign hit its goal. It felt amazing."
            </p>
            <p style={{ color: '#FBB77E', fontSize: '0.72rem', marginTop: 8, fontWeight: 600 }}>— A donor from Bengaluru</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px max(16px, env(safe-area-inset-right, 0px))', background: '#FFFAF5' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.6rem', fontWeight: 900, color: '#7C2D12', margin: '0 0 6px' }}>
            Create your account
          </h2>
          <p style={{ color: '#A16207', fontSize: '0.875rem', margin: '0 0 24px' }}>
            Already have one? <Link to="/login" style={{ color: '#EA580C', fontWeight: 700 }}>Log in</Link>
          </p>

          {/* Step indicator */}
          {step !== 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28 }}>
              {STEP_LABELS.slice(0, 3).map((label, i) => {
                const n = i + 1;
                const done = stepNum > n;
                const active = stepNum === n;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800,
                        background: done ? '#C2410C' : active ? 'linear-gradient(135deg,#C2410C,#EA580C)' : '#FED7AA',
                        color: done || active ? '#fff' : '#A16207',
                        boxShadow: active ? '0 2px 8px rgba(194,65,12,0.3)' : 'none',
                      }}>
                        {done ? '✓' : n}
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: active ? '#C2410C' : '#A16207', whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                    {i < 2 && <div style={{ flex: 1, height: 2, background: done ? '#C2410C' : '#FED7AA', margin: '0 4px', marginBottom: 20 }} />}
                  </div>
                );
              })}
            </div>
          )}

          {step !== 'success' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label htmlFor="display-name" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>Display name</label>
                <input id="display-name" autoComplete="name" required maxLength={100}
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  readOnly={step !== 'email'} disabled={submitting}
                  style={step !== 'email' ? readOnlyStyle : inputStyle}
                  onFocus={e => { if (step === 'email') e.target.style.borderColor = '#EA580C'; }}
                  onBlur={e => e.target.style.borderColor = '#FED7AA'}
                />
              </div>
              <div>
                <label htmlFor="email" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>Email</label>
                <input id="email" type="email" autoComplete="email" required maxLength={254}
                  value={email} onChange={e => setEmail(e.target.value)}
                  readOnly={step !== 'email'} disabled={submitting}
                  style={step !== 'email' ? readOnlyStyle : inputStyle}
                  onFocus={e => { if (step === 'email') e.target.style.borderColor = '#EA580C'; }}
                  onBlur={e => e.target.style.borderColor = '#FED7AA'}
                />
              </div>

              {step === 'code' && (
                <div>
                  <label htmlFor="verification-code" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>6-digit code</label>
                  <input id="verification-code" inputMode="numeric" autoComplete="one-time-code"
                    pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus
                    value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    disabled={submitting}
                    style={{ ...inputStyle, textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.4em', fontWeight: 800 }}
                    onFocus={e => e.target.style.borderColor = '#EA580C'}
                    onBlur={e => e.target.style.borderColor = '#FED7AA'}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#A16207', marginTop: 6 }}>Check your inbox. Expires in 5 minutes.</p>
                  <button type="button" onClick={sendCode} disabled={submitting || seconds > 0}
                    style={{ fontSize: '0.8rem', color: seconds > 0 ? '#A16207' : '#EA580C', background: 'none', border: 'none', cursor: seconds > 0 ? 'not-allowed' : 'pointer', padding: '4px 0', fontFamily: 'inherit', fontWeight: 600 }}>
                    {seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
                  </button>
                </div>
              )}

              {step === 'password' && (
                <div>
                  <p style={{ color: '#14532D', fontSize: '0.82rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', margin: '0 0 8px' }}>
                    ✅ Email verified!
                  </p>
                  <label htmlFor="password" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>Choose a password</label>
                  <PasswordInput id="password" autoComplete="new-password" minLength={8} required autoFocus
                    disabled={submitting} value={password} onChange={e => setPassword(e.target.value)}
                    style={{ ...inputStyle, marginTop: 6 }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#A16207', marginTop: 6 }}>At least 8 characters.</p>
                </div>
              )}

              {error  && <p role="alert"  style={{ color: '#B91C1C', fontSize: '0.82rem', margin: 0, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>{error}</p>}
              {notice && <p role="status" style={{ color: '#92400E', fontSize: '0.82rem', margin: 0, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 12px' }}>{notice}</p>}

              <button type="submit" disabled={submitting || (step === 'email' && seconds > 0)} style={{
                background: (submitting || (step === 'email' && seconds > 0)) ? '#FCA5A5' : 'linear-gradient(135deg,#C2410C,#EA580C)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px', fontWeight: 800, fontSize: '0.95rem',
                cursor: (submitting || (step === 'email' && seconds > 0)) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(194,65,12,0.25)', fontFamily: 'inherit',
              }}>
                {submitting ? 'Please wait…' : step === 'email' ? 'Send verification code →' : step === 'code' ? 'Verify code →' : 'Create account →'}
              </button>

              {step !== 'email' && (
                <button type="button" onClick={changeDetails} disabled={submitting}
                  style={{ fontSize: '0.8rem', color: '#EA580C', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  ← Change name or email
                </button>
              )}
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
              <p role="status" style={{ color: '#14532D', fontSize: '1rem', fontWeight: 600, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 18px' }}>{notice}</p>
              <Link to="/login" style={{
                display: 'inline-block', marginTop: 20,
                background: 'linear-gradient(135deg,#C2410C,#EA580C)',
                color: '#fff', textDecoration: 'none',
                padding: '10px 28px', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem',
              }}>Log in now →</Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) { .auth-brand-panel { display: none !important; } }
      `}</style>
    </div>
  );
}
