import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmail() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [token] = useState(() => (
    new URLSearchParams(location.hash.slice(1)).get('token') ||
    new URLSearchParams(location.search).get('token') || ''
  ));
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    if (location.hash || location.search) navigate('/verify-email', { replace: true });
  }, [location.hash, location.search, navigate]);

  const handleVerify = async () => {
    setSubmitting(true); setError('');
    try {
      const { data } = await api.get(`/auth/verify/${encodeURIComponent(token)}`);
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to verify email. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px max(16px, env(safe-area-inset-left, 0px))', background: '#FFFAF5' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(194,65,12,0.08)', textAlign: 'center' }}>
        <div style={{ fontSize: '2.8rem', marginBottom: 16 }}>
          {success ? '✅' : error ? '❌' : '📧'}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.5rem', fontWeight: 900, color: '#7C2D12', margin: '0 0 16px' }}>
          Verify your email
        </h2>

        {!validToken ? (
          <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px', fontSize: '0.9rem' }}>
            This verification link is missing or invalid. Open the link from your email.
          </p>
        ) : success ? (
          <div>
            <p role="status" style={{ color: '#14532D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {success}
            </p>
            <Link to="/login?verified=1" style={{ display: 'inline-block', marginTop: 20, background: 'linear-gradient(135deg,#C2410C,#EA580C)', color: '#fff', textDecoration: 'none', padding: '10px 28px', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem' }}>
              Log in now →
            </Link>
          </div>
        ) : (
          <div>
            <p style={{ color: '#92400E', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
              Confirm your email to finish setting up your account.
            </p>
            {error && (
              <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px', fontSize: '0.85rem', marginBottom: 16 }}>
                {error}
              </p>
            )}
            <button type="button" onClick={handleVerify} disabled={submitting} style={{
              background: submitting ? '#FCA5A5' : 'linear-gradient(135deg,#C2410C,#EA580C)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 32px', fontWeight: 800, fontSize: '0.95rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(194,65,12,0.25)', fontFamily: 'inherit',
            }}>
              {submitting ? 'Verifying…' : 'Verify my email →'}
            </button>
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: '0.82rem', color: '#A16207' }}>
          <Link to="/login" style={{ color: '#EA580C', fontWeight: 700 }}>Go to login</Link>
          {!success && ' to request a new verification email.'}
        </p>
      </div>
    </div>
  );
}
