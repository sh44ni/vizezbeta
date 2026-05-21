'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import SettingsPanel from '@/components/SettingsPanel';
import UserManagement from '@/components/UserManagement';
import PassportLogsPanel from '@/components/PassportLogsPanel';
import { Blocks } from 'lucide-react';
import Link from 'next/link';

interface Addon {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'pending' | 'available' | 'coming_soon';
  href?: string;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '28px',
      right: '28px',
      zIndex: 9999,
      background: '#1a1a1a',
      border: '1px solid rgba(124,92,252,0.25)',
      borderRadius: '10px',
      padding: '12px 20px',
      color: '#fff',
      fontSize: '13px',
      fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'toastIn 0.25s ease',
    }}>
      {message}
    </div>
  );
}

function AddonsContent() {
  const { user } = useAuth();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    fetch(`/api/addons?user_email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => {
        setAddons(data.addons || data || []);
      })
      .catch(() => {
        // Fallback static addons if API unavailable
        setAddons([
          {
            id: 'rop-evisa',
            name: 'ROP eVisa Manual Filler',
            description: 'Upload passports & work permits, extract data, and fill the ROP eVisa portal automatically.',
            icon: '🛂',
            status: 'active',
            href: '/addons/rop-evisa',
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, [user?.email]);

  const requestAccess = useCallback(async (addonId: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/addons/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user.email,
          user_name: user.name,
          addon_id: addonId,
        }),
      });
      if (res.ok) {
        setAddons(prev =>
          prev.map(a => a.id === addonId ? { ...a, status: 'pending' as const } : a)
        );
        setToast('✅ Access request submitted! An admin will review it shortly.');
      } else {
        setToast('❌ Failed to submit request. Please try again.');
      }
    } catch {
      setToast('❌ Network error. Please try again.');
    }
  }, [user]);

  const statusBadge = (status: Addon['status']) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: 'rgba(74,222,128,0.10)', color: '#4ade80', label: 'Active' },
      pending: { bg: 'rgba(251,191,36,0.10)', color: '#fbbf24', label: 'Pending' },
      available: { bg: 'rgba(124,92,252,0.10)', color: '#7c5cfc', label: 'Available' },
      coming_soon: { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', label: 'Coming Soon' },
    };
    const s = map[status] || map.available;
    return (
      <span style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: '6px',
        background: s.bg,
        color: s.color,
      }}>
        {s.label}
      </span>
    );
  };

  const renderAction = (addon: Addon) => {
    switch (addon.status) {
      case 'active':
        return (
          <Link href={addon.href || `/addons/${addon.id}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            borderRadius: '8px',
            background: '#7c5cfc',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#6a4ce0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#7c5cfc'; }}
          >
            Open →
          </Link>
        );
      case 'pending':
        return (
          <button disabled style={{
            padding: '8px 18px',
            borderRadius: '8px',
            background: 'rgba(251,191,36,0.08)',
            color: '#fbbf24',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid rgba(251,191,36,0.15)',
            cursor: 'not-allowed',
            opacity: 0.85,
          }}>
            ⏳ Pending Approval
          </button>
        );
      case 'available':
        return (
          <button
            onClick={() => requestAccess(addon.id)}
            onMouseEnter={() => setHoveredBtn(addon.id)}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: hoveredBtn === addon.id ? 'rgba(124,92,252,0.10)' : 'transparent',
              color: '#7c5cfc',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid rgba(124,92,252,0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Request Access
          </button>
        );
      case 'coming_soon':
        return (
          <span style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.25)',
          }}>
            Coming Soon
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <AppShell
        onSettingsOpen={() => setSettingsOpen(true)}
        onAccessOpen={() => setAccessOpen(true)}
        onLogsOpen={() => setLogsOpen(true)}
      >
        <div className="mesh-bg"><div className="mesh-bg-extra" /></div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Header */}
          <div style={{
            padding: '40px 32px 0',
            maxWidth: '960px',
            margin: '0 auto',
            width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(124,92,252,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c5cfc',
              }}>
                <Blocks size={18} />
              </div>
              <h1 style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#fff',
                margin: 0,
                fontFamily: "'Outfit', 'Inter', sans-serif",
                letterSpacing: '-0.3px',
              }}>
                Addons
              </h1>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.45)',
              margin: '0 0 0 48px',
            }}>
              Extend VizEz with specialized modules
            </p>
          </div>

          {/* Cards grid */}
          <main style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{
              maxWidth: '960px',
              margin: '0 auto',
              padding: '28px 32px 48px',
            }}>
              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 0',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '14px',
                }}>
                  Loading addons…
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                  gap: '16px',
                }}>
                  {addons.map(addon => {
                    const isHovered = hoveredCard === addon.id;
                    const isActive = addon.status === 'active';
                    return (
                      <div
                        key={addon.id}
                        onMouseEnter={() => setHoveredCard(addon.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{
                          background: isHovered ? '#111' : '#0a0a0a',
                          border: `1px solid ${isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                          borderLeft: isActive ? '3px solid #7c5cfc' : `1px solid ${isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '16px',
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        {/* Status badge */}
                        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                          {statusBadge(addon.status)}
                        </div>

                        {/* Icon + info */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            flexShrink: 0,
                          }}>
                            {addon.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '70px' }}>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              color: '#fff',
                              marginBottom: '4px',
                            }}>
                              {addon.name}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: 'rgba(255,255,255,0.40)',
                              lineHeight: '1.5',
                            }}>
                              {addon.description}
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        <div style={{
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          paddingTop: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                        }}>
                          {renderAction(addon)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </AppShell>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        letterheadSrc=""
        stampSrc=""
        onLetterheadChange={() => {}}
        onStampChange={() => {}}
      />
      <UserManagement isOpen={accessOpen} onClose={() => setAccessOpen(false)} />
      <PassportLogsPanel isOpen={logsOpen} onClose={() => setLogsOpen(false)} />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

export default function AddonsPage() {
  return <AddonsContent />;
}
