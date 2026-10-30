import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PasswordInput from '../components/common/PasswordInput';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #FED7AA', background: '#FFF7ED',
  fontSize: '0.9rem', color: '#1C0A00', outline: 'none',
  boxSizing: 'border-box', marginTop: 6, fontFamily: 'inherit',
};

export default function Login() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [notice, setNotice]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      login(data.user, data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleResend = async () => {
    setError(''); setNotice('');
    if (!email.trim() || !password) { setError('Enter your email and password to resend verification.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/resend-verification', { email: email.trim(), password });
      setNotice(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to resend verification email. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex' }}>
      {/* Brand panel */}
      <div style={{
        width: '45%', background: 'linear-gradient(160deg,#7C2D12,#C2410C,#EA580C)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '48px 40px', gap: 32,
      }} className="auth-brand-panel">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🧡</div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.9rem', fontWeight: 900, color: '#fff', margin: '0 0 12px', textWrap: 'balance' }}>
            Welcome back.
          </h2>
          <p style={{ color: '#FEF3C7', fontSize: '0.95rem', lineHeight: 1.6, margin: 0, maxWidth: 280 }}>
            Every time you log in, someone's campaign gets closer to its goal.
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: 280 }}>
          {[
            { icon: '🔒', text: 'Secure payments via Razorpay' },
            { icon: '📊', text: 'Track your donation history' },
            { icon: '🤝', text: 'Support verified causes' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
              <span style={{ color: '#FEF3C7', fontSize: '0.85rem', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px max(16px, env(safe-area-inset-right, 0px))', background: '#FFFAF5' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.6rem', fontWeight: 900, color: '#7C2D12', margin: '0 0 6px' }}>
            Log in
          </h2>
          <p style={{ color: '#A16207', fontSize: '0.875rem', margin: '0 0 28px' }}>
            Don't have an account? <Link to="/register" style={{ color: '#EA580C', fontWeight: 700 }}>Sign up free</Link>
          </p>

          {searchParams.get('verified') === '1' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#14532D', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '0.85rem' }}>
              ✅ Email verified. Log in to continue.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="email" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>Email</label>
              <input id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#EA580C'}
                onBlur={e => e.target.style.borderColor = '#FED7AA'}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F' }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: '#EA580C', fontWeight: 600 }}>Forgot?</Link>
              </div>
              <PasswordInput id="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>

            {error  && <p role="alert"  style={{ color: '#B91C1C', fontSize: '0.82rem', margin: 0, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>{error}</p>}
            {notice && <p role="status" style={{ color: '#14532D', fontSize: '0.82rem', margin: 0, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>{notice}</p>}

            <button type="submit" disabled={submitting} style={{
              background: submitting ? '#FCA5A5' : 'linear-gradient(135deg,#C2410C,#EA580C)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px', fontWeight: 800, fontSize: '0.95rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(194,65,12,0.3)',
              fontFamily: 'inherit',
            }}>
              {submitting ? 'Logging in…' : 'Log in →'}
            </button>
          </form>

          <button type="button" onClick={handleResend} disabled={submitting}
            style={{ marginTop: 16, fontSize: '0.8rem', color: '#EA580C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
            Resend verification email
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) { .auth-brand-panel { display: none !important; } }
      `}</style>
    </div>
  );
}
