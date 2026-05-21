'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileCheck, Plus, X, Pencil, Loader,
  AlertTriangle, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';

interface Props {
  onExtractComplete: (data: Record<string, Record<string, string>>) => void;
  onBack: () => void;
}

interface DocumentEntry {
  id: string;
  name: string;
  file: File | null;
  editing: boolean;
}

interface ExtractedPreview {
  [docName: string]: Record<string, string>;
}

/* ── Single Document Card ── */
function DocumentCard({
  doc,
  onFileSelect,
  onRemove,
  onRename,
  onToggleEditing,
}: {
  doc: DocumentEntry;
  onFileSelect: (id: string, file: File) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onToggleEditing: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(doc.id, f);
  }, [doc.id, onFileSelect]);

  const dropZoneStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '10px',
    border: `1px dashed ${dragOver ? '#7c5cfc' : doc.file ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.10)'}`,
    background: dragOver ? 'rgba(124,92,252,0.08)' : doc.file ? 'rgba(74,222,128,0.03)' : 'rgba(255,255,255,0.02)',
    padding: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '10px', cursor: 'pointer',
    transition: 'border-color 0.15s ease, background 0.15s ease',
    minHeight: '56px',
  };

  return (
    <div className="animate-card-appear" style={{
      background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '14px', padding: '18px 20px',
    }}>
      {/* Doc header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <FileText size={18} style={{ color: '#7c5cfc', flexShrink: 0 }} />
          {doc.editing ? (
            <input
              autoFocus
              defaultValue={doc.name}
              onBlur={e => onRename(doc.id, e.target.value.trim() || doc.name)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onRename(doc.id, (e.target as HTMLInputElement).value.trim() || doc.name);
                }
              }}
              style={{
                background: '#111111', border: '1px solid #7c5cfc', borderRadius: '6px',
                padding: '4px 10px', color: '#ffffff', fontSize: '14px', fontWeight: 600,
                outline: 'none', flex: 1, minWidth: 0,
              }}
            />
          ) : (
            <span
              style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
              onClick={() => onToggleEditing(doc.id)}
              title="Click to rename"
            >
              {doc.name}
              <Pencil size={12} style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.25)', verticalAlign: 'middle' }} />
            </span>
          )}
        </div>
        <button
          onClick={() => onRemove(doc.id)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.30)', padding: '4px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.30)'; }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        style={dropZoneStyle}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          hidden
          onChange={e => { if (e.target.files?.[0]) onFileSelect(doc.id, e.target.files[0]); }}
        />
        {doc.file ? (
          <>
            <FileCheck size={20} style={{ color: '#4ade80', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 600, color: '#ffffff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {doc.file.name}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                {(doc.file.size / 1024).toFixed(0)} KB • Click to replace
              </div>
            </div>
          </>
        ) : (
          <>
            <Upload size={20} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)' }}>
              Drop image/PDF or click to upload
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Preset document types ── */
const DOCUMENT_TYPES = [
  'Passport',
  'Work Permit',
  'Emirates ID',
  'National ID',
  'Labor Card',
  'Medical Report',
  'Sponsor ID',
  'Visa Copy',
  'Employment Contract',
  'Trade License',
  'Birth Certificate',
  'Marriage Certificate',
  'Police Clearance',
  'Education Certificate',
  'Other',
];

/* ── Main Component ── */
export default function Step3Upload({ onExtractComplete, onBack }: Props) {
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<ExtractedPreview | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  const generateId = () => `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Get which preset types are already added
  const usedNames = documents.map(d => d.name);
  const availableTypes = DOCUMENT_TYPES.filter(t => t === 'Other' || !usedNames.includes(t));

  const handleSelectDocType = useCallback((type: string) => {
    if (type === 'Other') {
      setShowOtherInput(true);
      return;
    }
    setDocuments(prev => [...prev, { id: generateId(), name: type, file: null, editing: false }]);
    setError(null);
  }, []);

  const handleAddCustom = useCallback(() => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setDocuments(prev => [...prev, { id: generateId(), name: trimmed, file: null, editing: false }]);
    setCustomName('');
    setShowOtherInput(false);
    setError(null);
  }, [customName]);

  const handleRemoveDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleRenameDocument = useCallback((id: string, newName: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, name: newName, editing: false } : d));
  }, []);

  const toggleEditing = useCallback((id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, editing: !d.editing } : d));
  }, []);

  const handleFileSelect = useCallback((id: string, file: File) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, file } : d));
    setError(null);
  }, []);

  const allFilesUploaded = documents.length >= 1 && documents.every(d => d.file !== null);

  const handleExtractAll = useCallback(async () => {
    if (!allFilesUploaded) {
      setError('Please upload a file for each document.');
      return;
    }

    setProcessing(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();
      documents.forEach((doc, i) => {
        if (doc.file) {
          formData.append(`file_${i}`, doc.file);
          formData.append(`name_${i}`, doc.name);
        }
      });

      setProgress(30);

      const res = await fetch('/api/extract-manual', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!res.ok) {
        throw new Error(`Extraction failed (${res.status})`);
      }

      const data: Record<string, Record<string, string>> = await res.json();
      setProgress(100);
      setExtractedPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed. Please try again.');
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }, [documents, allFilesUploaded]);

  const handleContinue = useCallback(() => {
    if (extractedPreview) {
      onExtractComplete(extractedPreview);
    }
  }, [extractedPreview, onExtractComplete]);

  const toggleDocExpanded = useCallback((docName: string) => {
    setExpandedDocs(prev => ({ ...prev, [docName]: !prev[docName] }));
  }, []);

  return (
    <div className="animate-card-appear">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{
          fontSize: '24px', fontWeight: 800,
          fontFamily: "'Outfit', 'Inter', sans-serif", margin: '0 0 8px',
        }}>
          Upload Your Documents
        </h2>
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.45)', maxWidth: '520px',
          margin: '0 auto', lineHeight: 1.7,
        }}>
          Select the documents needed for this portal. Upload each one and the AI will extract data for auto-mapping.
        </p>
      </div>

      {/* Extraction not done yet */}
      {!extractedPreview && (
        <>
          {/* Document cards */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '12px',
            margin: '28px 0 16px',
          }}>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onFileSelect={handleFileSelect}
                onRemove={handleRemoveDocument}
                onRename={handleRenameDocument}
                onToggleEditing={toggleEditing}
              />
            ))}
          </div>

          {/* Add document dropdown */}
          {showOtherInput ? (
            <div className="animate-card-appear" style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '24px',
            }}>
              <input
                autoFocus
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCustom(); if (e.key === 'Escape') { setShowOtherInput(false); setCustomName(''); } }}
                placeholder="Enter custom document name..."
                style={{
                  flex: 1, background: '#111111',
                  border: '1px solid rgba(124,92,252,0.4)', borderRadius: '8px',
                  padding: '10px 14px', color: '#ffffff', fontSize: '14px',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#7c5cfc'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(124,92,252,0.4)'; }}
              />
              <button
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: customName.trim() ? '#7c5cfc' : 'rgba(124,92,252,0.3)',
                  color: '#ffffff', fontSize: '13px', fontWeight: 700,
                  cursor: customName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add
              </button>
              <button
                onClick={() => { setShowOtherInput(false); setCustomName(''); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.40)', padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <select
                value=""
                onChange={e => { if (e.target.value) handleSelectDocType(e.target.value); }}
                style={{
                  width: '100%', padding: '14px 40px 14px 16px',
                  borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.12)',
                  background: '#0a0a0a', color: 'rgba(255,255,255,0.50)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  outline: 'none', appearance: 'none',
                  WebkitAppearance: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#7c5cfc'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                <option value="" disabled>＋ Add Document...</option>
                {availableTypes.map(type => (
                  <option key={type} value={type} style={{
                    background: '#111111', color: '#ffffff',
                  }}>
                    {type === 'Other' ? '📝 Other (custom name)' : type}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} style={{
                position: 'absolute', right: '14px', top: '50%',
                transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.30)',
                pointerEvents: 'none',
              }} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              marginBottom: '16px', fontSize: '13px', color: '#f87171', fontWeight: 500,
            }}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Extract button */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <button
              className="btn-friendly"
              onClick={handleExtractAll}
              disabled={processing || !allFilesUploaded || documents.length === 0}
              style={{
                fontSize: '15px', padding: '14px 32px',
                opacity: !allFilesUploaded || documents.length === 0 ? 0.4 : 1,
              }}
            >
              {processing ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {' '}Extracting data...
                </>
              ) : (
                <>📄 Extract All Documents</>
              )}
            </button>
          </div>
          {documents.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '6px 0 0' }}>
              Add at least one document to proceed
            </p>
          )}

          {/* Progress bar */}
          {processing && (
            <div style={{ maxWidth: '300px', margin: '16px auto 0' }}>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill progress-shimmer"
                  style={{ width: `${progress}%`, transition: 'width 0.4s ease' }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Extraction results */}
      {extractedPreview && (
        <div style={{ marginTop: '24px' }}>
          {/* Document result cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {Object.entries(extractedPreview).map(([docName, fields]) => {
              const fieldEntries = Object.entries(fields || {});
              const isExpanded = expandedDocs[docName] !== false; // default expanded

              return (
                <div key={docName} className="animate-card-appear" style={{
                  background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px', overflow: 'hidden',
                }}>
                  {/* Card header */}
                  <button
                    onClick={() => toggleDocExpanded(docName)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '12px',
                      padding: '16px 20px', background: 'transparent', border: 'none',
                      cursor: 'pointer', color: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileCheck size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{docName}</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                        background: 'rgba(74,222,128,0.08)', color: '#4ade80',
                      }}>
                        {fieldEntries.length} fields
                      </span>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.40)' }} />
                      : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.40)' }} />
                    }
                  </button>

                  {/* Extracted fields */}
                  {isExpanded && fieldEntries.length > 0 && (
                    <div style={{
                      padding: '0 20px 18px',
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px',
                    }}>
                      {fieldEntries.map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '13px', padding: '5px 0' }}>
                          <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 500, flexShrink: 0 }}>
                            {k}:
                          </span>
                          <span style={{
                            color: '#ffffff', fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px',
      }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        {extractedPreview && (
          <button
            className="btn-friendly"
            onClick={handleContinue}
            style={{ fontSize: '14px', padding: '12px 28px' }}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}
