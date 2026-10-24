import { useState } from 'react';

export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`mt-1 w-full rounded-lg border border-gray-300 py-2 pl-3 pr-12 ${className}`} />
      <button type="button" onClick={() => setVisible(value => !value)}
        disabled={props.disabled} aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible} aria-controls={props.id}
        className="absolute inset-y-0 right-0 mt-1 flex w-11 items-center justify-center rounded-r-lg text-gray-500 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
