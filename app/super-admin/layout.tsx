'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { AdminKeyProvider } from '@/context/AdminKeyContext';

const ADMIN_KEY_STORAGE = 'vizez_admin_key';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = sessionStorage.getItem(ADMIN_KEY_STORAGE);
      if (saved) setAdminKey(saved);
    } catch {}
  }, []);

  const verifyKey = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput }),
      });
      const data = await res.json();
      if (data.valid) {
        setAdminKey(keyInput);
        try { sessionStorage.setItem(ADMIN_KEY_STORAGE, keyInput); } catch {}
      } else {
        setError('Invalid admin key');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  if (!mounted) return null;

  // Auth gate
  if (!adminKey) {
    return (
      <AppShell>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
        }}>
          <div
            className="animate-slide-up"
            style={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '40px 36px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(245,158,11,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              color: '#ffffff',
              margin: '0 0 6px',
            }}>
              Super Admin Access
            </h2>
            <p style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.45)',
              margin: '0 0 24px',
            }}>
              Enter your admin secret key to continue
            </p>

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.20)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#f87171',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyKey()}
              placeholder="Admin secret key"
              autoFocus
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.10)',
                background: '#111111',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
                marginBottom: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.50)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'}
            />

            <button
              onClick={verifyKey}
              disabled={loading || !keyInput.trim()}
              style={{
                width: '100%',
                padding: '11px 0',
                borderRadius: '8px',
                border: 'none',
                background: loading || !keyInput.trim() ? 'rgba(245,158,11,0.30)' : '#f59e0b',
                color: '#000000',
                fontWeight: 600,
                fontSize: '13px',
                cursor: loading || !keyInput.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!loading && keyInput.trim()) e.currentTarget.style.background = '#fbbf24';
              }}
              onMouseLeave={e => {
                if (!loading && keyInput.trim()) e.currentTarget.style.background = '#f59e0b';
              }}
            >
              {loading ? 'Verifying...' : 'Authenticate'}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Authenticated — render children with admin key context
  return (
    <AppShell>
      <AdminKeyProvider adminKey={adminKey}>
        {children}
      </AdminKeyProvider>
    </AppShell>
  );
}
