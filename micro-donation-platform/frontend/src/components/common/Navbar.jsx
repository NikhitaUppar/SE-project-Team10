import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    fontSize: '0.875rem',
    fontWeight: 600,
    color: isActive(path) ? '#C2410C' : '#78350F',
    textDecoration: 'none',
    padding: '6px 2px',
    borderBottom: isActive(path) ? '2px solid #C2410C' : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  });

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #FED7AA',
      boxShadow: '0 1px 8px rgba(194,65,12,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 max(16px, env(safe-area-inset-left, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #C2410C, #EA580C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem',
          }}>🧡</span>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 900,
            fontSize: '1.1rem',
            color: '#7C2D12',
            letterSpacing: '-0.01em',
          }}>MicroDonate</span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden-mobile">
          <Link to="/campaigns" style={linkStyle('/campaigns')}>Browse</Link>
          {user && <Link to="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link>}
          {user?.role === 'admin' && <Link to="/admin" style={linkStyle('/admin')}>Admin</Link>}
        </div>

        {/* Desktop auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hidden-mobile">
          {user ? (
            <>
              <span style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 500 }}>
                Hi, {user.display_name?.split(' ')[0] || 'there'} 👋
              </span>
              <button onClick={handleLogout} style={{
                fontSize: '0.875rem', fontWeight: 600,
                color: '#92400E', background: 'none', border: 'none',
                cursor: 'pointer', padding: '6px 12px',
                borderRadius: 8, transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                fontSize: '0.875rem', fontWeight: 600, color: '#92400E',
                textDecoration: 'none', padding: '6px 14px', borderRadius: 8,
              }}>Log in</Link>
              <Link to="/register" style={{
                fontSize: '0.875rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #C2410C, #EA580C)',
                color: '#fff', textDecoration: 'none',
                padding: '8px 18px', borderRadius: 8,
                boxShadow: '0 2px 8px rgba(194,65,12,0.3)',
              }}>Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(m => !m)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'none' }}
          className="show-mobile"
          aria-label="Toggle menu"
        >
          <div style={{ width: 22, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ height: 2, background: '#7C2D12', borderRadius: 2, display: 'block',
                transform: menuOpen && i === 0 ? 'rotate(45deg) translate(5px,5px)' :
                           menuOpen && i === 1 ? 'scaleX(0)' :
                           menuOpen && i === 2 ? 'rotate(-45deg) translate(5px,-5px)' : 'none',
                transition: 'transform 0.2s',
              }} />
            ))}
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          borderTop: '1px solid #FED7AA', background: '#FFF7ED',
          padding: '16px max(16px, env(safe-area-inset-left, 0px))',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {[
            { to: '/campaigns', label: 'Browse Campaigns' },
            ...(user ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
            ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
          ].map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{
              padding: '10px 12px', borderRadius: 8, fontWeight: 600,
              fontSize: '0.9rem', color: '#7C2D12', textDecoration: 'none',
              background: isActive(to) ? '#FED7AA' : 'transparent',
            }}>
              {label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid #FED7AA', marginTop: 8, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {user ? (
              <button onClick={handleLogout} style={{
                padding: '10px 12px', borderRadius: 8, fontWeight: 600,
                fontSize: '0.9rem', color: '#C2410C', background: 'none',
                border: '1px solid #FCA88D', cursor: 'pointer', textAlign: 'left',
              }}>
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} style={{
                  padding: '10px 12px', borderRadius: 8, fontWeight: 600,
                  fontSize: '0.9rem', color: '#7C2D12', textDecoration: 'none',
                  border: '1px solid #FED7AA', textAlign: 'center',
                }}>Log in</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} style={{
                  padding: '10px 12px', borderRadius: 8, fontWeight: 700,
                  fontSize: '0.9rem', color: '#fff', textDecoration: 'none',
                  background: 'linear-gradient(135deg, #C2410C, #EA580C)', textAlign: 'center',
                }}>Sign Up Free</Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
