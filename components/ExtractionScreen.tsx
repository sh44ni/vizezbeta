'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ExtractedData, LogEntry, PassportItem } from '@/app/types';
import {
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Clock, Loader2,
  Zap, AlertTriangle, Bot, Pencil, Check,
} from 'lucide-react';

interface Props {
  passports: PassportItem[];
  setPassports: React.Dispatch<React.SetStateAction<PassportItem[]>>;
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isReview: boolean;
}

function CopilotIcon({ level }: { level: LogEntry['level'] }) {
  const base = { width: '13px', height: '13px', flexShrink: 0 } as const;
  if (level === 'success') return <CheckCircle2 {...base} style={{ ...base, color: 'var(--success)' }} />;
  if (level === 'error') return <AlertCircle {...base} style={{ ...base, color: 'var(--error)' }} />;
  if (level === 'warn') return <AlertTriangle {...base} style={{ ...base, color: 'var(--warn)' }} />;
  return <Zap {...base} style={{ ...base, color: 'var(--accent)' }} />;
}

const ENTRY_COLORS: Record<LogEntry['level'], string> = {
  info: 'var(--text-secondary)', success: 'var(--success)', warn: 'var(--warn)', error: 'var(--error)',
};

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
      {editing ? (
        <input ref={inputRef} className="field-edit-input" value={value} onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
          style={{ fontSize: '12.5px', fontWeight: 500 }} />
      ) : (
        <div className="field-view" onClick={() => setEditing(true)} title="Click to edit"
          style={{ fontSize: '12.5px', fontWeight: 500, color: value ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', minHeight: '28px' }}>
          <span style={{ flex: 1 }}>{value || '—'}</span>
          <Pencil style={{ width: '10px', height: '10px', color: 'var(--text-muted)', opacity: 0, flexShrink: 0, transition: 'opacity 0.15s ease' }} className="field-edit-hint" />
        </div>
      )}
    </div>
  );
}

function PassportBentoCard({ passport, index, onFieldChange }: { passport: PassportItem; index: number; onFieldChange: (id: string, field: keyof ExtractedData, value: string) => void }) {
  const data = passport.extractedData;
  const allFilled = data && data.full_name && data.passport_number && data.nationality && data.date_of_birth && data.expiry_date;
  const isComplete = !!allFilled;

  return (
    <div className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'both' }}>
      <div style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={passport.previewUrl} alt="Passport" style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', top: '8px', left: '8px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>#{index + 1}</div>
        <div className="tag-pill" style={{ position: 'absolute', top: '8px', right: '8px', background: isComplete ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)', border: `1px solid ${isComplete ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`, backdropFilter: 'blur(4px)', color: isComplete ? 'var(--success)' : 'var(--warn)' }}>
          {isComplete ? 'Complete' : 'Review'}
        </div>
        {data?.full_name && (
          <div style={{ position: 'absolute', bottom: '8px', left: '10px', right: '10px', fontSize: '11.5px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.full_name}</div>
        )}
      </div>
      <div style={{ padding: '12px 14px 10px' }}>
        <style>{`.glass-card:hover .field-edit-hint { opacity: 0.7 !important; }`}</style>
        <EditableField label="Passport No." value={data?.passport_number || ''} onChange={(v) => onFieldChange(passport.id, 'passport_number', v)} />
        <EditableField label="Nationality" value={data?.nationality || ''} onChange={(v) => onFieldChange(passport.id, 'nationality', v)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <EditableField label="Date of Birth" value={data?.date_of_birth || ''} onChange={(v) => onFieldChange(passport.id, 'date_of_birth', v)} />
          <EditableField label="Expiry Date" value={data?.expiry_date || ''} onChange={(v) => onFieldChange(passport.id, 'expiry_date', v)} />
        </div>
      </div>
    </div>
  );
}

function ReviewMode({ passports, setPassports, onNext, onPrev }: { passports: PassportItem[]; setPassports: React.Dispatch<React.SetStateAction<PassportItem[]>>; onNext: () => void; onPrev: () => void }) {
  const handleFieldChange = (id: string, field: keyof ExtractedData, value: string) => {
    setPassports((prev) => prev.map((p) => p.id === id && p.extractedData ? { ...p, extractedData: { ...p.extractedData, [field]: value } } : p));
  };
  const extracted = passports.filter((p) => p.status === 'extracted');
  const failed = passports.filter((p) => p.status === 'error');
  const pdfCount = Math.ceil(extracted.length / 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>Review Extracted Data</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Click any field to edit before generating. Everything is saved automatically.</p>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        {[
          { label: 'Extracted', value: extracted.length, color: 'var(--success)', bg: 'var(--success-bg)', border: 'rgba(52,211,153,0.2)' },
          { label: 'Failed', value: failed.length, color: 'var(--error)', bg: 'var(--error-bg)', border: 'rgba(251,113,133,0.2)' },
          { label: 'PDFs to generate', value: pdfCount, color: 'var(--accent-hover)', bg: 'var(--accent-subtle)', border: 'var(--border-bright)' },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{s.value}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>
      {failed.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--error-bg)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--error)', backdropFilter: 'blur(8px)' }}>
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {failed.length} passport{failed.length > 1 ? 's' : ''} failed extraction and will be excluded from PDF generation.
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', alignContent: 'start' }}>
          {extracted.map((p, i) => (<PassportBentoCard key={p.id} passport={p} index={i} onFieldChange={handleFieldChange} />))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', flexShrink: 0 }}>
        <button onClick={onPrev} className="btn-ghost"><ArrowLeft style={{ width: '15px', height: '15px' }} /> Back</button>
        <button onClick={onNext} disabled={extracted.length === 0} className="btn-primary" style={extracted.length === 0 ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none' } : {}}>
          Generate PDFs <ArrowRight style={{ width: '15px', height: '15px' }} />
        </button>
      </div>
    </div>
  );
}

export default function ExtractionScreen({ passports, setPassports, logs, addLog, onNext, onPrev, isReview }: Props) {
  const isExtracting = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const initialPassports = useRef(passports);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const setProgress = useCallback((id: string, progress: number) => {
    setPassports((prev) => prev.map((p) => (p.id === id ? { ...p, progress } : p)));
  }, [setPassports]);

  useEffect(() => {
    if (!isReview && !isExtracting.current) {
      const pending = initialPassports.current.filter((p) => p.status === 'pending');
      if (pending.length > 0) processExtractions(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processExtractions = async (items: PassportItem[]) => {
    isExtracting.current = true;
    addLog('info', `${items.length} passport${items.length > 1 ? 's' : ''} queued for extraction`);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      addLog('info', `Processing ${i + 1} of ${items.length}…`);
      setPassports((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'extracting', progress: 20 } : p)));
      setProgress(item.id, 20);
      let attempts = 0; const maxAttempts = 3; let success = false;
      while (attempts < maxAttempts && !success) {
        try {
          setProgress(item.id, 40);
          const formData = new FormData(); formData.append('file', item.file);
          setProgress(item.id, 60);
          const res = await fetch('/api/extract', { method: 'POST', body: formData });
          if (!res.ok) {
            if (res.status === 429) { attempts++; const wait = attempts * 5; addLog('warn', `Rate limit — retrying in ${wait}s (attempt ${attempts}/${maxAttempts})`); setProgress(item.id, 30); if (attempts >= maxAttempts) throw new Error('Rate limit exceeded after maximum retries.'); await new Promise((r) => setTimeout(r, wait * 1000)); continue; }
            const errData = await res.json(); throw new Error(errData.error || `HTTP ${res.status}`);
          }
          setProgress(item.id, 80);
          const data: ExtractedData = await res.json();
          setProgress(item.id, 100);
          setPassports((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'extracted', progress: 100, extractedData: data } : p));
          addLog('success', `${data.full_name} — ${data.passport_number} — ${data.nationality}`);
          // Log to database (fire-and-forget)
          fetch('/api/passport-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: data.full_name,
              passport_number: data.passport_number,
              nationality: data.nationality,
              processed_by: 'user',
            }),
          }).catch(() => {});
          success = true;
        } catch (error) {
          const err = error as Error; attempts++;
          if (attempts >= maxAttempts || !err.message.includes('Rate limit')) {
            setPassports((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', progress: 0, errorMsg: err.message } : p));
            addLog('error', `${item.file.name} could not be read — ${err.message}`); break;
          }
        }
      }
      if (success && i < items.length - 1) { addLog('info', 'Waiting 2s before next request…'); await new Promise((r) => setTimeout(r, 2000)); }
    }
    addLog('success', 'All done — review your data before generating');
    isExtracting.current = false;
  };

  if (isReview) return <ReviewMode passports={passports} setPassports={setPassports} onNext={onNext} onPrev={onPrev} />;

  const total = passports.length;
  const done = passports.filter((p) => p.status === 'extracted' || p.status === 'error').length;
  const succeeded = passports.filter((p) => p.status === 'extracted').length;
  const failed = passports.filter((p) => p.status === 'error').length;
  const overallPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allProcessed = done === total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ flexShrink: 0 }}>
        <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
          {allProcessed ? 'Extraction Complete' : 'Extracting Passport Data'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          {allProcessed ? `${succeeded} extracted, ${failed} failed — ready to review` : `Processing ${done + 1} of ${total}…`}
        </p>
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>{done}/{total} passports</span>
          <span style={{ color: 'var(--accent-hover)', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{overallPct}%</span>
        </div>
        <div className="progress-bar-track">
          <div className={`progress-bar-fill ${!allProcessed && overallPct < 100 ? 'progress-shimmer' : ''}`}
            style={{ width: `${overallPct}%`, background: allProcessed ? (failed === total ? 'var(--error)' : 'var(--success)') : undefined }} />
        </div>
      </div>

      <div style={{ minHeight: '58vh', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
        <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '10px', alignContent: 'start' }}>
          {passports.map((p) => {
            const statusColor = p.status === 'extracted' ? 'var(--success)' : p.status === 'error' ? 'var(--error)' : p.status === 'extracting' ? 'var(--accent)' : 'var(--text-muted)';
            return (
              <div key={p.id} className="glass-card" style={{ border: `1px solid ${p.status === 'extracting' ? 'var(--border-bright)' : 'var(--glass-border)'}`, boxShadow: p.status === 'extracting' ? 'var(--accent-glow)' : 'var(--shadow-sm)', transition: 'all 0.3s ease' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="Passport" style={{ width: '100%', height: '80px', objectFit: 'cover', filter: p.status === 'pending' ? 'grayscale(0.7) brightness(0.55)' : 'none', transition: 'filter 0.4s ease', display: 'block' }} />
                <div className="progress-bar-track" style={{ borderRadius: 0, height: '3px' }}>
                  <div className={`progress-bar-fill ${p.status === 'extracting' ? 'progress-shimmer' : ''}`} style={{ width: `${p.progress}%`, background: p.status === 'extracted' ? 'var(--success)' : p.status === 'error' ? 'var(--error)' : undefined }} />
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    {p.status === 'pending' && <Clock style={{ width: '11px', height: '11px', color: statusColor, flexShrink: 0 }} />}
                    {p.status === 'extracting' && <Loader2 style={{ width: '11px', height: '11px', color: statusColor, flexShrink: 0 }} className="animate-spin" />}
                    {p.status === 'extracted' && <CheckCircle2 style={{ width: '11px', height: '11px', color: statusColor, flexShrink: 0 }} className="pop-in" />}
                    {p.status === 'error' && <AlertCircle style={{ width: '11px', height: '11px', color: statusColor, flexShrink: 0 }} />}
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {p.status === 'pending' ? 'Queued' : p.status === 'extracting' ? 'Processing' : p.status === 'extracted' ? 'Done' : 'Failed'}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.status === 'extracted' ? p.extractedData?.full_name : p.status === 'error' ? p.errorMsg : p.file.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Copilot feed */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Bot style={{ width: '15px', height: '15px', color: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px', fontFamily: "'Outfit', sans-serif" }}>AI Copilot</span>
            {!allProcessed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '2px' }}>
                <div className="dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                <span style={{ fontSize: '10.5px', color: 'var(--success)', fontWeight: 600 }}>Live</span>
              </div>
            )}
            {allProcessed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check style={{ width: '11px', height: '11px', color: 'var(--success)' }} />
                <span style={{ fontSize: '10.5px', color: 'var(--success)', fontWeight: 600 }}>Done</span>
              </div>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: 'var(--text-muted)' }}>{logs.length} event{logs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="copilot-panel" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {logs.length === 0 && (
              <div style={{ padding: '24px 16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Bot style={{ width: '20px', height: '20px', opacity: 0.4 }} />
                <span>Waiting to start…</span>
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="copilot-entry" style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '5px 14px' }}>
                <div style={{ marginTop: '1px', flexShrink: 0 }}><CopilotIcon level={log.level} /></div>
                <span style={{ flex: 1, fontSize: '12px', color: ENTRY_COLORS[log.level], lineHeight: 1.5, wordBreak: 'break-word', fontWeight: log.level === 'info' ? 400 : 500 }}>{log.message}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>{log.timestamp}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', flexShrink: 0 }}>
        <button onClick={onPrev} disabled={!allProcessed} className="btn-ghost" style={!allProcessed ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
          <ArrowLeft style={{ width: '15px', height: '15px' }} /> Cancel
        </button>
        <button onClick={onNext} disabled={!allProcessed} className="btn-primary" style={!allProcessed ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none' } : {}}>
          Review Data <ArrowRight style={{ width: '15px', height: '15px' }} />
        </button>
      </div>
    </div>
  );
}
