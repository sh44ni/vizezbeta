'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle, Layers, ArrowRight, RefreshCw, LayoutDashboard, Loader, AlertTriangle } from 'lucide-react';
import type { MappedField } from './page';

interface Props {
  portalName: string;
  urlPattern: string;
  mappedFields: MappedField[];
  documentConfig: string[];
  onSavedId: (id: string) => void;
  savedPortalId: string | null;
  onTrainAnother: () => void;
}

export default function Step5Complete({
  portalName, urlPattern, mappedFields, documentConfig,
  onSavedId, savedPortalId, onTrainAnother,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didSave = useRef(false);

  // Stats
  const totalFields = mappedFields.length;
  const mappedCount = mappedFields.filter(f => f.source_key).length;
  const unmappedCount = totalFields - mappedCount;
  const requiredCount = mappedFields.filter(f => f.required).length;

  // Save portal on mount
  useEffect(() => {
    if (didSave.current || savedPortalId) return;
    didSave.current = true;

    const savePortal = async () => {
      setSaving(true);
      setError(null);
      try {
        const body = {
          name: portalName,
          url_pattern: urlPattern,
          document_config: documentConfig,
          fields: mappedFields.map(f => ({
            portal_selector: f.portal_selector,
            portal_label: f.portal_label,
            field_type: f.field_type,
            source_key: f.source_key,
            fill_method: f.fill_method,
            required: f.required,
            sort_order: f.sort_order,
            review_status: f.review_status,
            confidence: f.confidence,
          })),
        };

        const res = await fetch('/api/portals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`Server error (${res.status})`);

        const data = await res.json();
        onSavedId(data.id || data._id || 'new-portal');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save portal.');
      } finally {
        setSaving(false);
      }
    };

    savePortal();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (saving) {
    return (
      <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <Loader size={40} style={{ color: '#7c5cfc', animation: 'spin 1s linear infinite', margin: '0 auto 20px', display: 'block' }} />
        <h2 style={{
          fontSize: '22px', fontWeight: 700,
          fontFamily: "'Outfit', 'Inter', sans-serif", color: '#ffffff', margin: '0 0 8px',
        }}>
          Saving portal...
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
          Sending {totalFields} field mappings to the server
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <AlertTriangle size={32} style={{ color: '#f87171' }} />
        </div>
        <h2 style={{
          fontSize: '22px', fontWeight: 700,
          fontFamily: "'Outfit', 'Inter', sans-serif", color: '#ffffff', margin: '0 0 8px',
        }}>
          Failed to save portal
        </h2>
        <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '24px' }}>{error}</p>
        <button
          className="btn-friendly"
          onClick={() => { didSave.current = false; setError(null); setSaving(true); }}
          style={{ fontSize: '14px', padding: '12px 28px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Success state
  const portalId = savedPortalId || 'new-portal';

  const stats = [
    { label: 'Total Fields', value: totalFields, color: '#7c5cfc', icon: <Layers size={20} /> },
    { label: 'Mapped', value: mappedCount, color: '#4ade80', icon: <CheckCircle size={20} /> },
    { label: 'Unmapped', value: unmappedCount, color: unmappedCount > 0 ? '#fbbf24' : 'rgba(255,255,255,0.30)', icon: <AlertTriangle size={20} /> },
  ];

  return (
    <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '40px' }}>
      {/* Success animation */}
      <div className="animate-bounce-in" style={{
        width: '88px', height: '88px', borderRadius: '50%',
        background: '#4ade80', display: 'flex',
        alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
        boxShadow: '0 0 0 12px rgba(74,222,128,0.08), 0 8px 32px rgba(74,222,128,0.25)',
      }}>
        <CheckCircle size={48} style={{ color: '#fff' }} />
      </div>

      <h2 style={{
        fontSize: '28px', fontWeight: 800, margin: '0 0 8px',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}>
        {portalName} is ready
      </h2>
      <p style={{
        fontSize: '15px', color: 'rgba(255,255,255,0.45)',
        marginBottom: '36px', lineHeight: 1.7,
      }}>
        Portal saved successfully. Your operators can now use this mapping in the Marathon flow.
      </p>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px',
        maxWidth: '460px', margin: '0 auto 40px',
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            padding: '20px 16px', borderRadius: '12px',
            background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ color: s.color, marginBottom: '8px' }}>{s.icon}</div>
            <div style={{
              fontSize: '28px', fontWeight: 800, color: s.color,
              fontFamily: "'Outfit', sans-serif",
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.45)',
              marginTop: '4px', fontWeight: 500,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Required fields note */}
      {requiredCount > 0 && (
        <div style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.45)',
          marginBottom: '28px', fontWeight: 500,
        }}>
          {requiredCount} required field{requiredCount !== 1 ? 's' : ''} in this portal
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href={`/dashboard/portals/${portalId}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 28px', borderRadius: '8px', border: 'none',
            background: '#7c5cfc', color: '#fff', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', cursor: 'pointer',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            transition: 'background 0.15s ease',
          }}
        >
          View Portal <ArrowRight size={16} />
        </Link>
        <button
          className="btn-ghost"
          onClick={onTrainAnother}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
        >
          <RefreshCw size={14} /> Train Another
        </button>
        <Link
          href="/dashboard"
          className="btn-ghost"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
        >
          <LayoutDashboard size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
