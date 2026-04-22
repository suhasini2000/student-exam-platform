import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/auth/profile/');
      const userData = res.data;
      // If photo is a relative path, prefix with API base
      if (userData.profile_photo && !userData.profile_photo.startsWith('http')) {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        userData.profile_photo = baseUrl.endsWith('/') 
          ? `${baseUrl}${userData.profile_photo.startsWith('/') ? userData.profile_photo.slice(1) : userData.profile_photo}`
          : `${baseUrl}${userData.profile_photo.startsWith('/') ? userData.profile_photo : '/' + userData.profile_photo}`;
        
        // Add cache buster
        userData.profile_photo += `?t=${Date.now()}`;
      }
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
    // Fetch profile and return user data
    const profileRes = await api.get('/api/auth/profile/');
    const userData = profileRes.data;
    if (userData.profile_photo && !userData.profile_photo.startsWith('http')) {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      userData.profile_photo = baseUrl.endsWith('/') 
        ? `${baseUrl}${userData.profile_photo.startsWith('/') ? userData.profile_photo.slice(1) : userData.profile_photo}`
        : `${baseUrl}${userData.profile_photo.startsWith('/') ? userData.profile_photo : '/' + userData.profile_photo}`;
    }
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
