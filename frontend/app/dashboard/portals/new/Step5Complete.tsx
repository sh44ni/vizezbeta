'use client';

import React from 'react';
import { CheckCircle, Globe, ArrowRight, Puzzle } from 'lucide-react';
import Link from 'next/link';

interface Props {
  portalName: string;
  portalId: string;
  fieldCount: number;
  isUrlMode?: boolean;
}

export default function Step5Complete({ portalName, portalId, fieldCount, isUrlMode }: Props) {
  return (
    <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '48px' }}>
      {/* Success circle */}
      <div className="success-icon-animate" style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'var(--gradient-success)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(52, 211, 153, 0.25)',
      }}>
        <CheckCircle className="w-10 h-10" style={{ color: '#fff' }} />
      </div>

      <h2 style={{
        fontSize: '28px', fontWeight: 800, margin: '0 0 12px',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}>
        {isUrlMode ? 'Portal registered!' : 'Portal mapped successfully!'}
      </h2>

      <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '0 0 32px', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-primary)' }}>{portalName}</strong>
        {isUrlMode ? (
          <> has been registered. Use the <strong style={{ color: 'var(--accent)' }}>browser extension</strong> to scan
          and map its form fields when you visit the portal.</>
        ) : (
          <> has been saved with{' '}
          <strong style={{ color: 'var(--accent)' }}>{fieldCount} field mappings</strong>.
          The extension will now auto-fill this portal when you visit it.</>
        )}
      </p>

      {/* Portal card */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '14px',
        padding: '16px 24px', borderRadius: 'var(--radius-lg)',
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        marginBottom: '32px',
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: isUrlMode ? 'var(--warn)' : 'var(--success)',
          boxShadow: `0 0 8px ${isUrlMode ? 'var(--warn)' : 'var(--success)'}`,
        }} />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {portalName}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {isUrlMode ? 'Registered — needs field scan' : `${fieldCount} fields • Active`}
          </div>
        </div>
        <Globe className="w-5 h-5" style={{ color: 'var(--accent)', flexShrink: 0 }} />
      </div>

      {/* Next steps */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
        marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px',
        textAlign: 'left',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Next Steps:
        </div>
        {(isUrlMode ? [
          'Install the VizEz Chrome extension if not already installed',
          'Navigate to the portal form page and log in',
          'Open the extension popup → Scan tab → click "Scan Page Fields"',
          'Come back here and re-map the portal with the scanned fields',
        ] : [
          'Open the VizEz extension popup and load applicant data',
          'Navigate to the portal — you\'ll see the AutoFill button',
          'Click "AutoFill from VizEz" to fill all mapped fields',
        ]).map((step, i) => (
          <div key={i} style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            padding: '8px 0',
            borderBottom: i < (isUrlMode ? 3 : 2) ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent-subtle)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, marginTop: '1px',
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <Link
          href="/dashboard/portals"
          className="btn-ghost"
          style={{ fontSize: '14px', padding: '12px 24px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Globe className="w-4 h-4" /> View All Portals
        </Link>
        <Link
          href="/"
          className="btn-friendly"
          style={{ fontSize: '14px', padding: '12px 28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
