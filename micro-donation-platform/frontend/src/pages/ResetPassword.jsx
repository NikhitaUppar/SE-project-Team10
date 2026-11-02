import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PasswordInput from '../components/common/PasswordInput';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #FED7AA', background: '#FFF7ED',
  fontSize: '0.9rem', color: '#1C0A00', outline: 'none',
  boxSizing: 'border-box', marginTop: 6, fontFamily: 'inherit',
};

export default function ResetPassword() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { logout } = useAuth();
  const [token] = useState(() => (
    new URLSearchParams(location.hash.slice(1)).get('token') ||
    new URLSearchParams(location.search).get('token') || ''
  ));
  const [password, setPassword]         = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const validToken = /^[a-f0-9]{64}$/.test(token);

  useEffect(() => {
    if (location.hash || location.search) navigate('/reset-password', { replace: true });
  }, [location.hash, location.search, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError('Password must be at least 8 characters and no more than 72 bytes.'); return;
    }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      logout(); setPassword(''); setConfirmation(''); setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reset password. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px max(16px, env(safe-area-inset-left, 0px))', background: '#FFFAF5' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(194,65,12,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.5rem', fontWeight: 900, color: '#7C2D12', margin: '0 0 8px' }}>
            Reset your password
          </h2>
        </div>

        {!validToken ? (
          <div style={{ textAlign: 'center' }}>
            <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px', fontSize: '0.9rem' }}>
              This reset link is missing or invalid. Please request a new one.
            </p>
            <Link to="/forgot-password" style={{ display: 'inline-block', marginTop: 16, color: '#EA580C', fontWeight: 700, fontSize: '0.875rem' }}>
              Request new link →
            </Link>
          </div>
        ) : success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#14532D', borderRadius: 10, padding: '16px', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {success}
            </div>
            <Link to="/login" style={{ display: 'inline-block', marginTop: 20, background: 'linear-gradient(135deg,#C2410C,#EA580C)', color: '#fff', textDecoration: 'none', padding: '10px 28px', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem' }}>
              Log in →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="password" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>New password</label>
              <PasswordInput id="password" autoComplete="new-password" required minLength={8}
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              />
              <p style={{ fontSize: '0.75rem', color: '#A16207', marginTop: 4 }}>At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirmation" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#78350F', display: 'block' }}>Confirm new password</label>
              <PasswordInput id="confirmation" autoComplete="new-password" required minLength={8}
                value={confirmation} onChange={e => setConfirmation(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
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
              {submitting ? 'Updating…' : 'Update password →'}
            </button>

            <Link to="/forgot-password" style={{ textAlign: 'center', color: '#A16207', fontSize: '0.82rem', fontWeight: 600 }}>
              Request a new reset link
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
