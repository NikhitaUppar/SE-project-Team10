import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to request a reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800">Forgot your password?</h2>
      <p className="mt-2 text-gray-500">Enter your account email to request a password reset link.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254}
            value={email} onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        <button type="submit" disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {submitting ? 'Requesting link...' : 'Send reset link'}
        </button>
      </form>
      <Link to="/login" className="mt-5 inline-block text-sm text-indigo-600 hover:underline">Back to login</Link>
    </div>
  );
}
