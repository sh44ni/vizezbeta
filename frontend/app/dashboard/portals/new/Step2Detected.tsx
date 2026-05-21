'use client';

import React, { useEffect } from 'react';
import { CheckCircle, Globe, FileText, Layers, Hash, Languages, AlertTriangle } from 'lucide-react';
import type { PortalType } from '../portal-types';

interface ScanResult {
  url: string;
  title: string;
  total_fields: number;
  required_fields: number;
  language: string;
  fields: any[];
}

interface Props {
  onNext: () => void;
  onBack: () => void;
  portalName: string;
  setPortalName: (v: string) => void;
  urlPattern: string;
  setUrlPattern: (v: string) => void;
  scanResult: ScanResult | null;
  portalType: PortalType | null;
}

export default function Step2Detected({ onNext, onBack, portalName, setPortalName, urlPattern, setUrlPattern, scanResult, portalType }: Props) {
  // Auto-populate from scan result
  useEffect(() => {
    if (scanResult) {
      if (!portalName) {
        const name = scanResult.title?.replace(/[-|–—].*$/, '').trim() || 'Unknown Portal';
        setPortalName(name);
      }
      if (!urlPattern) {
        try {
          const u = new URL(scanResult.url);
          setUrlPattern(`*://${u.hostname}/*`);
        } catch {
          setUrlPattern(scanResult.url);
        }
      }
    }
  }, [scanResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = scanResult ? [
    { icon: <Globe className="w-4 h-4" />, label: 'Detected URL', value: scanResult.url },
    { icon: <FileText className="w-4 h-4" />, label: 'Page Title', value: scanResult.title },
    { icon: <Layers className="w-4 h-4" />, label: 'Form Type', value: `${scanResult.total_fields} fields detected` },
    { icon: <Hash className="w-4 h-4" />, label: 'Total Fields', value: String(scanResult.total_fields) },
    { icon: <Hash className="w-4 h-4" />, label: 'Required Fields', value: String(scanResult.required_fields) },
    { icon: <Languages className="w-4 h-4" />, label: 'Language', value: scanResult.language || 'English' },
  ] : [];

  const selectCount = scanResult?.fields?.filter(f => f.type === 'select').length || 0;
  const maskedCount = scanResult?.fields?.filter(f => f.masked).length || 0;

  return (
    <div className="animate-card-appear">
      {/* Success icon */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className="success-icon-animate" style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'var(--gradient-success)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <CheckCircle className="w-8 h-8" style={{ color: '#fff' }} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Outfit', 'Inter', sans-serif", margin: 0 }}>
          Portal scanned successfully
        </h2>
        {portalType && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '10px', fontSize: '12px', fontWeight: 600,
            padding: '5px 14px', borderRadius: '99px',
            background: portalType === 'visa' ? 'rgba(124,92,252,0.1)' : 'rgba(56,189,248,0.1)',
            color: portalType === 'visa' ? 'var(--accent)' : '#38bdf8',
          }}>
            {portalType === 'visa' ? '🛂 Visa Portal' : '📋 Web Form'}
          </div>
        )}
      </div>

      {/* Info card */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '24px', marginBottom: '24px',
      }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{r.icon}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', width: '120px', flexShrink: 0, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: r.label === 'Detected URL' ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{r.value}</span>
          </div>
        ))}

        {/* Field type summary */}
        {(selectCount > 0 || maskedCount > 0) && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {selectCount > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: 'var(--info-bg)', color: 'var(--info)' }}>
                {selectCount} dropdowns
              </span>
            )}
            {maskedCount > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: 'var(--warn-bg)', color: 'var(--warn)' }}>
                {maskedCount} masked inputs
              </span>
            )}
          </div>
        )}
      </div>

      {/* Editable inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Save this portal as:
          </label>
          <input className="clean-input" value={portalName} onChange={e => setPortalName(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            URL pattern (used to detect this portal):
          </label>
          <input className="clean-input" value={urlPattern} onChange={e => setUrlPattern(e.target.value)} style={{ fontFamily: 'monospace' }} />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-friendly" onClick={onNext} style={{ fontSize: '14px', padding: '12px 28px' }}>Next →</button>
      </div>
    </div>
  );
}
