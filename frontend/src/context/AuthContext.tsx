'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  token?: string;
  senders?: any[];
  slackConnection?: any;
}
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (googlePayload: { credential: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const savedUser = localStorage.getItem('reachinbox_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('reachinbox_user');
      }
    }
    setLoading(false);
  }, []);
  const loginWithGoogle = async (payload: { credential: string }) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/google', payload);
      const loggedUser = { ...res.data.user, token: res.data.token };
      setUser(loggedUser);
      localStorage.setItem('reachinbox_user', JSON.stringify(loggedUser));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
  };
  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get('/auth/me');
      if (res.data.user) {
        const refreshedUser = { ...res.data.user, token: user.token };
        setUser(refreshedUser);
        localStorage.setItem('reachinbox_user', JSON.stringify(refreshedUser));
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  };
  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, refreshUser }}>
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