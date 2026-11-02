import {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);

  // Fetch the logged-in user's details.
  useEffect(() => {
    let active = true;

    const fetchUser = async () => {
      if (!token) {
        delete api.defaults.headers.common['Authorization'];

        setUser(null);
        setLoading(false);
        return;
      }

      api.defaults.headers.common['Authorization'] =
        `Bearer ${token}`;

      setLoading(true);

      try {
        const response = await api.get('/auth/me');

        if (!active) return;

        // Supports both { user: {...} } and direct user objects.
        const userData = response.data?.user ?? response.data;

        setUser(userData || null);
      } catch (error) {
        if (!active) return;

        console.error('Authentication error:', error);

        setUser(null);
        setToken(null);

        localStorage.removeItem('token');

        delete api.defaults.headers.common['Authorization'];
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      active = false;
    };
  }, [token]);

  // Login.
  const login = (userData, userToken) => {
    const authenticatedUser =
      userData?.user ?? userData;

    setUser(authenticatedUser || null);

    localStorage.setItem('token', userToken);

    api.defaults.headers.common['Authorization'] =
      `Bearer ${userToken}`;

    setToken(userToken);
  };

  // Logout.
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem('token');

    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access authentication details.
export const useAuth = () => {
  return useContext(AuthContext);
};
