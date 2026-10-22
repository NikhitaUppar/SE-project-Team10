import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [token] = useState(() => (
    new URLSearchParams(location.hash.slice(1)).get('token') ||
    new URLSearchParams(location.search).get('token') || ''
  ));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const validToken = /^[a-f0-9]{64}$/.test(token);

  useEffect(() => {
    // Keep the secret in component memory, not the address bar/history entry.
    if (location.hash || location.search) navigate('/reset-password', { replace: true });
  }, [location.hash, location.search, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError('Password must be at least 8 characters and no more than 72 bytes.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      logout();
      setPassword('');
      setConfirmation('');
      setSuccess(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800">Reset your password</h2>
      {!validToken ? (
        <p role="alert" className="mt-4 text-red-600">This reset link is missing or invalid. Please request a new link.</p>
      ) : success ? (
        <p role="status" className="mt-4 text-green-700">{success}</p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">New password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8}
              value={password} onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            <p className="mt-1 text-xs text-gray-500">At least 8 characters; maximum 72 bytes.</p>
          </div>
          <div>
            <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700">Confirm new password</label>
            <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={8}
              value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {submitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      )}
      <p className="mt-5 text-sm">
        <Link to={success ? '/login' : '/forgot-password'} className="text-indigo-600 hover:underline">
          {success ? 'Go to login' : 'Request a new reset link'}
        </Link>
      </p>
    </div>
  );
}
