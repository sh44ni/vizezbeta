'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, Edit3, ArrowRight, AlertTriangle, ChevronLeft, ChevronsRight } from 'lucide-react';
import { matchAllFields } from '@/lib/field-matcher';
import ChangeSourceModal from './ChangeSourceModal';
import type { FieldReviewStatus } from '../portal-types';

interface ScannedField {
  selector: string;
  label: string;
  type: string;
  required: boolean;
  options?: any[];
}

interface MappedField {
  portal_selector: string;
  portal_label: string;
  type: string;
  required: boolean;
  source_key: string | null;
  source_label: string;
  fill_method: string;
  confidence: number;
  options?: any[];
  sort_order: number;
  review_status: 'approved' | 'pending' | 'manual' | 'edited';
}

interface ReviewState {
  status: FieldReviewStatus;
  manualValue?: string;
  editedSourceLabel?: string;
  editedSourceKey?: string;
}

interface Props {
  onNext: () => void;
  onBack: () => void;
  scannedFields: ScannedField[];
  onFieldsReviewed: (fields: MappedField[]) => void;
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const cls = confidence >= 0.85 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
  const pct = Math.round(confidence * 100);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span className={`confidence-dot confidence-dot--${cls}`} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: cls === 'high' ? 'var(--success)' : cls === 'medium' ? 'var(--warn)' : 'var(--error)' }}>
        {pct}%
      </span>
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '6px',
      background: 'var(--info-bg)', color: 'var(--info)',
    }}>
      {type}
    </span>
  );
}

export default function Step4Review({ onNext, onBack, scannedFields, onFieldsReviewed }: Props) {
  // Map fields — prefer AI-analyzed data if available, fall back to local matcher
  const fields = useMemo(() => {
    if (!scannedFields?.length) return [];

    // Check if fields already have AI analysis (from analyze-fields endpoint)
    const hasAIData = scannedFields.some((f: any) => f.suggested_source !== undefined || f.ai_confidence !== undefined);

    if (hasAIData) {
      // Use AI-analyzed data directly
      return scannedFields.map((f: any, i: number) => ({
        portal_selector: f.selector || '',
        portal_label: f.label || f.original_label || '',
        type: f.type || 'text',
        required: !!f.required,
        source_key: f.suggested_source || null,
        source_label: f.suggested_source_label || (f.suggested_source ? `AI → ${f.suggested_source}` : 'Not matched — review needed'),
        fill_method: f.type === 'select' ? 'select_by_text' : f.type === 'checkbox' ? 'checkbox' : f.suggested_source ? 'value' : 'manual',
        confidence: f.ai_confidence || 0,
        options: f.options,
        sort_order: i,
        review_status: (f.ai_confidence || 0) >= 0.85 ? 'approved' as const : 'pending' as const,
      }));
    }

    // Fallback: use local field-matcher
    return matchAllFields(scannedFields);
  }, [scannedFields]);

  const total = fields.length;
  const requiredCount = fields.filter(f => f.required).length;

  const [idx, setIdx] = useState(0);
  const [reviews, setReviews] = useState<Record<number, ReviewState>>({});
  const [animating, setAnimating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const field = fields[idx];
  const review = reviews[idx];

  const goTo = useCallback((next: number) => {
    setAnimating(true);
    setTimeout(() => { setIdx(next); setAnimating(false); setManualInput(''); }, 250);
  }, []);

  const advance = useCallback(() => {
    if (idx < total - 1) goTo(idx + 1);
    else setShowSummary(true);
  }, [idx, total, goTo]);

  const handleApprove = useCallback(() => {
    setReviews(prev => ({ ...prev, [idx]: { status: 'approved' } }));
    advance();
  }, [idx, advance]);

  const handleManual = useCallback(() => {
    setReviews(prev => ({ ...prev, [idx]: { status: 'manual', manualValue: manualInput || '' } }));
    advance();
  }, [idx, advance, manualInput]);

  const handleSourceSelect = useCallback((key: string, label: string) => {
    setReviews(prev => ({ ...prev, [idx]: { status: 'edited', editedSourceLabel: label, editedSourceKey: key } }));
    setShowModal(false);
    advance();
  }, [idx, advance]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showModal || showSummary) return;
      if (e.key === 'Enter') { e.preventDefault(); handleApprove(); }
      if (e.key === 'Escape') { e.preventDefault(); handleManual(); }
      if (e.key === 'Backspace' && idx > 0) { e.preventDefault(); goTo(idx - 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleApprove, handleManual, goTo, idx, showModal, showSummary]);

  // Summary stats
  const approved = Object.values(reviews).filter(r => r.status === 'approved').length;
  const manual = Object.values(reviews).filter(r => r.status === 'manual').length;
  const edited = Object.values(reviews).filter(r => r.status === 'edited').length;

  // Handle save
  const handleSave = () => {
    // Build final fields with review overrides
    const finalFields = fields.map((f, i) => {
      const rev = reviews[i];
      if (rev?.status === 'manual') {
        return { ...f, source_key: null, fill_method: 'manual', default_value: rev.manualValue, review_status: 'manual' as const };
      }
      if (rev?.status === 'edited') {
        return { ...f, source_key: rev.editedSourceKey || f.source_key, review_status: 'edited' as const };
      }
      return { ...f, review_status: (rev?.status || f.review_status) as any };
    });
    onFieldsReviewed(finalFields);
    onNext();
  };

  if (!fields.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No fields to review. Go back and scan a portal first.</p>
        <button className="btn-ghost" onClick={onBack} style={{ marginTop: '16px' }}>← Back</button>
      </div>
    );
  }

  if (showSummary) {
    const autoMapped = total - Object.keys(reviews).length + approved;
    return (
      <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '32px' }}>
        <div className="success-icon-animate" style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'var(--gradient-success)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Check className="w-8 h-8" style={{ color: '#fff' }} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Outfit', 'Inter', sans-serif", margin: '0 0 8px' }}>
          {total} fields reviewed
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          {autoMapped} auto-mapped • {manual} manual • {edited} edited by you
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px',
          maxWidth: '420px', margin: '0 auto 32px',
        }}>
          {[
            { label: 'Auto-mapped', value: autoMapped, color: 'var(--success)' },
            { label: 'Manual', value: manual, color: 'var(--warn)' },
            { label: 'Edited', value: edited, color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '16px', borderRadius: 'var(--radius-lg)',
              background: 'var(--card-bg)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button className="btn-friendly" onClick={handleSave} style={{ fontSize: '15px', padding: '14px 36px' }}>
          Save Portal Mapping
        </button>
      </div>
    );
  }

  const isManualReview = review?.status === 'manual';

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Field {idx + 1} of {total}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {requiredCount} required
          </span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Field card */}
      <div
        key={idx}
        className={animating ? 'field-card-exit' : 'field-card-enter'}
        style={{
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: '32px', marginBottom: '24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 800, fontFamily: "'Outfit', 'Inter', sans-serif", margin: 0 }}>
                {field.portal_label}
              </h3>
              {field.required && <span style={{ color: 'var(--error)', fontSize: '18px', fontWeight: 700 }}>*</span>}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {field.portal_selector}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TypeBadge type={field.type} />
            <ConfidenceDot confidence={field.confidence} />
          </div>
        </div>

        {/* AI-suggested source */}
        <div style={{
          fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          📄 {review?.editedSourceLabel || field.source_label}
        </div>

        {/* Value box */}
        {isManualReview ? (
          <div className="field-value-box field-value-box--manual" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warn)', marginBottom: '8px' }}>
              ✋ Operator will type this each time
            </label>
            <input
              className="clean-input"
              placeholder="Default value (optional)"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <div className={`field-value-box ${!field.source_key ? 'field-value-box--empty' : ''}`}>
            {field.source_key ? `Mapped: ${field.source_key}` : 'No match found — review needed'}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
        <button className="btn-success" onClick={handleApprove} style={{ fontSize: '14px', padding: '12px 24px' }}>
          <Check className="w-4 h-4" /> Looks Correct
        </button>
        <button className="btn-ghost" onClick={() => setShowModal(true)} style={{ fontSize: '14px' }}>
          <Edit3 className="w-4 h-4" /> Change Source
        </button>
        <button
          className="btn-ghost"
          onClick={handleManual}
          style={{ fontSize: '14px', borderColor: 'var(--warn)', color: 'var(--warn)' }}
        >
          <ArrowRight className="w-4 h-4" /> Mark as Manual
        </button>
      </div>

      {/* Sub-nav + keyboard hints */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', marginBottom: '12px' }}>
        <button
          onClick={() => idx > 0 && goTo(idx - 1)}
          disabled={idx === 0}
          style={{ fontSize: '13px', color: idx > 0 ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: idx > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <ChevronLeft className="w-4 h-4" /> Previous field
        </button>
        <button
          onClick={() => setShowSummary(true)}
          style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Skip to end <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard hints */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span className="kbd-hint"><span className="kbd">Enter</span> Approve</span>
        <span className="kbd-hint"><span className="kbd">Esc</span> Manual</span>
        <span className="kbd-hint"><span className="kbd">⌫</span> Previous</span>
      </div>

      {/* Change Source Modal */}
      {showModal && (
        <ChangeSourceModal
          currentLabel={field.portal_label}
          onSelect={handleSourceSelect}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
