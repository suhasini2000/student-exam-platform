import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatProfilePhoto = useCallback((userData) => {
    if (!userData || !userData.profile_photo) return userData;

    // Backend now returns absolute URIs.
    // Just add a cache buster to force refresh on updates.
    const url = userData.profile_photo;
    const separator = url.includes('?') ? '&' : '?';
    userData.profile_photo = `${url}${separator}t=${Date.now()}`;
    
    return userData;
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/auth/profile/');
      const userData = formatProfilePhoto(res.data);
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login/', { username, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    
    const profileRes = await api.get('/api/auth/profile/');
    const userData = formatProfilePhoto(profileRes.data);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await api.post('/api/auth/register/', data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'school': return user.org_type === 'coaching' ? '/coaching/dashboard' : '/school/dashboard';
      case 'teacher': return '/teacher/dashboard';
      default: return '/dashboard';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchProfile, getDashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
