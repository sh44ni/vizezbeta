'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ManualVisaItem, ManualPassportData, ManualWorkPermitData, LogEntry } from '@/app/types';
import {
  UploadCloud, X, ArrowRight, ArrowLeft, Info, CheckCircle2, AlertCircle,
  Clock, Loader2, Copy, Check, AlertTriangle, Cpu,
} from 'lucide-react';

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────
interface Props {
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string) => void;
  onStepChange?: (step: number) => void;
}

type Step = 1 | 2 | 3; // Upload → Extract → Review

const PASSPORT_FIELD_LABELS: { key: keyof ManualPassportData; label: string; portal: string }[] = [
  { key: 'surname',          label: 'Surname (Family Name)',   portal: 'Surname' },
  { key: 'first_name',       label: 'First Name',             portal: 'First Name' },
  { key: 'second_name',      label: 'Second Name',            portal: 'Second Name' },
  { key: 'third_name',       label: 'Third Name',             portal: 'Third Name' },
  { key: 'passport_number',  label: 'Passport Number',        portal: 'Passport No.' },
  { key: 'issue_date',       label: 'Issue Date (DD/MM/YYYY)',portal: 'Issue Date' },
  { key: 'place_of_issue',   label: 'Place of Issue',         portal: 'Place of Issue' },
  { key: 'expiry_date',      label: 'Expiry Date (DD/MM/YYYY)',portal: 'Expiry Date' },
  { key: 'passport_country', label: 'Passport Country',       portal: 'Country' },
  { key: 'nationality',      label: 'Nationality',            portal: 'Nationality' },
  { key: 'date_of_birth',    label: 'Date of Birth (DD/MM/YYYY)', portal: 'DOB' },
  { key: 'city_of_birth',    label: 'City of Birth',          portal: 'City of Birth' },
  { key: 'country_of_birth', label: 'Country of Birth',       portal: 'Country of Birth' },
  { key: 'gender',           label: 'Gender (M/F)',           portal: 'Gender' },
];

const WP_FIELD_LABELS: { key: keyof ManualWorkPermitData; label: string; portal: string }[] = [
  { key: 'wfpa_number',            label: 'WFPA / Permit Number',          portal: 'Reference' },
  { key: 'sponsor_name',           label: 'Employer Name (Sponsor)',        portal: 'Sponsor Name' },
  { key: 'civil_id',               label: 'Civil ID Number (sponsor)',      portal: 'Civil Reg. No.' },
  { key: 'phone_number',           label: 'Office Phone Number',           portal: 'Office Phone' },
  { key: 'mobile_number',          label: 'Mobile Number',                 portal: 'Mobile No.' },
  { key: 'address',                label: 'Address',                       portal: 'Address' },
  { key: 'relationship',           label: 'Relationship to Applicant',     portal: 'Relationship' },
  { key: 'occupation_code',        label: 'Occupation Code',               portal: 'Occupation Code' },
  { key: 'occupation_description', label: 'Occupation Description',        portal: 'Occupation Desc.' },
  { key: 'pa_number',              label: 'PA Number (Clearance No.)',     portal: 'Clearance No.' },
  { key: 'expiry_date',            label: 'Work Permit Expiry',            portal: 'Expiry Date' },
];


function ts() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// ─────────────────────────────────────────────────────
// AI MODEL OPTIONS
// ─────────────────────────────────────────────────────
interface AIModel {
  id: string;
  label: string;
  sublabel: string;
  available: boolean;
  icon: string;
}

const AI_MODELS: AIModel[] = [
  { id: 'gpt-4o', label: 'GPT-4', sublabel: 'Passport Expert', available: true, icon: '🧠' },
  { id: 'sonnet-4', label: 'Sonnet 4', sublabel: 'Passport Expert', available: false, icon: '🔮' },
];

// ─────────────────────────────────────────────────────
// UPLOAD STEP
// ─────────────────────────────────────────────────────
function UploadStep({
  items,
  setItems,
  onNext,
  selectedModel,
  onModelChange,
}: {
  items: ManualVisaItem[];
  setItems: React.Dispatch<React.SetStateAction<ManualVisaItem[]>>;
  onNext: () => void;
  selectedModel: string;
  onModelChange: (id: string) => void;
}) {
  const [passportDrag, setPassportDrag] = useState(false);
  const [wpDrag, setWpDrag] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  // Load PDF.js if needed (shared by passport + work permit)
  const ensurePdfJs = async () => {
    if ((window as any).pdfjsLib) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
  };

  // Render first page of a PDF to JPEG File
  const pdfToImage = async (file: File): Promise<File> => {
    await ensurePdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context not available');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Canvas toBlob failed');
    return new File([blob], file.name.replace(/\.pdf$/i, '.jpg'), { type: 'image/jpeg' });
  };

  const addFile = (passportFile?: File, wpFile?: File) => {
    if (!passportFile) return;
    const item: ManualVisaItem = {
      id: Math.random().toString(36).slice(7),
      passportFile,
      workPermitFile: wpFile || null,
      passportPreviewUrl: URL.createObjectURL(passportFile),
      workPermitPreviewUrl: wpFile ? URL.createObjectURL(wpFile) : '',
      status: 'pending',
      progress: 0,
    };
    setItems((prev) => [...prev, item]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  const handlePassportFiles = async (files: File[]) => {
    const accepted = files.filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    for (const f of accepted) {
      let finalFile = f;
      if (f.type === 'application/pdf') {
        try {
          finalFile = await pdfToImage(f);
        } catch (err) {
          console.error('PDF passport render error:', err);
          alert('Failed to read PDF passport. Try uploading an image instead.');
          continue;
        }
      }
      addFile(finalFile, undefined);
    }
  };

  const handleWpFile = async (id: string, file: File) => {
    let finalFile = file;

    if (file.type === 'application/pdf') {
      try {
        finalFile = await pdfToImage(file);
      } catch (err) {
        console.error('PDF rendering error:', err);
        alert('Failed to read PDF. Try uploading an image instead.');
        return;
      }
    }

    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, workPermitFile: finalFile, workPermitPreviewUrl: URL.createObjectURL(finalFile) }
          : x,
      ),
    );
  };

  const canProceed = items.length > 0 && items.every((x) => x.passportFile);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
          Manual Visa — Upload Documents
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Upload passport photo + work permit (Madunia) for each applicant.
        </p>
      </div>

      {/* Info banner */}
      {showInfo && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--info-bg)', border: '1px solid rgba(96,165,250,0.15)', backdropFilter: 'blur(8px)' }}>
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} />
          <div style={{ fontSize: '12px', color: 'var(--info)', lineHeight: 1.8 }}>
            <strong>How this module works:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
              <li>Upload one or more passport images</li>
              <li>Optionally add a <strong>Work Permit (Madunia)</strong> image per applicant</li>
              <li>AI extracts all fields required by the ROP eVisa portal</li>
              <li>Review, edit, then <strong>send directly to the ROP portal via AutoFiller</strong></li>
            </ul>
          </div>
          <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, padding: 0 }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AI Model selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            AI Extraction Model
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {AI_MODELS.map((model) => {
            const isSelected = model.id === selectedModel;
            return (
              <button
                key={model.id}
                onClick={() => model.available && onModelChange(model.id)}
                disabled={!model.available}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--border)',
                  background: isSelected
                    ? 'var(--accent-subtle)'
                    : 'var(--glass-bg)',
                  backdropFilter: 'blur(10px)',
                  cursor: model.available ? 'pointer' : 'not-allowed',
                  opacity: model.available ? 1 : 0.5,
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isSelected ? '0 0 20px rgba(124,92,252,0.12)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (model.available && !isSelected) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{model.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                  }}>
                    {model.label}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {model.sublabel}
                  </div>
                </div>
                {isSelected && (
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} />
                  </div>
                )}
                {!model.available && (
                  <span style={{
                    fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '2px 7px', borderRadius: '99px',
                    background: 'var(--warn-bg)', color: 'var(--warn)',
                    border: '1px solid rgba(251,191,36,0.2)', flexShrink: 0,
                  }}>
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Passport drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setPassportDrag(true); }}
        onDragLeave={() => setPassportDrag(false)}
        onDrop={(e) => { e.preventDefault(); setPassportDrag(false); handlePassportFiles(Array.from(e.dataTransfer.files)); }}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          border: `2px dashed ${passportDrag ? 'var(--accent)' : 'var(--border-bright)'}`,
          background: passportDrag ? 'var(--accent-subtle)' : 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          padding: '36px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: passportDrag ? 'var(--accent-glow)' : 'var(--shadow-sm)',
        }}
      >
        <input
          type="file" multiple accept="image/*,.pdf"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          onChange={(e) => e.target.files && handlePassportFiles(Array.from(e.target.files))}
          title=""
        />
        <div className={passportDrag ? '' : 'icon-bob'} style={{ width: '56px', height: '56px', borderRadius: '16px', background: passportDrag ? 'var(--gradient-accent)' : 'var(--surface-2)', border: `1px solid ${passportDrag ? 'transparent' : 'var(--border-bright)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: passportDrag ? 'var(--accent-glow)' : '0 0 20px rgba(124, 92, 252, 0.08)' }}>
          <UploadCloud className="w-6 h-6" style={{ color: passportDrag ? '#fff' : 'var(--accent)' }} />
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Drop passport photos here
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>JPG, PNG or PDF — one per applicant</div>
      </div>

      {/* Applicant rows */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Applicants ({items.length})
          </div>
          {items.map((item, i) => (
            <div key={item.id} className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              {/* # */}
              <div style={{ width: '24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>{i + 1}</div>

              {/* Passport preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.passportPreviewUrl} alt="Passport" style={{ width: '64px', height: '44px', objectFit: 'cover', borderRadius: '5px', border: '1px solid var(--border)', flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.passportFile?.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.workPermitFile ? `✓ Work permit: ${item.workPermitFile.name}` : 'No work permit attached (optional)'}
                </div>
              </div>

              {/* Add work permit */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
                <input
                  type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWpFile(item.id, f); }}
                />
                {item.workPermitFile ? '↺ Change WP' : '+ Work Permit'}
              </label>

              {/* Remove */}
              <button onClick={() => removeItem(item.id)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--error-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--error)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="btn-primary"
          style={!canProceed ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none', cursor: 'not-allowed' } : {}}
        >
          Start Extraction <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// EXTRACT STEP
// ─────────────────────────────────────────────────────
function ExtractStep({
  items,
  setItems,
  logs,
  addLog,
  onNext,
  onPrev,
  selectedModel,
}: {
  items: ManualVisaItem[];
  setItems: React.Dispatch<React.SetStateAction<ManualVisaItem[]>>;
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string) => void;
  onNext: () => void;
  onPrev: () => void;
  selectedModel: string;
}) {
  const isExtracting = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const initialItems = useRef(items);

  const LOG_COLORS: Record<LogEntry['level'], string> = {
    info: 'var(--text-muted)', success: 'var(--success)', warn: 'var(--warn)', error: 'var(--error)',
  };
  const LOG_PREFIXES: Record<LogEntry['level'], string> = {
    info: 'INFO ', success: ' OK  ', warn: 'WARN ', error: ' ERR ',
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!isExtracting.current) {
      const pending = initialItems.current.filter((x) => x.status === 'pending');
      if (pending.length > 0) runExtraction(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runExtraction = async (pending: ManualVisaItem[]) => {
    isExtracting.current = true;
    addLog('info', `━━ Manual Visa extraction started — ${pending.length} applicant(s) ━━`);

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const modelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label || selectedModel;
      addLog('info', `[${i + 1}/${pending.length}] Processing "${item.passportFile?.name}" with ${modelLabel}…`);
      setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, status: 'extracting', progress: 20 } : x));

      try {
        const fd = new FormData();
        fd.append('passport', item.passportFile!);
        if (item.workPermitFile) fd.append('work_permit', item.workPermitFile);
        fd.append('model', selectedModel);

        setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, progress: 55 } : x));
        const res = await fetch('/api/extract-manual', { method: 'POST', body: fd });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, progress: 85 } : x));
        const data = await res.json();

        // Convert uploaded files to base64 data URLs for preview persistence
        const fileToDataUrl = (f: File): Promise<string> =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          });

        let passportImageDataUrl = '';
        let workPermitImageDataUrl = '';
        if (item.passportFile) passportImageDataUrl = await fileToDataUrl(item.passportFile);
        if (item.workPermitFile) workPermitImageDataUrl = await fileToDataUrl(item.workPermitFile);

        // Capture validation warnings from server
        const validationWarnings: string[] = data._validation || [];

        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, status: 'extracted', progress: 100, passportData: data.passportData, workPermitData: data.workPermitData, passportImageDataUrl, workPermitImageDataUrl, validationWarnings }
              : x,
          ),
        );
        const pp = data.passportData;
        addLog('success', `✓ "${item.passportFile?.name}" → ${pp?.surname} ${pp?.first_name} | ${pp?.passport_number}${data.workPermitData ? ` | Civil ID: ${data.workPermitData.civil_id}` : ''}`);

        // Log validation warnings
        if (validationWarnings.length > 0) {
          validationWarnings.forEach(w => addLog('warn', w));
        }
      } catch (err) {
        const e = err as Error;
        setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, status: 'error', progress: 0, errorMsg: e.message } : x));
        addLog('error', `✗ "${item.passportFile?.name}" — ${e.message}`);
      }

      if (i < pending.length - 1) {
        addLog('info', 'Waiting 2s before next request…');
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    addLog('success', '━━ Extraction complete — review data ━━');
    isExtracting.current = false;
  };

  const done = items.filter((x) => x.status === 'extracted' || x.status === 'error').length;
  const total = items.length;
  const allDone = done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
          {allDone ? 'Extraction Complete' : 'Extracting Data…'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          {allDone ? `${items.filter((x) => x.status === 'extracted').length}/${total} extracted` : `Processing ${done + 1} of ${total}…`}
        </p>
      </div>

      {/* Overall bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>{done}/{total} applicants</span>
          <span style={{ color: 'var(--accent-hover)', fontWeight: 600 }}>{pct}%</span>
        </div>
        <div className="progress-bar-track">
          <div className={`progress-bar-fill ${!allDone ? 'progress-shimmer' : ''}`} style={{ width: `${pct}%`, background: allDone ? 'var(--success)' : undefined }} />
        </div>
      </div>

      {/* Cards + log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', minHeight: '400px' }}>
        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', alignContent: 'start' }}>
          {items.map((item) => {
            const color = item.status === 'extracted' ? 'var(--success)' : item.status === 'error' ? 'var(--error)' : item.status === 'extracting' ? 'var(--accent)' : 'var(--text-muted)';
            return (
              <div key={item.id} className={`glass-card ${item.status === 'extracting' ? 'glow-pulse' : ''}`} style={{ border: `1px solid ${item.status === 'extracting' ? 'var(--border-bright)' : 'var(--glass-border)'}`, boxShadow: item.status === 'extracting' ? 'var(--accent-glow)' : 'var(--shadow-sm)', transition: 'all 0.3s' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.passportPreviewUrl} alt="Passport" style={{ width: '100%', height: '80px', objectFit: 'cover', filter: item.status === 'pending' ? 'grayscale(0.7) brightness(0.5)' : 'none', transition: 'filter 0.4s' }} />
                <div className="progress-bar-track" style={{ borderRadius: 0, height: '3px' }}>
                  <div className={`progress-bar-fill ${item.status === 'extracting' ? 'progress-shimmer' : ''}`} style={{ width: `${item.progress}%`, background: item.status === 'extracted' ? 'var(--success)' : item.status === 'error' ? 'var(--error)' : undefined }} />
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    {item.status === 'pending' && <Clock className="w-3 h-3" style={{ color, flexShrink: 0 }} />}
                    {item.status === 'extracting' && <Loader2 className="w-3 h-3 animate-spin" style={{ color, flexShrink: 0 }} />}
                    {item.status === 'extracted' && <CheckCircle2 className="w-3 h-3" style={{ color, flexShrink: 0 }} />}
                    {item.status === 'error' && <AlertCircle className="w-3 h-3" style={{ color, flexShrink: 0 }} />}
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.status === 'pending' ? 'Queued' : item.status === 'extracting' ? 'Processing' : item.status === 'extracted' ? 'Done' : 'Failed'}
                    </span>
                    {item.workPermitFile && <span style={{ fontSize: '9px', color: 'var(--accent)', marginLeft: 'auto' }}>+WP</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.status === 'extracted' ? `${item.passportData?.surname} ${item.passportData?.first_name}` : item.status === 'error' ? item.errorMsg : item.passportFile?.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Log */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: allDone ? 'var(--success)' : 'var(--accent)', animation: allDone ? 'none' : 'pulse-glow 2s infinite' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Activity Log</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>{logs.length} events</span>
          </div>
          <div className="log-panel" style={{ height: '320px', overflowY: 'auto', padding: '10px 0' }}>
            {logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '8px', padding: '2px 14px' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }}>{log.timestamp}</span>
                <span style={{ color: LOG_COLORS[log.level], flexShrink: 0, fontWeight: log.level !== 'info' ? 700 : 400 }}>[{LOG_PREFIXES[log.level]}]</span>
                <span style={{ color: log.level === 'info' ? 'var(--text-secondary)' : LOG_COLORS[log.level], wordBreak: 'break-word' }}>{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <button onClick={onPrev} disabled={!allDone} className="btn-ghost" style={!allDone ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
        <button onClick={onNext} disabled={!allDone} className="btn-primary" style={!allDone ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none', cursor: 'not-allowed' } : {}}>
          Review Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// COPY BUTTON
// ─────────────────────────────────────────────────────
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} title="Copy to clipboard" style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', border: '1px solid var(--border)', background: 'transparent', color: copied ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────
// REVIEW STEP
// ─────────────────────────────────────────────────────
function ReviewStep({
  items,
  setItems,
  onPrev,
  onClear,
}: {
  items: ManualVisaItem[];
  setItems: React.Dispatch<React.SetStateAction<ManualVisaItem[]>>;
  onPrev: () => void;
  onClear: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(items.find((x) => x.status === 'extracted')?.id || '');

  const selected = items.find((x) => x.id === selectedId);

  const updatePassport = (field: keyof ManualPassportData, value: string) => {
    setItems((prev) =>
      prev.map((x) =>
        x.id === selectedId && x.passportData
          ? { ...x, passportData: { ...x.passportData, [field]: value } }
          : x,
      ),
    );
  };

  const updateWP = (field: keyof ManualWorkPermitData, value: string) => {
    setItems((prev) =>
      prev.map((x) =>
        x.id === selectedId && x.workPermitData
          ? { ...x, workPermitData: { ...x.workPermitData, [field]: value } }
          : x,
      ),
    );
  };

  const extracted = items.filter((x) => x.status === 'extracted');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
          Review Extracted Data
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Verify all fields. Use the copy buttons to paste directly into the ROP portal.
        </p>
      </div>

      {/* Status banners */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div className="glass-card" style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '7px 12px', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid rgba(52,211,153,0.25)', fontSize: '11.5px', color: 'var(--success)', fontWeight: 600, flexShrink: 0 }}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Data saved locally — survives page refresh
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', padding: '7px 12px', borderRadius: 'var(--radius-md)', background: 'var(--info-bg)', border: '1px solid rgba(96,165,250,0.2)', fontSize: '11.5px', color: 'var(--info)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          Select an applicant → edit any field → click <strong style={{ marginLeft: 4 }}>Send to Portal AutoFiller</strong> anytime.
        </div>
      </div>

      {/* Layout: sidebar selector + field panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', minHeight: '500px' }}>
        {/* Applicant list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>Applicants</div>
          {extracted.map((item, i) => {
            const isActive = item.id === selectedId;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: `1px solid ${isActive ? 'var(--border-bright)' : 'var(--glass-border)'}`, background: isActive ? 'var(--accent-subtle)' : 'var(--glass-bg)', backdropFilter: 'blur(10px)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)', transform: 'scale(1)' }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isActive ? 'var(--accent)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: isActive ? '#fff' : 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.passportData?.surname || 'Unknown'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.passportData?.passport_number}</div>
                </div>
              </button>
            );
          })}
          {items.filter((x) => x.status === 'error').map((item) => (
            <div key={item.id} style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--error-bg)', background: 'var(--error-bg)', fontSize: '11px', color: 'var(--error)' }}>
              <AlertCircle className="w-3 h-3 inline-block mr-1" />Failed
            </div>
          ))}
        </div>

        {/* Field panel */}
        {selected && selected.passportData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {/* Validation warnings banner */}
            {selected.validationWarnings && selected.validationWarnings.length > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                <div style={{ fontSize: '11.5px', color: '#f59e0b', lineHeight: 1.7 }}>
                  <strong style={{ display: 'block', marginBottom: '3px' }}>Validation Warnings — please verify:</strong>
                  {selected.validationWarnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Passport fields */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Passport Fields</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ROP Portal label shown in pink</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px' }}>
                {PASSPORT_FIELD_LABELS.map(({ key, label, portal }) => (
                  <div key={key} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontSize: '9px', color: '#f472b6', background: 'rgba(244,114,182,0.1)', padding: '1px 5px', borderRadius: '3px', border: '1px solid rgba(244,114,182,0.2)', flexShrink: 0 }}>{portal}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={(selected.passportData as ManualPassportData)?.[key] || ''}
                        onChange={(e) => updatePassport(key, e.target.value)}
                        style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                      />
                      <CopyBtn value={(selected.passportData as ManualPassportData)?.[key] || ''} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Work permit fields */}
            {selected.workPermitData && (
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Work Permit Fields</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px' }}>
                  {WP_FIELD_LABELS.map(({ key, label, portal }) => (
                    <div key={key} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontSize: '9px', color: '#f472b6', background: 'rgba(244,114,182,0.1)', padding: '1px 5px', borderRadius: '3px', border: '1px solid rgba(244,114,182,0.2)', flexShrink: 0 }}>{portal}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={(selected.workPermitData as ManualWorkPermitData)?.[key] || ''}
                          onChange={(e) => updateWP(key, e.target.value)}
                          style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                        />
                        <CopyBtn value={(selected.workPermitData as ManualWorkPermitData)?.[key] || ''} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', fontSize: '14px' }}>
            Select an applicant to view fields
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', alignItems: 'center' }}>
        {/* Left: Back + Clear */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onPrev}
            className="btn-ghost"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Upload
          </button>
          <button
            onClick={onClear}
            title="Delete all saved data and start fresh"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(248,113,113,0.3)', background: 'var(--error-bg)', color: 'var(--error)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            🗑️ Clear All
          </button>
        </div>

        {/* Right: Send to extension */}
        <button
          onClick={() => {
            if (!selected) {
              alert('⚠️ No applicant selected. Select one from the list first.');
              return;
            }
            if (!selected.passportData) {
              alert('⚠️ No passport data found for this applicant. Did extraction complete?');
              return;
            }

            const payload = {
              ...selected.passportData,
              ...(selected.workPermitData || {}),
              // Document images for preview on the portal
              _passportImageUrl: selected.passportImageDataUrl || '',
              _workPermitImageUrl: selected.workPermitImageDataUrl || '',
            };

            console.log('VizEz: Dispatching data to extension via postMessage. Keys:', Object.keys(payload));
            window.postMessage({
              type: 'VIZEZ_SEND_TO_EXTENSION',
              payload,
            }, '*');

            // If the extension content script is loaded, it will show its own alert.
            // If nothing happens after 2s, the extension likely isn't installed/active.
            setTimeout(() => {
              // This timeout is just a fallback hint — the extension alert will appear first if it's working
            }, 2500);
          }}
          disabled={!selected}
          className="btn-primary"
          style={!selected ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none', cursor: 'not-allowed' } : {}}
        >
          Send to Portal AutoFiller <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────
const STORAGE_KEY = 'vizez_manual_v2';

export default function ManualVisaModule({ logs, addLog, onStepChange }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<ManualVisaItem[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');

  // ── Restore persisted data on mount ──────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Array<Omit<ManualVisaItem, 'passportFile' | 'workPermitFile'>>;
      const restored: ManualVisaItem[] = saved.map((s) => ({
        ...s,
        passportFile: null,
        workPermitFile: null,
      }));
      if (restored.length > 0) {
        setItems(restored);
        setStep(3);
        onStepChange?.(3);
      }
    } catch {
      // ignore corrupt storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist extracted items whenever they change ──────
  useEffect(() => {
    const toSave = items
      .filter((x) => x.status === 'extracted' || x.status === 'error')
      // strip non-serializable File objects before saving
      .map(({ passportFile, workPermitFile, ...rest }) => rest);

    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else if (toSave.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // Storage full — silently ignore
      }
    }
  }, [items]);

  // ── Clear everything and return to step 1 ────────────
  const clearAll = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    setStep(1);
    onStepChange?.(1);
  }, [onStepChange]);

  const goNext = () => setStep((s) => {
    const next = Math.min(s + 1, 3) as Step;
    onStepChange?.(next);
    return next;
  });
  const goPrev = () => setStep((s) => {
    const prev = Math.max(s - 1, 1) as Step;
    onStepChange?.(prev);
    return prev;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {step === 1 && <UploadStep items={items} setItems={setItems} onNext={goNext} selectedModel={selectedModel} onModelChange={setSelectedModel} />}
      {step === 2 && <ExtractStep items={items} setItems={setItems} logs={logs} addLog={addLog} onNext={goNext} onPrev={goPrev} selectedModel={selectedModel} />}
      {step === 3 && <ReviewStep items={items} setItems={setItems} onPrev={goPrev} onClear={clearAll} />}
    </div>
  );
}
