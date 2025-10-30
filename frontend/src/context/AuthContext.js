import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_image');
    setUser(null);
    setInitializing(false);
  }, []);

  const hydrate = useCallback(
    async (explicitToken) => {
      const token = explicitToken || localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setInitializing(false);
        return;
      }

      setInitializing(true);
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          clearSession();
          return;
        }

        const { data } = await api.get('/profile');
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          image: data.image,
          userType: data.userType || decoded.userType || ''
        });
      } catch (err) {
        clearSession();
      } finally {
        setInitializing(false);
      }
    },
    [clearSession]
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearSession();
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [clearSession]);

  const login = useCallback(
    async (token) => {
      localStorage.setItem('token', token);
      await hydrate(token);
    },
    [hydrate]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refresh = useCallback(() => hydrate(), [hydrate]);

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refresh
    }),
    [user, initializing, login, logout, refresh]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
