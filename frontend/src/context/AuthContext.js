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

const NOTEPAD_STORAGE_PREFIX = 'materialViewerNotes:';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_image');
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(NOTEPAD_STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch (err) {
      // Ignore storage cleanup errors
    }
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
          userType: data.userType || decoded.userType || '',
          xp: data.xp ?? 0,
          badges: Array.isArray(data.badges) ? data.badges : [],
          streaks: data.streaks || null,
          dailyGoal: data.dailyGoal || null
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
      setUser,
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
