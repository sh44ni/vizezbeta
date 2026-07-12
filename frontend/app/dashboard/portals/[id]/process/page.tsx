'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, apiPost } from '@/lib/api';
import {
  ArrowLeft, Upload, Loader, Zap, CheckCircle, X, AlertTriangle,
  Eye, ExternalLink, Users, Send,
} from 'lucide-react';
import AutoSubmitModal from './AutoSubmitModal';

const DOC_LABELS: Record<string, { label: string; emoji: string }> = {
  passport: { label: 'Passport', emoji: '🛂' },
  work_permit: { label: 'Work Permit', emoji: '📄' },
  letter: { label: 'Letter / NOC', emoji: '✉️' },
  id_card: { label: 'ID Card', emoji: '🪪' },
  booking: { label: 'Booking', emoji: '🎫' },
  certificate: { label: 'Certificate', emoji: '📜' },
  other: { label: 'Other', emoji: '📎' },
};

interface DocConfig { type: string; required: boolean; }
interface Applicant {
  id: number;
  file: File;
  preview: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
  data: Record<string, any> | null;
  passportData?: Record<string, any>;
  workPermitData?: Record<string, any>;
  error?: string;
}

type Phase = 'upload' | 'list';

export default function ProcessPage() {
  const params = useParams();
  const portalId = params?.id as string;
  const [portal, setPortal] = useState<any>(null);
  const [loadingPortal, setLoadingPortal] = useState(true);
  const [phase, setPhase] = useState<Phase>('upload');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<'legacy' | 'auto'>('legacy');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const idCounter = useRef(0);

  // Load portal
  React.useEffect(() => {
    if (!portalId) return;
    apiFetch(`/api/portals/${portalId}`)
      .then(r => r.json())
      .then(d => setPortal(d))
      .catch(() => {})
      .finally(() => setLoadingPortal(false));
  }, [portalId]);

  const docConfig: DocConfig[] = portal?.document_config?.length
    ? portal.document_config
    : [{ type: 'passport', required: true }];

  // Add files
  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const id = ++idCounter.current;
        setApplicants(prev => [...prev, {
          id, file, preview: reader.result as string,
          status: 'pending', data: null,
        }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeApplicant = useCallback((id: number) => {
    setApplicants(prev => prev.filter(a => a.id !== id));
  }, []);

  // Extract all
  const extractAll = async () => {
    setExtracting(true);
    const pending = applicants.filter(a => a.status === 'pending');
    for (const app of pending) {
      setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: 'extracting' } : a));
      try {
        const fd = new FormData();
        fd.append('passport', app.file);
        fd.append('model', 'gpt-4o');
        const res = await apiFetch('/api/extract-manual', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        const data = await res.json();
        const passportData = data.passportData || {};
        const workPermitData = data.workPermitData || {};
        const merged = { ...passportData, ...workPermitData };
        const nameParts = [merged.first_name, merged.surname].filter(Boolean);
        merged._name = nameParts.length ? nameParts.join(' ') : `Applicant ${app.id}`;
        merged._mrzQuality = data._mrzQuality;
        setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: 'done', data: merged, passportData, workPermitData } : a));
      } catch (err: any) {
        setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: 'error', error: err.message } : a));
      }
    }
    setExtracting(false);
    setPhase('list');
  };

  // Send entire queue to backend, then open portal
  const sendAndOpen = async () => {
    const queue = applicants
      .filter(a => a.status === 'done' && a.data)
      .map(a => {
        const payload: Record<string, any> = {};
        // Prefix passport fields with 'passport.' and work permit fields with 'work_permit.'
        if (a.passportData) {
          Object.entries(a.passportData).forEach(([k, v]) => {
            payload[`passport.${k}`] = v;
          });
        }
        if (a.workPermitData) {
          Object.entries(a.workPermitData).forEach(([k, v]) => {
            payload[`work_permit.${k}`] = v;
          });
        }
        return {
          name: a.data!._name,
          nationality: a.data!.nationality,
          passport_number: a.data!.passport_number,
          payload,
        };
      });

    setSending(true);
    setSendError(null);

    try {
      const res = await apiPost('/api/fill-queue', {
        portal_id: portalId,
        portal_name: portal?.name || 'Portal',
        queue,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save queue');
      setSent(true);
    } catch (err: any) {
      setSendError(err.message);
      setSending(false);
      return;
    }

    setSending(false);

    // Open portal after confirmed save
    if (portal?.url_pattern) {
      let url = (portal.url_pattern || '').replace(/^\*:\/\//, '').replace(/\/\*$/, '').replace(/\*/g, '');
      if (!url.startsWith('http')) url = 'https://' + url;
      window.open(url, '_blank');
    }
  };

  if (loadingPortal) {
    return (
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </main>
    );
  }

  if (!portal) {
    return (
      <main style={{ flex: 1, padding: '64px', textAlign: 'center' }}>
        <p style={{ color: 'var(--error)' }}>Portal not found</p>
        <Link href="/dashboard/portals" style={{ color: 'var(--accent)' }}>← Back to portals</Link>
      </main>
    );
  }

  const doneApplicants = applicants.filter(a => a.status === 'done');

  // ─── PHASE: UPLOAD ───
  if (phase === 'upload') {
    return (
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '36px 32px 64px' }}>
          <Link href="/dashboard/portals" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Portal Manager
          </Link>

          <div className="animate-card-appear" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: "'Outfit', sans-serif", margin: '0 0 8px' }}>
              {portal.name}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              Upload documents — accepts PDF, PNG, JPG. Select multiple at once.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
              {docConfig.map((dc: DocConfig, i: number) => {
                const dl = DOC_LABELS[dc.type] || DOC_LABELS.other;
                return (
                  <span key={i} style={{
                    fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '99px',
                    background: dc.required ? 'var(--error-bg)' : 'var(--surface-2)',
                    color: dc.required ? 'var(--error)' : 'var(--text-muted)',
                  }}>
                    {dl.emoji} {dl.label} {dc.required ? '· Required' : '· Optional'}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Drop zone */}
          <div
            className="animate-card-appear"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
            style={{
              border: '2px dashed var(--border)', borderRadius: 'var(--radius-xl)',
              padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
              background: 'var(--card-bg)', transition: 'all 0.2s',
              marginBottom: '24px',
            }}
          >
            <Upload className="w-10 h-10" style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Drop files here or click to browse
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Select multiple passport images or PDFs at once
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
          </div>

          {/* Uploaded thumbnails */}
          {applicants.length > 0 && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                {applicants.length} file{applicants.length !== 1 ? 's' : ''} selected
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                {applicants.map(app => (
                  <div key={app.id} className="animate-card-appear" style={{
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '8px', position: 'relative', textAlign: 'center',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={app.preview} alt="" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.file.name}
                    </div>
                    {app.status === 'extracting' && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader className="w-6 h-6 animate-spin" style={{ color: '#fff' }} />
                      </div>
                    )}
                    {app.status === 'done' && (
                      <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(52,211,153,0.9)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle className="w-3 h-3" style={{ color: '#fff' }} />
                      </div>
                    )}
                    {app.status === 'error' && (
                      <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(248,113,113,0.9)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle className="w-3 h-3" style={{ color: '#fff' }} />
                      </div>
                    )}
                    <button onClick={() => removeApplicant(app.id)} style={{
                      position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px',
                      borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)',
                      color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button className="btn-friendly" onClick={extractAll} disabled={extracting}
                  style={{ fontSize: '15px', padding: '14px 40px' }}>
                  {extracting
                    ? <><Loader className="w-5 h-5 animate-spin" /> Extracting...</>
                    : <><Zap className="w-5 h-5" /> Extract All ({applicants.length})</>}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ─── PHASE: APPLICANT LIST ───
  const errCount = applicants.filter(a => a.status === 'error').length;

  return (
    <main style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '36px 32px 64px' }}>
        <button onClick={() => { setPhase('upload'); setSent(false); }} className="btn-ghost" style={{ marginBottom: '20px', fontSize: '13px' }}>
          ← Back to Upload
        </button>

        <div className="animate-card-appear" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: sent ? 'var(--gradient-success)' : 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', transition: 'all 0.3s' }}>
            {sent ? <CheckCircle className="w-8 h-8" style={{ color: '#fff' }} /> : <Users className="w-8 h-8" style={{ color: 'var(--accent)' }} />}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Outfit', sans-serif", margin: '0 0 8px' }}>
            {sent ? 'Sent to Extension!' : `${doneApplicants.length} Applicant${doneApplicants.length !== 1 ? 's' : ''} Ready`}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {sent
              ? 'Open the extension popup → Fill tab to start filling.'
              : `${errCount > 0 ? `${errCount} failed · ` : ''}Review data, then select your submission mode`}
          </p>

          {!sent && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <div style={{ display: 'flex', background: 'var(--surface-2)', padding: '4px', borderRadius: 'var(--radius-lg)' }}>
                <button
                  onClick={() => setSubmitMode('legacy')}
                  style={{
                    padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                    background: submitMode === 'legacy' ? 'var(--card-bg)' : 'transparent',
                    color: submitMode === 'legacy' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: submitMode === 'legacy' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Legacy Mode (Browser Extension)
                </button>
                <button
                  onClick={() => setSubmitMode('auto')}
                  style={{
                    padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                    background: submitMode === 'auto' ? 'var(--card-bg)' : 'transparent',
                    color: submitMode === 'auto' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: submitMode === 'auto' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Auto Submit Mode (Direct API)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Applicant cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {applicants.map((app, i) => {
            const name = app.data?._name || app.file.name;
            const isReviewing = reviewId === app.id;
            return (
              <div key={app.id} className="animate-card-appear" style={{
                animationDelay: `${i * 0.04}s`,
                background: 'var(--card-bg)', border: `1px solid ${app.status === 'error' ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={app.preview} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {app.status === 'done'
                        ? `${app.data?.nationality || ''} · ${app.data?.passport_number || ''}`
                        : app.status === 'error' ? app.error : 'Pending'}
                    </div>
                  </div>
                  {app.status === 'done' && (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: 'rgba(52,211,153,0.1)', color: 'var(--success)' }}>
                      ✓ Extracted
                    </span>
                  )}
                  {app.status === 'error' && (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: 'var(--error-bg)', color: 'var(--error)' }}>
                      ✕ Failed
                    </span>
                  )}
                  {app.status === 'done' && (
                    <button onClick={() => setReviewId(isReviewing ? null : app.id)} className="btn-ghost" style={{ fontSize: '12px', padding: '6px 14px' }}>
                      <Eye className="w-3.5 h-3.5" /> {isReviewing ? 'Close' : 'Review'}
                    </button>
                  )}
                </div>

                {isReviewing && app.data && (
                  <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', paddingTop: '12px' }}>
                      {Object.entries(app.data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                        <div key={k} style={{ padding: '4px 0' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{String(v || '—')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Send to extension + Open portal */}
        {doneApplicants.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            {!sent ? (
              submitMode === 'legacy' ? (
                <button className="btn-friendly" onClick={sendAndOpen} style={{ fontSize: '15px', padding: '14px 40px' }}>
                  <Send className="w-5 h-5" /> Send to Extension & Open Portal
                </button>
              ) : (
                <button className="btn-friendly" onClick={() => setIsModalOpen(true)} style={{ fontSize: '15px', padding: '14px 40px' }}>
                  <Zap className="w-5 h-5" /> Start Auto Submission
                </button>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 24px', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  💡 Open the <strong>VizEz extension</strong> popup → <strong>Fill</strong> tab to navigate and fill applicants
                </div>
                <button className="btn-ghost" onClick={sendAndOpen} style={{ fontSize: '13px' }}>
                  <ExternalLink className="w-4 h-4" /> Re-open Portal
                </button>
              </div>
            )}
          </div>
        )}
        <AutoSubmitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          applicants={doneApplicants}
          portalId={portalId}
        />
      </div>
    </main>
  );
}
