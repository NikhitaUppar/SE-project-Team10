import { useState } from 'react';

export default function PasswordInput({ style: styleProp = {}, ...props }) {
  const [visible, setVisible] = useState(false);

  const baseStyle = {
    width: '100%', padding: '10px 44px 10px 14px', borderRadius: 10,
    border: '1.5px solid #FED7AA', background: '#FFF7ED',
    fontSize: '0.9rem', color: '#1C0A00', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    ...styleProp,
  };

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <input {...props} type={visible ? 'text' : 'password'} style={baseStyle}
        onFocus={e => { e.target.style.borderColor = '#EA580C'; if (props.onFocus) props.onFocus(e); }}
        onBlur={e => { e.target.style.borderColor = '#FED7AA'; if (props.onBlur) props.onBlur(e); }}
      />
      <button type="button" onClick={() => setVisible(v => !v)}
        disabled={props.disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible} aria-controls={props.id}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 42,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#A16207',
        }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 18, height: 18 }}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
