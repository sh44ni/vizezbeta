'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

/* ─── Types ─── */
export interface VizUser {
  name: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextValue {
  user: VizUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  users: VizUser[];
  refreshUsers: () => Promise<void>;
  addUser: (u: { name: string; username: string; password: string }) => Promise<boolean>;
  deleteUser: (username: string) => Promise<void>;
}

/* ─── Hardcoded fallback admin (used when DB is unreachable) ─── */
const FALLBACK_ADMIN: VizUser = { name: 'Zeeshan', username: 'zee', role: 'admin' };
const FALLBACK_ADMIN_PW = 'zee431#';

const STORAGE_KEY_SESSION = 'vizez_session';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ─── Context ─── */
const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  login: async () => false,
  logout: () => {},
  users: [],
  refreshUsers: async () => {},
  addUser: async () => false,
  deleteUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<VizUser[]>([]);
  const [user, setUser] = useState<VizUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Fetch users from DB
  const refreshUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users.map((u: Record<string, string>) => ({
          name: u.name,
          username: u.username,
          role: u.role as 'admin' | 'user',
        })));
      }
    } catch {
      // If DB unreachable, ensure at least the admin is available
      setUsers([FALLBACK_ADMIN]);
    }
  }, []);

  // Hydrate: restore session + load users
  useEffect(() => {
    const init = async () => {
      await refreshUsers();

      // Check for existing session
      try {
        const sess = localStorage.getItem(STORAGE_KEY_SESSION);
        if (sess) {
          const parsed = JSON.parse(sess) as { username: string; name: string; role: string; day: string };
          if (parsed.day === todayKey()) {
            setUser({ name: parsed.name, username: parsed.username, role: parsed.role as 'admin' | 'user' });
          } else {
            localStorage.removeItem(STORAGE_KEY_SESSION);
          }
        }
      } catch {}
      setHydrated(true);
    };
    init();
  }, [refreshUsers]);

  // Login via DB API
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (data.user) {
        const loggedIn: VizUser = {
          name: data.user.name,
          username: data.user.username,
          role: data.user.role as 'admin' | 'user',
        };
        setUser(loggedIn);
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
            username: loggedIn.username,
            name: loggedIn.name,
            role: loggedIn.role,
            day: todayKey(),
          }));
        } catch {}
        return true;
      }
    } catch {
      // Ignored: network error or invalid JSON
    }

    // Fallback: if DB is down or admin user is not in the database yet
    if (username === FALLBACK_ADMIN.username && password === FALLBACK_ADMIN_PW) {
      setUser(FALLBACK_ADMIN);
      try {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
          username: FALLBACK_ADMIN.username,
          name: FALLBACK_ADMIN.name,
          role: FALLBACK_ADMIN.role,
          day: todayKey(),
        }));
      } catch {}
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY_SESSION); } catch {}
  }, []);

  // Add user via DB API
  const addUser = useCallback(async (u: { name: string; username: string; password: string }): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...u }),
      });
      const data = await res.json();
      if (data.error) return false;
      await refreshUsers();
      return true;
    } catch {
      return false;
    }
  }, [refreshUsers]);

  // Delete user via DB API
  const deleteUser = useCallback(async (username: string) => {
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', username }),
      });
      await refreshUsers();
    } catch {}
  }, [refreshUsers]);

  const isAdmin = user?.role === 'admin';

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, users, refreshUsers, addUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
