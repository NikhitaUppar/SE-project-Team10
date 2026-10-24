import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import PasswordInput from '../components/common/PasswordInput';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [step, setStep] = useState('email');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  const sendCode = async () => {
    setError('');
    setNotice('');
    if (!displayName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your name and a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/signup/send-code', { display_name: displayName.trim(), email: email.trim() });
      setStep('code');
      setCode('');
      setVerificationToken('');
      setResendAt(Date.now() + data.resend_after * 1000);
      setNotice(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to send code. Please try again.');
      const wait = Number(requestError.response?.headers?.['retry-after']);
      if (wait > 0) setResendAt(Date.now() + wait * 1000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (step === 'email') return sendCode();
    setError('');
    setNotice('');
    if (step === 'code' && !/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your inbox.');
      return;
    }
    if (step === 'password' && (password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      setError('Password must be at least 8 characters and no more than 72 bytes.');
      return;
    }
    setSubmitting(true);
    try {
      if (step === 'code') {
        const { data } = await api.post('/auth/signup/verify-code', { email: email.trim(), code });
        setVerificationToken(data.verification_token);
        setCode('');
        setStep('password');
        setNotice(data.message);
      } else {
        const { data } = await api.post('/auth/signup/complete', { email: email.trim(), verification_token: verificationToken, password });
        setPassword('');
        setVerificationToken('');
        setStep('success');
        setNotice(data.message);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to continue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeDetails = () => {
    setStep('email');
    setVerificationToken('');
    setPassword('');
    setCode('');
    setError('');
    setNotice('');
    setResendAt(0);
    setSeconds(0);
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 read-only:bg-gray-50 read-only:text-gray-600';
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800">Create your account</h2>
      <p className="text-gray-500 mt-2">Verify your email, then choose your password.</p>
      {step !== 'success' && (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">Display name</label>
            <input id="display-name" name="display_name" autoComplete="name" required maxLength={100}
              value={displayName} onChange={event => setDisplayName(event.target.value)}
              readOnly={step !== 'email'} disabled={submitting} className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254}
              value={email} onChange={event => setEmail(event.target.value)}
              readOnly={step !== 'email'} disabled={submitting} className={inputClass} />
          </div>
          {step === 'code' && (
            <div>
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">Verification code</label>
              <input id="verification-code" name="code" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus
                value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={submitting} className={`${inputClass} text-center text-xl tracking-[0.4em]`} />
              <p className="mt-1 text-xs text-gray-500">Enter the 6-digit code from your inbox. It expires in 5 minutes.</p>
              <button type="button" onClick={sendCode} disabled={submitting || seconds > 0}
                className="mt-2 text-sm text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline">
                {seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}
              </button>
            </div>
          )}
          {step === 'password' && (
            <div>
              <p className="mb-3 text-sm font-medium text-green-700">Email verified ✓</p>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Choose a password</label>
              <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8}
                required autoFocus disabled={submitting} value={password} onChange={event => setPassword(event.target.value)} />
              <p className="mt-1 text-xs text-gray-500">At least 8 characters; maximum 72 bytes.</p>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
          <button type="submit" disabled={submitting || (step === 'email' && seconds > 0)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {submitting ? 'Please wait…' : step === 'email' ? 'Send verification code' : step === 'code' ? 'Verify code' : 'Create account'}
          </button>
          {step === 'email' && seconds > 0 && <p className="text-xs text-gray-500">You can request another code in {seconds}s.</p>}
          {step !== 'email' && <button type="button" onClick={changeDetails} disabled={submitting}
            className="text-sm text-indigo-600 hover:underline">Change name or email</button>}
        </form>
      )}
      {step === 'success' && <p role="status" className="mt-6 text-green-700">{notice}</p>}
      <p className="mt-5 text-center text-sm text-gray-600">
        {step === 'success' ? 'Ready to continue? ' : 'Already have an account? '}
        <Link to="/login" className="text-indigo-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
