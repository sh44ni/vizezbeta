'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, Eye, ShieldCheck, ImageUp } from 'lucide-react';

// ─── Bump this version string whenever you ship a notable update ───
const CURRENT_VERSION = '1.3.0';
const STORAGE_KEY = 'vizez_changelog_ts';       // stores `{ version, firstSeen }` as JSON
const SESSION_KEY = 'vizez_changelog_dismissed'; // dismissed for this browser session
const SHOW_DAYS = 7;                             // popup appears on load for this many days

interface ChangeItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag?: string;
  tagColor?: string;
}

const CHANGES: ChangeItem[] = [
  {
    icon: <ImageUp className="w-4 h-4" />,
    title: 'Passport Image Enhancement Engine',
    description:
      'Every passport image now goes through an AI-powered pre-processing pipeline (deskew → denoise → brightness → contrast → sharpen → upscale) before extraction. Blurry scans and skewed photos are automatically corrected for dramatically better results.',
    tag: 'Major',
    tagColor: '#7c5cfc',
  },
  {
    icon: <Eye className="w-4 h-4" />,
    title: 'Enhanced Image Preview',
    description:
      'After extraction, click "Enhanced" on any applicant to see a side-by-side comparison of the original upload vs. the processor-enhanced image. See exactly what the AI reads.',
    tag: 'New',
    tagColor: '#10b981',
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'Live Pipeline Stages',
    description:
      'The extraction screen now shows a real-time pipeline stepper — Enhance → Send → AI Read → Verify — so you always know exactly what\'s happening. Errors surface instantly with clear messages.',
    tag: 'New',
    tagColor: '#10b981',
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    title: 'PDF Passport Support',
    description:
      'Upload passport scans as PDFs — the enhancement engine automatically converts them to high-resolution images at 300 DPI and selects the most passport-like page.',
    tag: 'New',
    tagColor: '#10b981',
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    title: 'Graceful Fallback',
    description:
      'If the enhancement service is unavailable, extraction continues seamlessly with the raw image. The activity log clearly shows whether enhancement was applied.',
    tag: 'Improved',
    tagColor: '#60a5fa',
  },
];

export default function ChangelogNotification() {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    try {
      // Already dismissed this browser session? Skip.
      if (sessionStorage.getItem(SESSION_KEY) === CURRENT_VERSION) return;

      // Check when the user first saw this version
      const raw = localStorage.getItem(STORAGE_KEY);
      let firstSeen: number;

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === CURRENT_VERSION) {
          firstSeen = parsed.firstSeen;
        } else {
          // New version — reset the timer
          firstSeen = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, firstSeen }));
        }
      } else {
        // First time ever
        firstSeen = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, firstSeen }));
      }

      // Only show if within the 7-day window
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
      // Mark as dismissed for this session only — will reappear on next load within the 7-day window
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
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
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
          width: '460px',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '20px',
          background: 'var(--surface)',
          border: '1px solid var(--border-bright)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.35), 0 0 40px rgba(124,92,252,0.1)',
          opacity: animating ? 1 : 0,
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 15px rgba(124,92,252,0.3)',
              }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#fff' }} />
              </div>
              <span style={{
                fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: "'Outfit', 'Inter', sans-serif",
                letterSpacing: '-0.3px',
              }}>
                What&apos;s New
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                background: 'var(--accent-subtle)', color: 'var(--accent)',
                border: '1px solid rgba(124,92,252,0.2)',
              }}>
                v{CURRENT_VERSION}
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Here&apos;s everything that shipped since your last visit.
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

        {/* Changes */}
        <div style={{ padding: '16px 24px 8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CHANGES.map((item, i) => (
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
                  {item.tag && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px',
                      background: `${item.tagColor}18`, color: item.tagColor,
                      border: `1px solid ${item.tagColor}30`,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {item.tag}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px 20px' }}>
          <button
            onClick={dismiss}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Got it — let&apos;s go!
          </button>
        </div>
      </div>
    </>
  );
}
