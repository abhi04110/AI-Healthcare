import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { getStoredToken, registerUnauthorizedHandler, setStoredToken } from '@/lib/api';
import { getRoleHomePath } from '@/config/roles';
import type { UserResponse } from '@/types/api';
import { useToast } from './ToastContext';

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserResponse>;
  registerPatient: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const toast = useToast();

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await authService.getMe();
      setUser(profile);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
      toast.error('Session expired', 'Please sign in again to continue.');
      navigate('/login', { replace: true });
    });
  }, [navigate, toast]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokenRes = await authService.login(email, password);
      setStoredToken(tokenRes.access_token);
      const profile = await authService.getMe();
      setUser(profile);
      toast.success(`Welcome back, ${profile.name}`, `Signed in as ${profile.role.replace(/_/g, ' ')}`);
      navigate(getRoleHomePath(profile.role), { replace: true });
      return profile;
    },
    [navigate, toast],
  );

  const registerPatient = useCallback(
    async (name: string, email: string, password: string) => {
      await authService.registerPatient(name, email, password);
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    toast.info('Signed out', 'Your clinical session has ended.');
    navigate('/login', { replace: true });
  }, [navigate, toast]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, registerPatient, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

