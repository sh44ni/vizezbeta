'use client';

import React from 'react';
import {
  CheckCircle, Globe, FileText, Hash, Languages, RefreshCw,
  AlertTriangle, Mail, Clock,
} from 'lucide-react';
import type { ScanResult, ScanField } from './page';

interface Props {
  scanResult: ScanResult;
  portalType: 'single' | 'multi';
  triggerFields: ScanField[];
  portalName: string;
  setPortalName: (v: string) => void;
  urlPattern: string;
  setUrlPattern: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  onRescan: () => void;
}

function FieldTypeTag({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', padding: '2px 7px', borderRadius: '4px',
      background: 'rgba(96,165,250,0.08)', color: '#60a5fa',
    }}>
      {type}
    </span>
  );
}

/* ── Multi-Visa Portal Warning ── */
function MultiVisaWarning({
  scanResult, triggerFields, onBack,
}: {
  scanResult: ScanResult;
  triggerFields: ScanField[];
  onBack: () => void;
}) {
  return (
    <div className="animate-card-appear">
      {/* Warning header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(251,191,36,0.12)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          border: '2px solid rgba(251,191,36,0.25)',
        }}>
          <AlertTriangle size={34} style={{ color: '#fbbf24' }} />
        </div>
        <h2 style={{
          fontSize: '26px', fontWeight: 800,
          fontFamily: "'Outfit', 'Inter', sans-serif", margin: '0 0 8px',
        }}>
          Multi-Visa Portal Detected
        </h2>
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.50)', maxWidth: '480px',
          margin: '0 auto', lineHeight: 1.7,
        }}>
          This portal has dynamic form fields that change based on visa type selection.
        </p>
      </div>

      {/* Detection card */}
      <div style={{
        background: '#0a0a0a', border: '1px solid rgba(251,191,36,0.15)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px',
      }}>
        <div style={{
          fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'rgba(255,255,255,0.45)', marginBottom: '16px',
        }}>
          Fields that triggered detection
        </div>
        {triggerFields.map((field, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(251,191,36,0.04)',
            border: '1px solid rgba(251,191,36,0.08)',
            marginBottom: i < triggerFields.length - 1 ? '8px' : '0',
          }}>
            <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                {field.label || field.name || field.id || '(unlabeled)'}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>
                {field.type} • {field.options ? field.options.length : 0} options
              </div>
            </div>
            <FieldTypeTag type={field.type} />
          </div>
        ))}
      </div>

      {/* Coming soon badge + message */}
      <div style={{
        background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '32px',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', padding: '5px 14px', borderRadius: '99px',
          background: 'rgba(124,92,252,0.10)', color: '#7c5cfc',
          marginBottom: '16px',
        }}>
          <Clock size={14} />
          Coming Soon
        </span>
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8,
          margin: '12px 0 0', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto',
        }}>
          Multi-visa portal support is currently in development. For custom setup of this portal, please contact our team.
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          className="btn-ghost"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} /> Scan Different Portal
        </button>
        <a
          href="mailto:support@vizez.cloud"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 28px', borderRadius: '10px', fontSize: '14px',
            fontWeight: 700, textDecoration: 'none', cursor: 'pointer',
            background: '#7c5cfc', color: '#ffffff',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
        >
          <Mail size={16} /> Contact Us
        </a>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function Step2Detected({
  scanResult, portalType, triggerFields,
  portalName, setPortalName,
  urlPattern, setUrlPattern, onNext, onBack, onRescan,
}: Props) {
  // Multi-visa portal → show warning
  if (portalType === 'multi') {
    return (
      <MultiVisaWarning
        scanResult={scanResult}
        triggerFields={triggerFields}
        onBack={onBack}
      />
    );
  }

  // Single-visa portal → normal flow
  const { url, title, total_fields, required_fields, language, fields } = scanResult;

  const infoRows = [
    { icon: <Globe size={16} />, label: 'Portal URL', value: url, mono: true },
    { icon: <FileText size={16} />, label: 'Page Title', value: title, mono: false },
    { icon: <Hash size={16} />, label: 'Total Fields', value: String(total_fields), mono: false },
    { icon: <Hash size={16} />, label: 'Required Fields', value: String(required_fields), mono: false },
    { icon: <Languages size={16} />, label: 'Language', value: language || 'Auto-detected', mono: false },
  ];

  return (
    <div className="animate-card-appear">
      {/* Success header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#4ade80', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <CheckCircle size={32} style={{ color: '#fff' }} />
        </div>
        <h2 style={{
          fontSize: '24px', fontWeight: 800,
          fontFamily: "'Outfit', 'Inter', sans-serif", margin: 0,
        }}>
          Portal Detected
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginTop: '8px' }}>
          {total_fields} fields found • {required_fields} required
        </p>
        {/* Single Visa Portal badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px',
          background: 'rgba(74,222,128,0.08)', color: '#4ade80', marginTop: '10px',
        }}>
          Single Visa Portal ✓
        </span>
      </div>

      {/* Info card */}
      <div style={{
        background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px',
      }}>
        {infoRows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 0',
            borderBottom: i < infoRows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{r.icon}</span>
            <span style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.45)',
              width: '120px', flexShrink: 0, fontWeight: 500,
            }}>{r.label}</span>
            <span style={{
              fontSize: '14px', color: '#ffffff', fontWeight: 600,
              fontFamily: r.mono ? "'JetBrains Mono', monospace" : 'inherit',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Editable inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{
            fontSize: '13px', fontWeight: 600,
            color: 'rgba(255,255,255,0.70)', display: 'block', marginBottom: '6px',
          }}>
            Save this portal as:
          </label>
          <input
            className="clean-input"
            value={portalName}
            onChange={e => setPortalName(e.target.value)}
            placeholder="Portal name"
          />
        </div>
        <div>
          <label style={{
            fontSize: '13px', fontWeight: 600,
            color: 'rgba(255,255,255,0.70)', display: 'block', marginBottom: '6px',
          }}>
            URL pattern:
          </label>
          <input
            className="clean-input"
            value={urlPattern}
            onChange={e => setUrlPattern(e.target.value)}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            placeholder="e.g. evisa.rop.gov.om/*"
          />
        </div>
      </div>

      {/* Detected fields table */}
      {fields.length > 0 && (
        <div style={{
          background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px', overflow: 'hidden', marginBottom: '32px',
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: '14px', fontWeight: 700, color: '#ffffff',
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}>
            Detected Fields ({fields.length})
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 70px 1fr',
              gap: '8px', padding: '10px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'rgba(255,255,255,0.30)',
            }}>
              <span>Label</span>
              <span>Type</span>
              <span>Required</span>
              <span>Selector</span>
            </div>
            {/* Table rows */}
            {fields.map((field: ScanField, i: number) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 70px 1fr',
                gap: '8px', padding: '10px 20px',
                borderBottom: i < fields.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                fontSize: '13px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#111111'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <span style={{ color: '#ffffff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {field.label || field.name || field.id || '(unlabeled)'}
                </span>
                <span><FieldTypeTag type={field.type} /></span>
                <span style={{ color: field.required ? '#f87171' : 'rgba(255,255,255,0.30)', fontWeight: 600, fontSize: '12px' }}>
                  {field.required ? 'Yes' : 'No'}
                </span>
                <span style={{
                  color: 'rgba(255,255,255,0.30)', fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {field.selector}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-ghost"
            onClick={onRescan}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Rescan
          </button>
          <button
            className="btn-friendly"
            onClick={onNext}
            disabled={!portalName.trim()}
            style={{ fontSize: '14px', padding: '12px 28px' }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
