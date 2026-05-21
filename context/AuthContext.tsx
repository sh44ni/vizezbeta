'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trackEvent } from '@/lib/analytics';

export interface VizUser {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextValue {
  user: VizUser | null;
  isAdmin: boolean;
  requestOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const STORAGE_KEY = 'vizez_session';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  requestOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VizUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate session from localStorage
  useEffect(() => {
    try {
      const sess = localStorage.getItem(STORAGE_KEY);
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed.day === todayKey()) {
          setUser({ name: parsed.name, email: parsed.email, role: parsed.role });
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  const requestOtp = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to send code' };
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Verification failed' };
      
      const loggedIn: VizUser = {
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };
      setUser(loggedIn);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...loggedIn,
          day: todayKey(),
        }));
      } catch {}
      
      // Track login event
      trackEvent('login', {
        user_email: loggedIn.email,
        user_name: loggedIn.name,
        metadata: { role: loggedIn.role },
      });
      
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    // Track logout event before clearing user
    if (user) {
      trackEvent('logout', {
        user_email: user.email,
        user_name: user.name,
      });
    }
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, [user]);

  const isAdmin = user?.role === 'admin';

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ user, isAdmin, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
