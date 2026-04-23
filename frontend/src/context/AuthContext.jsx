import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatProfilePhoto = useCallback((userData) => {
    if (!userData || !userData.profile_photo) return userData;

    let url = userData.profile_photo;
    
    // 1. If it's already an absolute URL (like Cloudinary), don't touch it.
    // Cloudinary URLs usually start with 'http://res.cloudinary.com' or 'https://res.cloudinary.com'
    if (url.startsWith('http')) {
      // Just add a version/cache buster if it's not already there
      const separator = url.includes('?') ? '&' : '?';
      userData.profile_photo = `${url}${separator}t=${Date.now()}`;
      return userData;
    }

    // 2. If it's a relative path (starts with /media or similar), prefix with origin
    // This handles local development or cases where Cloudinary isn't used
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = url.startsWith('/') ? url : '/' + url;
    url = `${cleanBase}${cleanPath}`;
    
    // Add cache buster
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
