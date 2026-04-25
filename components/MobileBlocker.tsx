'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, X } from 'lucide-react';

export default function MobileBlocker() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'var(--mesh-bg, #0a0a1a)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(124,92,252,0.08)', filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        maxWidth: '380px', width: '100%',
        background: 'var(--glass-bg, rgba(255,255,255,0.04))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
        borderRadius: '20px',
        padding: '40px 32px 32px',
        textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Top gradient line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'var(--gradient-primary, linear-gradient(135deg, #7c5cfc, #38bdf8))',
          borderRadius: '20px 20px 0 0',
        }} />

        {/* Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(56,189,248,0.1))',
          border: '1px solid rgba(124,92,252,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Smartphone style={{ width: 28, height: 28, color: '#a78bfa' }} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '20px', fontWeight: 800, margin: '0 0 10px',
          fontFamily: "'Outfit','Inter',sans-serif",
          color: 'var(--text-primary, #f0f0f0)',
          letterSpacing: '-0.3px',
        }}>
          Desktop Only
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '14px', lineHeight: 1.7,
          color: 'var(--text-secondary, #888)',
          margin: '0 0 28px',
        }}>
          VizEz is not optimized for mobile screens.
          Please <strong style={{ color: 'var(--text-primary, #f0f0f0)' }}>enable desktop mode</strong> in
          your browser or open it on a desktop computer.
        </p>

        {/* Desktop mode hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '12px',
          background: 'var(--surface-2, rgba(255,255,255,0.04))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          marginBottom: '20px',
        }}>
          <Monitor style={{ width: 18, height: 18, color: '#38bdf8', flexShrink: 0 }} />
          <span style={{
            fontSize: '12px', color: 'var(--text-muted, #666)',
            textAlign: 'left', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--text-secondary, #aaa)' }}>Tip:</strong> In Chrome, tap ⋮ menu → &quot;Desktop site&quot;
          </span>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted, #555)', fontSize: '12px',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '8px 16px', borderRadius: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary, #aaa)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted, #555)';
          }}
        >
          <X style={{ width: 12, height: 12 }} />
          Continue anyway
        </button>
      </div>
    </div>
  );
}
