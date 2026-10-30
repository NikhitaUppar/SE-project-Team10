import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #FED7AA', background: '#FFF7ED',
  fontSize: '0.9rem', color: '#1C0A00', outline: 'none',
  boxSizing: 'border-box', marginTop: 6, fontFamily: 'inherit',
};

export default function ForgotPassword() {
  const [email, setEmail]         = useState('');
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to request a reset link. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px max(16px, env(safe-area-inset-left, 0px))', background: '#FFFAF5' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(194,65,12,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>🔑</div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.5rem', fontWeight: 900, color: '#7C2D12', margin: '0 0 8px' }}>
            Forgot your password?
          </h2>
          <p style={{ color: '#A16207', fontSize: '0.875rem', margin: 0 }}>
            Enter your account email and we'll send you a reset link.
          </p>
        </div>

        {message ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#14532D', borderRadius: 10, padding: '16px', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.6 }}>
              {message}
            </div>
            <Link to="/login" style={{ display: 'inline-block', marginTop: 20, color: '#EA580C', fontWeight: 700, fontSize: '0.875rem' }}>
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="email" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>Email</label>
              <input id="email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#EA580C'}
                onBlur={e => e.target.style.borderColor = '#FED7AA'}
              />
            </div>

            {error && <p role="alert" style={{ color: '#B91C1C', fontSize: '0.82rem', margin: 0, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>{error}</p>}

            <button type="submit" disabled={submitting} style={{
              background: submitting ? '#FCA5A5' : 'linear-gradient(135deg,#C2410C,#EA580C)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px', fontWeight: 800, fontSize: '0.95rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(194,65,12,0.25)', fontFamily: 'inherit',
            }}>
              {submitting ? 'Sending…' : 'Send reset link →'}
            </button>

            <Link to="/login" style={{ textAlign: 'center', color: '#A16207', fontSize: '0.82rem', fontWeight: 600 }}>
              ← Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
