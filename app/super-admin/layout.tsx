'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AdminKeyProvider } from '@/context/AdminKeyContext';
import {
  BarChart3, Users, Settings, Shield, LogOut,
  ChevronLeft, Activity, UserCheck, Server,
} from 'lucide-react';

const ADMIN_KEY_STORAGE = 'vizez_admin_key';

const NAV_ITEMS = [
  { href: '/super-admin', label: 'Analytics', icon: BarChart3, exact: true },
  { href: '/super-admin/access', label: 'User Access', icon: UserCheck, exact: false },
  { href: '/super-admin/system', label: 'System', icon: Server, exact: false },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

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

  const handleLogout = () => {
    setAdminKey(null);
    setKeyInput('');
    try { sessionStorage.removeItem(ADMIN_KEY_STORAGE); } catch {}
  };

  if (!mounted) return null;

  /* ═══════════ AUTH GATE ═══════════ */
  if (!adminKey) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* Subtle amber glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(ellipse at top, rgba(245,158,11,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div
          className="animate-slide-up"
          style={{
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '44px 40px 36px',
            maxWidth: '420px',
            width: '100%',
            margin: '0 20px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Shield icon */}
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Shield size={26} style={{ color: '#f59e0b' }} />
          </div>

          <h1 style={{
            fontSize: '22px', fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            color: '#ffffff', margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Admin Console
          </h1>
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.40)',
            margin: '0 0 28px',
          }}>
            VizEz Super Admin • Restricted Access
          </p>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.20)',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '12px', color: '#f87171',
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
            placeholder="Enter admin secret key"
            autoFocus
            style={{
              width: '100%', padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.10)',
              background: '#111111', color: '#ffffff',
              fontSize: '14px',
              fontFamily: "'JetBrains Mono', monospace",
              outline: 'none', marginBottom: '14px',
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
              width: '100%', padding: '12px 0',
              borderRadius: '10px', border: 'none',
              background: loading || !keyInput.trim() ? 'rgba(245,158,11,0.25)' : '#f59e0b',
              color: '#000000', fontWeight: 600, fontSize: '14px',
              cursor: loading || !keyInput.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Inter', sans-serif",
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

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/" style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.35)',
              textDecoration: 'none', display: 'flex',
              alignItems: 'center', gap: '4px', justifyContent: 'center',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <ChevronLeft size={14} /> Back to VizEz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════ ADMIN PANEL LAYOUT ═══════════ */
  const sidebarW = sidebarCollapsed ? 68 : 240;

  return (
    <AdminKeyProvider adminKey={adminKey}>
      <div style={{
        display: 'flex', minHeight: '100vh',
        background: '#000000', color: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* ── Sidebar ── */}
        <aside style={{
          width: `${sidebarW}px`, flexShrink: 0,
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 100,
        }}>
          {/* Brand */}
          <div style={{
            padding: sidebarCollapsed ? '20px 14px' : '20px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: '10px',
            minHeight: '64px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Shield size={16} style={{ color: '#f59e0b' }} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <div style={{
                  fontSize: '14px', fontWeight: 700,
                  fontFamily: "'Outfit', sans-serif",
                  color: '#ffffff', lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}>
                  Admin Console
                </div>
                <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Super Admin
                </div>
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {NAV_ITEMS.map(item => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: '12px',
                    padding: sidebarCollapsed ? '10px 14px' : '10px 14px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '13px', fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.50)',
                    background: isActive ? 'rgba(245,158,11,0.10)' : 'transparent',
                    border: isActive ? '1px solid rgba(245,158,11,0.15)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.50)';
                    }
                  }}
                >
                  <Icon size={18} style={{ flexShrink: 0, color: isActive ? '#f59e0b' : 'inherit' }} />
                  {!sidebarCollapsed && item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div style={{
            padding: '12px 10px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', gap: '2px',
          }}>
            {/* Back to app */}
            <Link
              href="/"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '12px', fontWeight: 500,
                color: 'rgba(255,255,255,0.40)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.40)';
              }}
            >
              <ChevronLeft size={16} style={{ flexShrink: 0 }} />
              {!sidebarCollapsed && 'Back to VizEz'}
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '8px',
                background: 'transparent', border: 'none',
                fontSize: '12px', fontWeight: 500,
                color: 'rgba(255,255,255,0.40)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.08)';
                e.currentTarget.style.color = '#f87171';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.40)';
              }}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              {!sidebarCollapsed && 'Sign Out'}
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main style={{
          flex: 1,
          marginLeft: `${sidebarW}px`,
          minHeight: '100vh',
          overflowY: 'auto',
          transition: 'margin-left 0.2s ease',
        }}>
          {children}
        </main>
      </div>
    </AdminKeyProvider>
  );
}
