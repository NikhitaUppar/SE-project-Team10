import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => (
    new URLSearchParams(location.hash.slice(1)).get('token') ||
    new URLSearchParams(location.search).get('token') || ''
  ));
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Remove the token from the address bar without discarding component state.
    if (location.hash || location.search) navigate('/verify-email', { replace: true });
  }, [location.hash, location.search, navigate]);

  const handleVerify = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.get(`/auth/verify/${encodeURIComponent(token)}`);
      setSuccess(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to verify email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800">Verify your email</h2>
      {!validToken ? (
        <p role="alert" className="mt-4 text-red-600">This verification link is missing or invalid. Open the link from your email.</p>
      ) : success ? (
        <p role="status" className="mt-4 text-green-700">{success}</p>
      ) : (
        <>
          <p className="mt-4 text-gray-600">Confirm your email to finish setting up your account.</p>
          {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
          <button type="button" onClick={handleVerify} disabled={submitting}
            className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {submitting ? 'Verifying...' : 'Verify my email'}
          </button>
        </>
      )}
      <p className="mt-5 text-sm text-gray-600">
        <Link to="/login" className="text-indigo-600 hover:underline">Go to login</Link>
        {!success && ' to request a new verification email using your email and password.'}
      </p>
    </div>
  );
}
