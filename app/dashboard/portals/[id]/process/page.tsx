'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Upload, FileCheck, Plus, X, Play, Loader,
  CheckCircle, AlertTriangle, Users, FileText, ChevronDown,
  Trash2, Send,
} from 'lucide-react';

const BACKEND_URL = '';

interface Applicant {
  id: string;
  files: Record<string, File>;        // docType → file
  extractedData: Record<string, Record<string, string>> | null;
  status: 'pending' | 'extracting' | 'ready' | 'sent' | 'error';
  error?: string;
}

interface PortalInfo {
  id: string;
  name: string;
  url_pattern: string;
  field_count: number;
  document_config: string[];           // e.g. ['Passport', 'Work Permit']
}

export default function BulkProcessPage() {
  const { id } = useParams<{ id: string }>();
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<{ appId: string; docType: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ mode: 'single' | 'all'; appId?: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Fetch portal info + document_config
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/portals/${id}`);
        if (res.ok) {
          const data = await res.json();
          const p = data.portal;
          setPortal({
            id: p.id,
            name: p.name,
            url_pattern: p.url_pattern,
            field_count: (p.fields || []).length,
            document_config: (p.document_config && p.document_config.length > 0) ? p.document_config : ['Passport'],
          });
        }
      } catch (err) {
        console.error('Failed to load portal:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const generateId = () => `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const addApplicant = useCallback(() => {
    const newApp: Applicant = {
      id: generateId(),
      files: {},
      extractedData: null,
      status: 'pending',
    };
    setApplicants(prev => [...prev, newApp]);
    // Auto-expand the new one
    setExpandedId(newApp.id);
  }, []);

  const removeApplicant = useCallback((appId: string) => {
    setApplicants(prev => prev.filter(a => a.id !== appId));
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload) return;
    setApplicants(prev => prev.map(a => {
      if (a.id !== pendingUpload.appId) return a;
      return { ...a, files: { ...a.files, [pendingUpload.docType]: file }, status: 'pending' as const, extractedData: null };
    }));
    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingUpload]);

  const triggerUpload = useCallback((appId: string, docType: string) => {
    setPendingUpload({ appId, docType });
    setTimeout(() => fileInputRef.current?.click(), 50);
  }, []);

  const removeFile = useCallback((appId: string, docType: string) => {
    setApplicants(prev => prev.map(a => {
      if (a.id !== appId) return a;
      const newFiles = { ...a.files };
      delete newFiles[docType];
      return { ...a, files: newFiles };
    }));
  }, []);

  // Extract all pending applicants
  const extractAll = useCallback(async () => {
    const pending = applicants.filter(a => a.status === 'pending' && Object.keys(a.files).length > 0);
    if (pending.length === 0) return;
    setProcessing(true);

    for (const applicant of pending) {
      setApplicants(prev => prev.map(a =>
        a.id === applicant.id ? { ...a, status: 'extracting' as const } : a
      ));

      try {
        const formData = new FormData();
        const docTypes = Object.keys(applicant.files);
        docTypes.forEach((docType, i) => {
          formData.append(`file_${i}`, applicant.files[docType]);
          formData.append(`name_${i}`, docType);
        });

        const res = await fetch('/api/extract-manual', { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`Extraction failed (${res.status})`);
        const data = await res.json();

        setApplicants(prev => prev.map(a =>
          a.id === applicant.id ? { ...a, extractedData: data, status: 'ready' as const } : a
        ));
      } catch (err) {
        setApplicants(prev => prev.map(a =>
          a.id === applicant.id ? { ...a, status: 'error' as const, error: (err as Error).message } : a
        ));
      }
    }

    setProcessing(false);
  }, [applicants]);

  // Build queue and send to extension
  const doSendToExtension = useCallback((appIds: string[]) => {
    if (!portal) return;
    const targets = applicants.filter(a => appIds.indexOf(a.id) >= 0 && a.extractedData);
    if (targets.length === 0) return;

    setSending(true);

    // Flatten extracted data for each applicant into the queue format
    // The popup expects: { name, nationality, passport_number, payload: { flat_fields }, status }
    const queue = targets.map(a => {
      // Merge all doc fields into a single flat object for the filler
      const merged: Record<string, string> = {};
      if (a.extractedData) {
        Object.keys(a.extractedData).forEach(docName => {
          const fields = a.extractedData![docName];
          if (fields) {
            Object.keys(fields).forEach(key => {
              // Store flat (last doc wins for collisions)
              merged[key] = fields[key];
              // Also store with doc prefix for resolveValue: "passport.surname"
              const prefix = docName.toLowerCase().replace(/\s+/g, '_');
              merged[prefix + '.' + key] = fields[key];
            });
          }
        });
      }

      // Extract display info from passport data
      const pp = a.extractedData?.Passport || {};
      const name = [pp.surname, pp.first_name, pp.given_names].filter(Boolean).join(' ') || `Applicant`;

      return {
        name,
        nationality: pp.nationality || merged.nationality || '',
        passport_number: pp.passport_number || merged.passport_number || '',
        payload: merged,
        status: 'pending',
      };
    });

    // Send via the VIZEZ_SEND_QUEUE message protocol
    window.postMessage({
      type: 'VIZEZ_SEND_QUEUE',
      queue,
      portalId: portal.id,
    }, '*');

    // Listen for confirmation
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'VIZEZ_QUEUE_SAVED') {
        setApplicants(prev => prev.map(a =>
          appIds.indexOf(a.id) >= 0 && a.status === 'ready'
            ? { ...a, status: 'sent' as const }
            : a
        ));
        setSending(false);
        setConfirmModal(null);
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);

    // Timeout: mark sent anyway after 5s
    setTimeout(() => {
      setApplicants(prev => prev.map(a =>
        appIds.indexOf(a.id) >= 0 && a.status === 'ready'
          ? { ...a, status: 'sent' as const }
          : a
      ));
      setSending(false);
      setConfirmModal(null);
      window.removeEventListener('message', handler);
    }, 5000);
  }, [applicants, portal]);

  const handleConfirmSend = useCallback(() => {
    if (!confirmModal) return;
    if (confirmModal.mode === 'single' && confirmModal.appId) {
      doSendToExtension([confirmModal.appId]);
    } else {
      const readyIds = applicants.filter(a => a.status === 'ready').map(a => a.id);
      doSendToExtension(readyIds);
    }
  }, [confirmModal, applicants, doSendToExtension]);

  const readyCount = applicants.filter(a => a.status === 'ready').length;
  const sentCount = applicants.filter(a => a.status === 'sent').length;
  const pendingCount = applicants.filter(a => a.status === 'pending' && Object.keys(a.files).length > 0).length;

  const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    pending: { color: 'rgba(255,255,255,0.50)', bg: 'rgba(255,255,255,0.04)', label: 'Pending', icon: <FileText size={12} /> },
    extracting: { color: '#7c5cfc', bg: 'rgba(124,92,252,0.10)', label: 'Extracting...', icon: <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> },
    ready: { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)', label: 'Ready', icon: <CheckCircle size={12} /> },
    sent: { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', label: 'Sent to Extension', icon: <CheckCircle size={12} /> },
    error: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', label: 'Error', icon: <AlertTriangle size={12} /> },
  };

  if (loading) {
    return (
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <Loader size={24} style={{ color: 'rgba(255,255,255,0.30)', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Loading portal...</p>
        </div>
      </main>
    );
  }

  const docTypes = portal?.document_config || [];

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" hidden onChange={handleFileSelected} />

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => !sending && setConfirmModal(null)}>
          <div style={{
            background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
            padding: '32px', maxWidth: '440px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.50)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '12px',
              background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={24} style={{ color: '#fbbf24' }} />
            </div>
            <h3 style={{
              fontSize: '18px', fontWeight: 700, textAlign: 'center', margin: '0 0 8px',
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}>
              Send to Extension?
            </h3>
            <p style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.50)', textAlign: 'center',
              margin: '0 0 8px', lineHeight: 1.6,
            }}>
              This will replace any existing applicant data in the VizEz extension.
              Previous data in the extension queue will be <strong style={{ color: '#f87171' }}>permanently lost</strong>.
            </p>
            <div style={{
              padding: '10px 14px', borderRadius: '8px', margin: '12px 0 20px',
              background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.10)',
              fontSize: '12px', color: 'rgba(255,255,255,0.50)', textAlign: 'center',
            }}>
              {confirmModal.mode === 'single' ? '1 applicant' : `${readyCount} applicant${readyCount !== 1 ? 's' : ''}`} will be sent to the extension
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                disabled={sending}
                style={{
                  flex: 1, padding: '11px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.10)', background: 'transparent',
                  color: 'rgba(255,255,255,0.60)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={sending}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '11px', borderRadius: '8px', border: 'none',
                  background: sending ? 'rgba(124,92,252,0.4)' : '#7c5cfc',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? (
                  <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                ) : (
                  <><Send size={14} /> Send to Extension</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* Back */}
          <Link href="/dashboard/portals" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', color: 'rgba(255,255,255,0.40)', textDecoration: 'none',
            marginBottom: '20px', transition: 'color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#7c5cfc'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
          >
            <ArrowLeft size={14} /> Back to Portal Manager
          </Link>

          {/* Header */}
          <div style={{ marginBottom: '8px' }}>
            <h2 style={{
              fontSize: '26px', fontWeight: 800, margin: 0,
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}>
              Bulk Processing
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: '4px 0 0' }}>
              {portal?.name} • {docTypes.length} document{docTypes.length !== 1 ? 's' : ''} required per applicant
              <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: '6px' }}>
                ({docTypes.join(', ')})
              </span>
            </p>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex', gap: '16px', padding: '16px 20px', marginTop: '20px', marginBottom: '24px',
            background: '#0a0a0a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
            alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} style={{ color: '#7c5cfc' }} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{applicants.length}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>applicants</span>
            </div>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>Ready:</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>{readyCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>Sent:</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>{sentCount}</span>
            </div>
            <div style={{ flex: 1 }} />
            {readyCount > 0 && (
              <button
                onClick={() => setConfirmModal({ mode: 'all' })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 18px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  marginRight: '8px',
                }}
              >
                <Send size={14} /> Send All to Extension ({readyCount})
              </button>
            )}
            {pendingCount > 0 && (
              <button
                onClick={extractAll}
                disabled={processing}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: processing ? 'rgba(124,92,252,0.3)' : '#7c5cfc',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                {processing ? (
                  <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Extracting...</>
                ) : (
                  <><Play size={14} style={{ fill: 'currentColor' }} /> Extract All ({pendingCount})</>
                )}
              </button>
            )}
          </div>

          {/* Applicant list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {applicants.map((app, idx) => {
              const isExpanded = expandedId === app.id;
              const sc = statusConfig[app.status] || statusConfig.pending;
              const uploadedCount = Object.keys(app.files).length;
              const allUploaded = uploadedCount === docTypes.length;

              // Get applicant name from extracted passport data
              let applicantLabel = `Applicant ${idx + 1}`;
              if (app.extractedData?.Passport) {
                const pp = app.extractedData.Passport;
                const name = [pp.surname, pp.first_name].filter(Boolean).join(' ');
                if (name) applicantLabel = name;
              }

              return (
                <div key={app.id} className="animate-card-appear" style={{
                  background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px', overflow: 'hidden',
                }}>
                  {/* Header row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '12px',
                    cursor: 'pointer',
                  }} onClick={() => setExpandedId(isExpanded ? null : app.id)}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: 'rgba(124,92,252,0.12)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: '#7c5cfc', flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{applicantLabel}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                        {uploadedCount}/{docTypes.length} documents uploaded
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                      color: sc.color, background: sc.bg,
                    }}>
                      {sc.icon} {sc.label}
                    </span>
                    {app.status === 'ready' && (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmModal({ mode: 'single', appId: app.id }); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 14px', borderRadius: '8px', border: 'none',
                          background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                          color: '#000', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        <Send size={12} /> Send
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); removeApplicant(app.id); }}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.20)', padding: '4px', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.20)'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronDown size={16} style={{
                      color: 'rgba(255,255,255,0.30)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                    }} />
                  </div>

                  {/* Expanded: document upload slots */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 18px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '14px' }}>
                        {docTypes.map(docType => {
                          const file = app.files[docType];
                          return (
                            <div key={docType} style={{
                              display: 'flex', alignItems: 'center', gap: '12px',
                              padding: '10px 14px', borderRadius: '10px',
                              background: file ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${file ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)'}`,
                              transition: 'all 0.15s',
                            }}>
                              {file ? (
                                <FileCheck size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                              ) : (
                                <Upload size={16} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{docType}</div>
                                {file ? (
                                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                                    {file.name} • {(file.size / 1024).toFixed(0)} KB
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>
                                    No file uploaded
                                  </div>
                                )}
                              </div>
                              {file ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => triggerUpload(app.id, docType)}
                                    style={{
                                      background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px',
                                      padding: '5px 10px', color: 'rgba(255,255,255,0.50)', fontSize: '11px',
                                      fontWeight: 600, cursor: 'pointer',
                                    }}
                                  >Replace</button>
                                  <button
                                    onClick={() => removeFile(app.id, docType)}
                                    style={{
                                      background: 'transparent', border: 'none', cursor: 'pointer',
                                      color: 'rgba(255,255,255,0.25)', padding: '2px',
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => triggerUpload(app.id, docType)}
                                  disabled={app.status !== 'pending'}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                                    background: '#7c5cfc', color: '#fff', fontSize: '12px',
                                    fontWeight: 600, cursor: 'pointer',
                                  }}
                                >
                                  <Upload size={12} /> Upload
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Extracted data preview */}
                      {app.extractedData && (
                        <div style={{
                          marginTop: '12px', padding: '12px', borderRadius: '8px',
                          background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.10)',
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
                            ✓ Extracted Data Preview
                          </div>
                          {Object.entries(app.extractedData).map(([docName, fields]) => (
                            <div key={docName} style={{ marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.60)' }}>{docName}:</span>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', marginLeft: '6px' }}>
                                {Object.keys(fields || {}).length} fields extracted
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {app.error && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                          fontSize: '12px', color: '#f87171',
                        }}>
                          <AlertTriangle size={12} /> {app.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add applicant button */}
          <button
            onClick={addApplicant}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '16px', marginTop: '16px',
              borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.08)',
              background: 'transparent', color: 'rgba(255,255,255,0.40)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#7c5cfc';
              e.currentTarget.style.color = '#7c5cfc';
              e.currentTarget.style.background = 'rgba(124,92,252,0.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.40)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Plus size={18} /> Add Applicant
          </button>

          {/* Empty state */}
          {applicants.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 24px', marginTop: '20px',
              borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)',
              background: '#0a0a0a',
            }}>
              <Users size={40} style={{ color: 'rgba(255,255,255,0.10)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Outfit', sans-serif", margin: '0 0 8px' }}>
                No applicants added yet
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: '0 0 8px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                Add applicants and upload their documents. Each applicant needs:
              </p>
              <div style={{
                display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap',
                marginBottom: '24px',
              }}>
                {docTypes.map(dt => (
                  <span key={dt} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                    background: 'rgba(124,92,252,0.08)', color: '#7c5cfc',
                    border: '1px solid rgba(124,92,252,0.15)',
                  }}>
                    <FileText size={12} /> {dt}
                  </span>
                ))}
              </div>
              <button
                onClick={addApplicant}
                className="btn-friendly"
                style={{ fontSize: '14px', padding: '12px 28px' }}
              >
                <Plus size={16} /> Add First Applicant
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
