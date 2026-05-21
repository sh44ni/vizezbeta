'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, Loader, X, Zap, AlertTriangle, Plus, Trash2, ChevronDown, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { PortalType } from '../portal-types';

// ── Document type options ──
const DOC_LABELS = [
  { value: 'passport', label: 'Passport', emoji: '🛂', color: '#7c5cfc', bg: 'rgba(124,92,252,0.1)' },
  { value: 'work_permit', label: 'Work Permit', emoji: '📄', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  { value: 'letter', label: 'Letter / NOC', emoji: '✉️', color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
  { value: 'id_card', label: 'ID Card', emoji: '🪪', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  { value: 'booking', label: 'Booking Confirmation', emoji: '🎫', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  { value: 'certificate', label: 'Certificate', emoji: '📜', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  { value: 'other', label: 'Other Document', emoji: '📎', color: '#a5a0d0', bg: 'rgba(165,160,208,0.1)' },
];

interface DocSlot {
  id: string;
  type: string;
  required: boolean;
  file: File | null;
  preview: string | null;
}

interface ExtractedData {
  passportData: Record<string, any>;
  workPermitData: Record<string, any> | null;
  _mrzQuality?: string;
  _validation?: string[];
}

interface Props {
  onNext: () => void;
  onBack: () => void;
  onExtractedData: (data: ExtractedData) => void;
  onDocumentConfig: (config: Array<{type: string; required: boolean}>) => void;
  extractedData: ExtractedData | null;
  portalType: PortalType | null;
}

let slotCounter = 0;
function makeSlot(type: string, required: boolean): DocSlot {
  return { id: `doc-${++slotCounter}`, type, required, file: null, preview: null };
}

export default function Step3Upload({ onNext, onBack, onExtractedData, onDocumentConfig, extractedData, portalType }: Props) {
  const isWebForm = portalType === 'web_form';

  // Dynamic document slots
  const [slots, setSlots] = useState<DocSlot[]>(() => {
    if (isWebForm) {
      return [
        makeSlot('id_card', true),
      ];
    }
    return [
      makeSlot('passport', true),
      makeSlot('work_permit', false),
    ];
  });

  const [extracting, setExtracting] = useState(false);
  const [extractStage, setExtractStage] = useState('');
  const [error, setError] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync document config to parent whenever slots change
  React.useEffect(() => {
    onDocumentConfig(slots.map(s => ({ type: s.type, required: s.required })));
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slot management ──
  const addSlot = useCallback(() => {
    const usedTypes = slots.map(s => s.type);
    const nextType = DOC_LABELS.find(d => !usedTypes.includes(d.value))?.value || 'other';
    setSlots(prev => [...prev, makeSlot(nextType, false)]);
  }, [slots]);

  const removeSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSlotType = useCallback((id: string, type: string) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, type } : s));
  }, []);

  const toggleRequired = useCallback((id: string) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, required: !s.required } : s));
  }, []);

  const handleFileSelect = useCallback((id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSlots(prev => prev.map(s => s.id === id ? { ...s, file, preview: reader.result as string } : s));
    };
    reader.readAsDataURL(file);
    setError('');
  }, []);

  const clearFile = useCallback((id: string) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, file: null, preview: null } : s));
  }, []);

  // ── Extract ──
  const requiredSlots = slots.filter(s => s.required);
  const allRequiredUploaded = requiredSlots.every(s => s.file !== null);
  const anyFileUploaded = slots.some(s => s.file !== null);

  const handleExtract = async () => {
    if (!allRequiredUploaded) {
      setError('Please upload all required documents before extracting');
      return;
    }

    setExtracting(true);
    setError('');
    setExtractStage('Uploading documents...');

    try {
      const fd = new FormData();

      // Map slots to backend field names — passport and work_permit are the recognized keys
      for (const slot of slots) {
        if (!slot.file) continue;
        if (slot.type === 'passport') {
          fd.append('passport', slot.file);
        } else if (slot.type === 'work_permit') {
          fd.append('work_permit', slot.file);
        } else {
          // Additional documents — send as extra_docs for future backend support
          fd.append('passport', slot.file); // fallback: treat first as passport for now
        }
      }

      fd.append('model', 'gpt-4o');

      setExtractStage('AI reading document fields...');
      const res = await apiFetch('/api/extract-manual', { method: 'POST', body: fd });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      setExtractStage('Validating extracted data...');
      const data = await res.json();

      onExtractedData(data);
      setExtractStage('Done!');
    } catch (err: any) {
      setError(err.message || 'Extraction failed');
      setExtractStage('');
    } finally {
      setExtracting(false);
    }
  };

  const ppData = extractedData?.passportData;
  const isExtracted = !!ppData;

  return (
    <div className="animate-card-appear">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{
          fontSize: '24px', fontWeight: 800,
          fontFamily: "'Outfit', 'Inter', sans-serif", margin: '0 0 8px',
        }}>
          Configure source documents
        </h2>
        <p style={{
          fontSize: '14px', color: 'var(--text-muted)',
          maxWidth: '560px', margin: '0 auto', lineHeight: 1.7,
        }}>
          {isWebForm
            ? 'Add the documents your operators will upload for each submission — IDs, confirmations, certificates, or any source files.'
            : 'Add the documents your operators will need for each applicant. Upload a sample of each to extract test data for field mapping.'}
        </p>
      </div>

      {/* Document Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '28px 0 20px' }}>
        {slots.map((slot, idx) => {
          const docLabel = DOC_LABELS.find(d => d.value === slot.type) || DOC_LABELS[DOC_LABELS.length - 1];
          return (
            <div
              key={slot.id}
              className="animate-card-appear"
              style={{
                animationDelay: `${idx * 0.05}s`,
                background: 'var(--card-bg)',
                border: `1px solid ${slot.file ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Row 1: Type selector + Required toggle + Remove */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: slot.file ? '12px' : '0' }}>
                {/* Doc type icon */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: docLabel.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: '18px',
                }}>
                  {docLabel.emoji}
                </div>

                {/* Type dropdown */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <select
                    value={slot.type}
                    onChange={e => updateSlotType(slot.id, e.target.value)}
                    disabled={extracting}
                    style={{
                      width: '100%', padding: '8px 32px 8px 12px',
                      background: 'var(--input-bg)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                      fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
                      appearance: 'none', cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {DOC_LABELS.map(d => (
                      <option key={d.value} value={d.value}>{d.emoji} {d.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4" style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', pointerEvents: 'none',
                  }} />
                </div>

                {/* Required toggle */}
                <button
                  onClick={() => toggleRequired(slot.id)}
                  disabled={extracting}
                  style={{
                    padding: '6px 12px', borderRadius: '99px', border: 'none',
                    background: slot.required ? 'var(--error-bg)' : 'var(--surface-2)',
                    color: slot.required ? 'var(--error)' : 'var(--text-muted)',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {slot.required ? '● Required' : '○ Optional'}
                </button>

                {/* Upload button */}
                {!slot.file && (
                  <button
                    onClick={() => fileInputRefs.current[slot.id]?.click()}
                    disabled={extracting}
                    style={{
                      padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', background: 'var(--surface-2)',
                      color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                )}

                {/* File status */}
                {slot.file && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: 600, color: 'var(--success)',
                  }}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {slot.file.name}
                    </span>
                    <button
                      onClick={() => clearFile(slot.id)}
                      disabled={extracting}
                      style={{
                        width: '20px', height: '20px', borderRadius: '50%', border: 'none',
                        background: 'rgba(248,113,113,0.15)', color: 'var(--error)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Remove slot */}
                {slots.length > 1 && (
                  <button
                    onClick={() => removeSlot(slot.id)}
                    disabled={extracting}
                    style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {/* Hidden file input */}
                <input
                  ref={el => { fileInputRefs.current[slot.id] = el; }}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(slot.id, f);
                  }}
                />
              </div>

              {/* Preview thumbnail (when file is uploaded) */}
              {slot.preview && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  paddingTop: '12px', borderTop: '1px solid var(--border)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot.preview}
                    alt={docLabel.label}
                    style={{
                      width: '80px', height: '56px', objectFit: 'cover',
                      borderRadius: '6px', border: '1px solid var(--border)',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {docLabel.emoji} {docLabel.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {(slot.file!.size / 1024).toFixed(0)} KB • {slot.file!.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Document Button */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <button
          onClick={addSlot}
          disabled={extracting || slots.length >= DOC_LABELS.length}
          style={{
            padding: '10px 20px', borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--border)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Plus className="w-4 h-4" /> Add another document
        </button>
      </div>

      {/* Summary pill */}
      <div style={{
        textAlign: 'center', marginBottom: '20px',
        fontSize: '12px', color: 'var(--text-muted)',
      }}>
        {slots.length} document{slots.length !== 1 ? 's' : ''} configured
        {' • '}
        {requiredSlots.length} required
        {' • '}
        {slots.filter(s => s.file).length} uploaded
      </div>

      {/* Extract button */}
      {!isExtracted && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <button
            className="btn-friendly"
            onClick={handleExtract}
            disabled={!anyFileUploaded || extracting || !allRequiredUploaded}
            style={{
              fontSize: '15px', padding: '14px 36px',
              opacity: allRequiredUploaded && anyFileUploaded ? 1 : 0.5,
            }}
          >
            {extracting ? (
              <><Loader className="w-5 h-5 animate-spin" /> {extractStage}</>
            ) : (
              <><Zap className="w-5 h-5" /> Extract Data from Documents</>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          margin: '0 auto 16px', padding: '12px 20px', borderRadius: '10px',
          background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.15)',
          color: 'var(--error)', fontSize: '13px', fontWeight: 500,
          maxWidth: '520px', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Extraction result preview */}
      {isExtracted && (
        <div className="animate-card-appear" style={{
          background: 'var(--card-bg)', border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(52,211,153,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Data extracted successfully
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                MRZ: {extractedData?._mrzQuality || 'N/A'}
                {extractedData?.workPermitData ? ' • Work permit included' : ''}
                {' • '}{slots.filter(s => s.file).length} document{slots.filter(s => s.file).length !== 1 ? 's' : ''} processed
              </div>
            </div>
          </div>

          {/* Quick field preview */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px',
          }}>
            {Object.entries(ppData || {}).slice(0, 8).map(([key, val]) => (
              <div key={key} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {String(val || '—')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button
          className="btn-friendly"
          onClick={onNext}
          disabled={!isExtracted}
          style={{ fontSize: '14px', padding: '12px 28px', opacity: isExtracted ? 1 : 0.5 }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
