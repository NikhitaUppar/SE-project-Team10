import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!token) {
      delete api.defaults.headers.common['Authorization'];
      setLoading(false);
      return;
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setLoading(true);
    api.get('/auth/me')
      .then(({ data }) => { if (active) setUser(data.user); })
      .catch(() => {
        if (active) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
