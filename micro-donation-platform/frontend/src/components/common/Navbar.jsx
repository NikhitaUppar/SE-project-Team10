import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-600">
          💙 MicroDonate
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/campaigns" className="text-gray-600 hover:text-indigo-600">Browse</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600">Dashboard</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-indigo-600">Admin</Link>
              )}
              <button onClick={handleLogout} className="text-gray-600 hover:text-red-500">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-indigo-600">Login</Link>
              <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
