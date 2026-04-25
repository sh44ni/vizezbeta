'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */
export interface VizUser {
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
}

interface AuthContextValue {
  user: VizUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  users: VizUser[];
  addUser: (u: Omit<VizUser, 'role'>) => boolean;
  deleteUser: (username: string) => void;
}

/* ─── Hardcoded seed user ─── */
const SEED_USERS: VizUser[] = [
  { name: 'Zeeshan', username: 'zee', password: 'zee431#', role: 'admin' },
];

const STORAGE_KEY_USERS = 'vizez_users';
const STORAGE_KEY_SESSION = 'vizez_session';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadUsers(): VizUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const extra: VizUser[] = JSON.parse(raw);
      // Merge: seed always present, extras appended (no duplicates)
      const merged = [...SEED_USERS];
      for (const u of extra) {
        if (!merged.find((m) => m.username === u.username)) {
          merged.push(u);
        }
      }
      return merged;
    }
  } catch {}
  return [...SEED_USERS];
}

function saveExtraUsers(all: VizUser[]) {
  // Only persist non-seed users
  const extras = all.filter((u) => !SEED_USERS.find((s) => s.username === u.username));
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(extras));
  } catch {}
}

/* ─── Context ─── */
const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  login: () => false,
  logout: () => {},
  users: [],
  addUser: () => false,
  deleteUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<VizUser[]>(SEED_USERS);
  const [user, setUser] = useState<VizUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const allUsers = loadUsers();
    setUsers(allUsers);

    try {
      const sess = localStorage.getItem(STORAGE_KEY_SESSION);
      if (sess) {
        const parsed = JSON.parse(sess) as { username: string; day: string };
        if (parsed.day === todayKey()) {
          const found = allUsers.find((u) => u.username === parsed.username);
          if (found) setUser(found);
        } else {
          // Expired — different day
          localStorage.removeItem(STORAGE_KEY_SESSION);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  const login = useCallback(
    (username: string, password: string): boolean => {
      const found = users.find(
        (u) => u.username === username && u.password === password
      );
      if (found) {
        setUser(found);
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ username: found.username, day: todayKey() }));
        } catch {}
        return true;
      }
      return false;
    },
    [users]
  );

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch {}
  }, []);

  const addUser = useCallback(
    (u: Omit<VizUser, 'role'>): boolean => {
      if (users.find((ex) => ex.username === u.username)) return false;
      const newUser: VizUser = { ...u, role: 'user' };
      const updated = [...users, newUser];
      setUsers(updated);
      saveExtraUsers(updated);
      return true;
    },
    [users]
  );

  const deleteUser = useCallback(
    (username: string) => {
      // Cannot delete the admin seed
      if (username === 'zee') return;
      const updated = users.filter((u) => u.username !== username);
      setUsers(updated);
      saveExtraUsers(updated);
    },
    [users]
  );

  const isAdmin = user?.role === 'admin';

  // Don't render children until hydrated to avoid flash
  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, users, addUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
