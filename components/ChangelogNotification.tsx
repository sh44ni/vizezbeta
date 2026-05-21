'use client';

import React, { useState, useEffect } from 'react';
import { X, Rocket, Blocks, ScanLine, Zap, BrainCircuit, Shield } from 'lucide-react';

// ─── v3.0.0 Open Beta — Launch version ───
const CURRENT_VERSION = '3.0.0';
const STORAGE_KEY = 'vizez_changelog_ts';
const SESSION_KEY = 'vizez_changelog_dismissed';
const SHOW_DAYS = 14; // Show launch popup for 14 days

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
}

const FEATURES: Feature[] = [
  {
    icon: <Blocks className="w-4 h-4" />,
    title: 'Addons Marketplace',
    description:
      'Pre-mapped portal modules built by the VizEz team — install and start filling instantly. ROP eVisa is live, more coming soon.',
    tag: 'Core',
    tagColor: '#7c5cfc',
  },
  {
    icon: <BrainCircuit className="w-4 h-4" />,
    title: 'AI Document Extraction',
    description:
      'Upload passports and work permits — AI reads, verifies MRZ, enhances images, and extracts every field with one click.',
    tag: 'Core',
    tagColor: '#7c5cfc',
  },
  {
    icon: <ScanLine className="w-4 h-4" />,
    title: 'Smart Portal Filler',
    description:
      'The VizEz Brain extension detects which portal you\'re on, queues applicants, and fills forms field-by-field with live feedback.',
    tag: 'Core',
    tagColor: '#7c5cfc',
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'One-Click Fill Pipeline',
    description:
      'Extract → Send to Portal → Fill. The entire flow from document scan to filled government form in under 10 seconds.',
    tag: 'Fast',
    tagColor: '#f59e0b',
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: 'Role-Based Access',
    description:
      'Super admin controls who can access what. Request addon access, manage users, and audit every action from one dashboard.',
    tag: 'Secure',
    tagColor: '#10b981',
  },
];

export default function ChangelogNotification() {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === CURRENT_VERSION) return;

      const raw = localStorage.getItem(STORAGE_KEY);
      let firstSeen: number;

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === CURRENT_VERSION) {
          firstSeen = parsed.firstSeen;
        } else {
          firstSeen = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, firstSeen }));
        }
      } else {
        firstSeen = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, firstSeen }));
      }

      const daysSince = (Date.now() - firstSeen) / (1000 * 60 * 60 * 24);
      if (daysSince < SHOW_DAYS) {
        setTimeout(() => {
          setVisible(true);
          setAnimating(true);
        }, 800);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    setAnimating(false);
    setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(SESSION_KEY, CURRENT_VERSION); } catch {}
    }, 300);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: animating ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: animating ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.92)',
          zIndex: 9999,
          width: '480px',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '20px',
          background: 'var(--surface)',
          border: '1px solid var(--border-bright)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.45), 0 0 60px rgba(124,92,252,0.12)',
          opacity: animating ? 1 : 0,
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Hero Header */}
        <div
          style={{
            padding: '28px 24px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(124,92,252,0.06) 0%, transparent 60%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(124,92,252,0.4)',
              }}>
                <Rocket className="w-4 h-4" style={{ color: '#fff' }} />
              </div>
              <span style={{
                fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)',
                fontFamily: "'Outfit', 'Inter', sans-serif",
                letterSpacing: '-0.3px',
              }}>
                VizEz v3.0
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px',
                background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(167,139,250,0.15))',
                color: '#a78bfa',
                border: '1px solid rgba(124,92,252,0.25)',
                letterSpacing: '0.05em',
              }}>
                OPEN BETA
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              AI-powered document extraction meets one-click portal filling.
              <br />
              Built for visa processing teams who move fast.
            </p>
          </div>
          <button
            onClick={dismiss}
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--error-bg)';
              (e.currentTarget as HTMLElement).style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Features */}
        <div style={{ padding: '16px 24px 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FEATURES.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: '12px', padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
                (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'var(--accent-subtle)', border: '1px solid rgba(124,92,252,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.title}
                  </span>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px',
                    background: `${item.tagColor}18`, color: item.tagColor,
                    border: `1px solid ${item.tagColor}30`,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {item.tag}
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Addons CTA */}
        <div style={{ padding: '12px 24px 4px' }}>
          <a
            href="/addons"
            onClick={dismiss}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px', borderRadius: 'var(--radius-md)',
              background: 'rgba(124,92,252,0.06)',
              border: '1px solid rgba(124,92,252,0.15)',
              color: 'var(--accent)', fontSize: '12px', fontWeight: 600,
              textDecoration: 'none', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(124,92,252,0.12)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,92,252,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(124,92,252,0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,92,252,0.15)';
            }}
          >
            <Blocks className="w-3.5 h-3.5" />
            Browse Addons — Pre-mapped portals ready to use
          </a>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 20px' }}>
          <button
            onClick={dismiss}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Rocket className="w-4 h-4" />
            Let&apos;s go
          </button>
        </div>
      </div>
    </>
  );
}
