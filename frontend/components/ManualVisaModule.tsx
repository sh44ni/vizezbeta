'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ManualVisaItem, ManualPassportData, ManualWorkPermitData, LogEntry } from '@/app/types';
import {
  UploadCloud, X, ArrowRight, ArrowLeft, Info, CheckCircle2, AlertCircle,
  Clock, Loader2, Copy, Check, AlertTriangle, Cpu, Zap, Shield, Eye, Send,
  Brain, Sparkles, ShieldCheck, ShieldAlert, HelpCircle, Trash2, ImageUp,
  RefreshCw, FileText, CircleDot,
} from 'lucide-react';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Props {
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string) => void;
  onStepChange?: (step: number) => void;
}

type Step = 1 | 2 | 3 | 4; // Upload â†’ Extract â†’ Review

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AI MODEL OPTIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AIModel {
  id: string;
  label: string;
  sublabel: string;
  available: boolean;
  iconType: 'brain' | 'sparkles';
}

const AI_MODELS: AIModel[] = [
  { id: 'gpt-4o', label: 'GPT-4', sublabel: 'Passport Expert', available: true, iconType: 'brain' },
  { id: 'sonnet-4', label: 'Sonnet 4', sublabel: 'Passport Expert', available: false, iconType: 'sparkles' },
];

// ————————————————————————————————————————————————————————————————
// UPLOAD STEP
// ————————————————————————————————————————————————————————————————
function UploadStep({
  items,
  setItems,
  onNext,
  selectedModel,
  onModelChange,
  previewEnhanced,
  onPreviewToggle,
}: {
  items: ManualVisaItem[];
  setItems: React.Dispatch<React.SetStateAction<ManualVisaItem[]>>;
  onNext: () => void;
  selectedModel: string;
  onModelChange: (id: string) => void;
  previewEnhanced: boolean;
  onPreviewToggle: (v: boolean) => void;
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
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: isSelected ? 'var(--accent-subtle)' : 'var(--surface-2)' }}>{model.iconType === 'brain' ? <Brain className="w-4 h-4" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} /> : <Sparkles className="w-4 h-4" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />}</span>
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
        <div className={passportDrag ? '' : 'icon-bob'} style={{ width: '56px', height: '56px', borderRadius: '16px', background: passportDrag ? 'var(--accent)' : 'var(--surface-2)', border: `1px solid ${passportDrag ? 'transparent' : 'var(--border-bright)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: 'none' }}>
          <UploadCloud className="w-6 h-6" style={{ color: passportDrag ? '#fff' : 'var(--accent)' }} />
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Drop passport photos here
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>JPG, PNG or PDF - one per applicant</div>
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
                  {item.workPermitFile ? `Work permit: ${item.workPermitFile.name}` : 'No work permit attached (optional)'}
                </div>
              </div>

              {/* Add work permit */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
                <input
                  type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWpFile(item.id, f); }}
                />
                {item.workPermitFile ? 'Change WP' : '+ Work Permit'}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        {/* Preview toggle */}
        <button
          onClick={() => onPreviewToggle(!previewEnhanced)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: 'var(--radius-md)',
            border: `1px solid ${previewEnhanced ? 'var(--accent)' : 'var(--border)'}`,
            background: previewEnhanced ? 'var(--accent-subtle)' : 'transparent',
            color: previewEnhanced ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview enhanced before extraction
          <div style={{
            width: '32px', height: '18px', borderRadius: '9px',
            background: previewEnhanced ? 'var(--accent)' : 'var(--surface-3)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              background: '#fff', position: 'absolute', top: '2px',
              left: previewEnhanced ? '16px' : '2px',
              transition: 'left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </button>

        <button
          onClick={onNext}
          disabled={!canProceed}
          className="btn-primary"
          style={!canProceed ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none', cursor: 'not-allowed' } : {}}
        >
          {previewEnhanced ? 'Enhance & Preview' : 'Start Extraction'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// ENHANCE PREVIEW STEP
// ————————————————————————————————————————————————————————————————
function EnhancePreviewStep({
  items,
  setItems,
  addLog,
  onNext,
  onPrev,
}: {
  items: ManualVisaItem[];
  setItems: React.Dispatch<React.SetStateAction<ManualVisaItem[]>>;
  addLog: (level: LogEntry['level'], message: string) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [enhancing, setEnhancing] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runEnhancePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runEnhancePreview = async () => {
    setEnhancing(true);
    addLog('info', `Vizez Document Expert — enhancing ${items.length} image(s) for preview...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.passportFile) continue;
      setCurrentIdx(i);

      try {
        addLog('info', `[${i + 1}/${items.length}] Enhancing "${item.passportFile.name}"...`);

        const fd = new FormData();
        fd.append('file', item.passportFile);

        const res = await fetch('/api/enhance-preview', { method: 'POST', body: fd });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();

        setItems(prev => prev.map(x =>
          x.id === item.id
            ? {
                ...x,
                enhancePreviewUrl: data.enhancedImageUrl || '',
                enhancePreviewMetrics: data.metrics || null,
              }
            : x
        ));

        const docType = data.metrics?.documentType || 'unknown';
        const cropped = data.metrics?.cropApplied ? 'cropped' : 'no crop needed';
        const timeMs = data.metrics?.processingTimeMs || '?';
        addLog('success', `"${item.passportFile.name}" — ${docType} | ${cropped} | ${timeMs}ms`);

      } catch (err) {
        const e = err as Error;
        addLog('warn', `"${item.passportFile?.name}" — enhancement failed: ${e.message} (will use raw image)`);
        // Still set an empty preview so we know it was attempted
        setItems(prev => prev.map(x =>
          x.id === item.id ? { ...x, enhancePreviewUrl: '', enhancePreviewMetrics: null } : x
        ));
      }
    }

    addLog('success', 'Enhancement preview ready — review images below');
    setEnhancing(false);
  };

  const allDone = !enhancing;
  const enhanced = items.filter(x => x.enhancePreviewUrl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
          {enhancing ? 'Enhancing Documents...' : 'Enhancement Preview'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          {enhancing
            ? `Processing ${currentIdx + 1} of ${items.length} through Vizez Document Expert`
            : `Review the enhanced images below. Click "Proceed to Extract" when ready.`
          }
        </p>
      </div>

      {/* Progress bar while enhancing */}
      {enhancing && (
        <div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill progress-shimmer" style={{ width: `${Math.round(((currentIdx + 0.5) / items.length) * 100)}%` }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Cropping, classifying, and enhancing...
            </span>
          </div>
        </div>
      )}

      {/* Side-by-side previews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
        {items.map((item, idx) => {
          const hasPreview = !!item.enhancePreviewUrl;
          const metrics = item.enhancePreviewMetrics as Record<string, any> | null;
          const docType = metrics?.documentType || '';
          const cropMethod = metrics?.cropMetadata?.crop_method || '';
          const cropApplied = metrics?.cropApplied || false;

          return (
            <div key={item.id} className="glass-card animate-slide-up" style={{
              padding: '16px', border: '1px solid var(--border-bright)',
              opacity: hasPreview || !enhancing ? 1 : 0.5,
              transition: 'opacity 0.3s',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: hasPreview ? 'var(--success)' : enhancing && idx === currentIdx ? 'var(--accent)' : 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {hasPreview ? <Check className="w-3 h-3" /> : enhancing && idx === currentIdx ? <Loader2 className="w-3 h-3 animate-spin" /> : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.passportFile?.name || `Applicant ${idx + 1}`}
                  </div>
                  {docType && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                      <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: 'var(--accent-subtle)', color: 'var(--accent)', textTransform: 'uppercase' }}>{docType.replace('_', ' ')}</span>
                      {cropApplied && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: 'rgba(52,211,153,0.1)', color: 'var(--success)', textTransform: 'uppercase' }}>{cropMethod}</span>}
                    </div>
                  )}
                </div>
                {metrics?.processingTimeMs && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Clock className="w-3 h-3" style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                    {metrics.processingTimeMs}ms
                  </span>
                )}
              </div>

              {/* Side-by-side images */}
              {hasPreview && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', textAlign: 'center' }}>Original</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.passportPreviewUrl} alt="Original" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px', textAlign: 'center' }}>
                      <Zap className="w-3 h-3" style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                      Enhanced
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.enhancePreviewUrl} alt="Enhanced" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--accent)', boxShadow: '0 0 15px rgba(124,92,252,0.15)' }} />
                  </div>
                </div>
              )}

              {/* Quality metrics bar */}
              {metrics && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)' }}>
                  {[
                    { label: 'Sharpness', before: metrics.originalQuality?.blur_score, after: metrics.enhancedQuality?.blur_score },
                    { label: 'Brightness', before: metrics.originalQuality?.brightness, after: metrics.enhancedQuality?.brightness },
                    { label: 'Contrast', before: metrics.originalQuality?.contrast_score, after: metrics.enhancedQuality?.contrast_score },
                  ].map(m => (
                    <div key={m.label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '8px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{m.label}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {typeof m.before === 'number' ? m.before.toFixed(0) : '?'}
                        <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>→</span>
                        <span style={{ color: 'var(--accent)' }}>{typeof m.after === 'number' ? m.after.toFixed(0) : '?'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <button onClick={onPrev} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={enhancing}
          className="btn-primary"
          style={enhancing ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none', cursor: 'not-allowed' } : {}}
        >
          Proceed to Extract <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// EXTRACT STEP
// ————————————————————————————————————————————————————————————————
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

  const setStage = (id: string, stage: ManualVisaItem['extractionStage'], progress: number) => {
    setItems((prev) => prev.map((x) => x.id === id ? { ...x, extractionStage: stage, progress } : x));
  };

  const runExtraction = async (pending: ManualVisaItem[]) => {
    isExtracting.current = true;
    addLog('info', `Manual Visa extraction started - ${pending.length} applicant(s)`);

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const modelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label || selectedModel;
      addLog('info', `[${i + 1}/${pending.length}] Processing "${item.passportFile?.name}" with ${modelLabel}...`);
      setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, status: 'extracting', extractionStage: 'enhancing', progress: 10 } : x));

      try {
        // Stage 1: Enhancing
        addLog('info', `Enhancing image quality...`);
        setStage(item.id, 'enhancing', 15);

        const fd = new FormData();
        fd.append('passport', item.passportFile!);
        if (item.workPermitFile) fd.append('work_permit', item.workPermitFile);
        fd.append('model', selectedModel);

        // Stage 2: Uploading to API
        setStage(item.id, 'uploading', 30);
        addLog('info', `Sending to extraction API...`);

        const res = await fetch('/api/extract-manual', { method: 'POST', body: fd });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        // Stage 3: Reading (AI is processing)
        setStage(item.id, 'reading', 60);
        addLog('info', `AI reading passport fields...`);
        const data = await res.json();

        // Stage 4: Validating
        setStage(item.id, 'validating', 85);
        addLog('info', `Validating MRZ checksums...`);

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
        const mrzOverrides: string[] = data._mrzOverrides || [];
        const fieldVerification = data._fieldVerification || {};
        const mrzQuality = data._mrzQuality || 'UNREADABLE';

        // Stage 5: Done
        const enhancedImgUrl = data._enhancement?.enhancedImageUrl || '';
        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, status: 'extracted', extractionStage: 'done', progress: 100, passportData: data.passportData, workPermitData: data.workPermitData, passportImageDataUrl, workPermitImageDataUrl, validationWarnings: [...mrzOverrides, ...validationWarnings], fieldVerification, mrzQuality, enhancedImageUrl: enhancedImgUrl }
              : x,
          ),
        );
        const pp = data.passportData;
        addLog('success', `"${item.passportFile?.name}" - ${pp?.surname} ${pp?.first_name} | ${pp?.passport_number}${data.workPermitData ? ` | Civil ID: ${data.workPermitData.civil_id}` : ''}`);

        // Log image enhancement status
        const enh = data._enhancement;
        if (enh?.enhanced) {
          const origBlur = enh.originalQuality?.blur_score?.toFixed(0) || '?';
          const enhBlur = enh.enhancedQuality?.blur_score?.toFixed(0) || '?';
          addLog('info', `Image enhanced (${enh.sourceFormat}) - sharpness: ${origBlur} > ${enhBlur}${enh.readyForExtraction ? ' - ready' : ' - marginal'}`);
        } else {
          addLog('warn', `Image NOT enhanced (processor unavailable) - using raw upload`);
        }

        // Log MRZ quality grade
        addLog(mrzQuality === 'VERIFIED' ? 'success' : mrzQuality === 'FAILED' ? 'error' : 'warn',
          `MRZ Quality: ${mrzQuality} - ${mrzQuality === 'VERIFIED' ? 'all dates checksum-verified' : mrzQuality === 'PARTIAL' ? 'some fields verified' : mrzQuality === 'FAILED' ? 'checksums failed, dates may be inaccurate' : 'MRZ not readable'}`
        );

        // Log MRZ overrides (dates/gender corrected from MRZ)
        if (mrzOverrides.length > 0) {
          mrzOverrides.forEach((o: string) => addLog('info', o));
        }

        // Log validation warnings
        if (validationWarnings.length > 0) {
          validationWarnings.forEach(w => addLog('warn', w));
        }
      } catch (err) {
        const e = err as Error;
        setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, status: 'error', extractionStage: undefined, progress: 0, errorMsg: e.message } : x));
        addLog('error', `"${item.passportFile?.name}" - ${e.message}`);
      }

      if (i < pending.length - 1) {
        addLog('info', 'Waiting 2s before next request...');
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    addLog('success', 'Extraction complete - review data');
    isExtracting.current = false;
  };

  const STAGES = [
    { key: 'enhancing', label: 'Enhancing', icon: Zap, desc: 'Deskew · Denoise · Sharpen' },
    { key: 'uploading', label: 'Sending', icon: Send, desc: 'Uploading to API' },
    { key: 'reading', label: 'AI Reading', icon: Eye, desc: 'Extracting passport fields' },
    { key: 'validating', label: 'Verifying', icon: Shield, desc: 'MRZ checksum validation' },
    { key: 'done', label: 'Complete', icon: CheckCircle2, desc: 'Ready for review' },
  ] as const;

  const done = items.filter((x) => x.status === 'extracted' || x.status === 'error').length;
  const succeeded = items.filter((x) => x.status === 'extracted').length;
  const failed = items.filter((x) => x.status === 'error').length;
  const total = items.length;
  const allDone = done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const activeItem = items.find(x => x.status === 'extracting');
  const activeStageIdx = STAGES.findIndex(s => s.key === activeItem?.extractionStage);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewItem = items.find(x => x.id === previewId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
          {allDone ? 'Extraction Complete' : 'Processing Passports...'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          {allDone ? `${succeeded} extracted${failed > 0 ? `, ${failed} failed` : ''} — ready for review` : `Applicant ${done + 1} of ${total}`}
        </p>
      </div>

      {activeItem && (
        <div className="glass-card glow-pulse" style={{ padding: '20px 24px', border: '1px solid var(--border-bright)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '16px' }}>
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isCurrent = i === activeStageIdx;
              const isPast = i < activeStageIdx;
              const dotBg = isCurrent ? 'var(--accent)' : isPast ? 'var(--success)' : 'var(--surface-3)';
              const dotColor = isCurrent || isPast ? '#fff' : 'var(--text-muted)';
              return (
                <React.Fragment key={stage.key}>
                  {i > 0 && <div style={{ flex: 1, height: '2px', background: isPast ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--surface-3)', borderRadius: '1px', transition: 'background 0.5s' }} />}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: isCurrent ? '40px' : '32px', height: isCurrent ? '40px' : '32px', borderRadius: '50%', background: dotBg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: isCurrent ? 'var(--accent-glow)' : 'none' }}>
                      {isCurrent ? <Icon className="w-4 h-4" style={{ color: dotColor, animation: (stage.key === 'enhancing' || stage.key === 'reading') ? 'spin 2s linear infinite' : 'none' }} />
                        : isPast ? <Check className="w-3.5 h-3.5" style={{ color: dotColor }} />
                        : <Icon className="w-3.5 h-3.5" style={{ color: dotColor }} />}
                    </div>
                    <span style={{ fontSize: isCurrent ? '10px' : '9px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--accent-hover)' : isPast ? 'var(--success)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.3s' }}>{stage.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeItem.passportPreviewUrl} alt="" style={{ width: '48px', height: '34px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeItem.passportFile?.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{STAGES[activeStageIdx]?.desc || 'Preparing...'}</div>
            </div>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)', flexShrink: 0 }} />
          </div>
          <div className="progress-bar-track" style={{ marginTop: '12px' }}>
            <div className="progress-bar-fill progress-shimmer" style={{ width: `${activeItem.progress}%` }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', minHeight: '340px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          {items.map((item, idx) => {
            const isActive = item.status === 'extracting';
            const isDone = item.status === 'extracted';
            const isFailed = item.status === 'error';
            const hasEnhanced = isDone && !!item.enhancedImageUrl;
            return (
              <div key={item.id} style={{ display: 'flex', gap: '12px', padding: '10px 14px', alignItems: 'center', borderRadius: 'var(--radius-md)', background: isActive ? 'var(--accent-subtle)' : isFailed ? 'var(--error-bg)' : 'var(--glass-bg)', border: `1px solid ${isActive ? 'var(--border-bright)' : isFailed ? 'rgba(251,113,133,0.3)' : 'var(--glass-border)'}`, transition: 'all 0.3s' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: isDone ? 'var(--success)' : isFailed ? 'var(--error)' : isActive ? 'var(--accent)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {isDone ? <Check className="w-3 h-3" /> : isFailed ? <X className="w-3 h-3" /> : isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : idx + 1}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.passportPreviewUrl} alt="" style={{ width: '50px', height: '36px', objectFit: 'cover', borderRadius: '5px', border: '1px solid var(--border)', flexShrink: 0, filter: item.status === 'pending' ? 'grayscale(0.6) brightness(0.5)' : 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isFailed ? 'var(--error)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isDone ? `${item.passportData?.surname} ${item.passportData?.first_name}` : item.passportFile?.name}
                  </div>
                  <div style={{ fontSize: '10px', color: isFailed ? 'var(--error)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                    {isDone ? item.passportData?.passport_number : isFailed ? item.errorMsg : isActive ? (STAGES[activeStageIdx]?.label || 'Processing...') : 'Queued'}
                  </div>
                </div>
                {isDone && item.mrzQuality && <span style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, flexShrink: 0, background: item.mrzQuality === 'VERIFIED' ? 'rgba(52,211,153,0.12)' : item.mrzQuality === 'PARTIAL' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)', color: item.mrzQuality === 'VERIFIED' ? 'var(--success)' : item.mrzQuality === 'PARTIAL' ? '#f59e0b' : 'var(--error)' }}>MRZ {item.mrzQuality}</span>}
                {hasEnhanced && (
                  <button onClick={() => setPreviewId(previewId === item.id ? null : item.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '5px', border: '1px solid var(--border)', background: previewId === item.id ? 'var(--accent-subtle)' : 'transparent', color: previewId === item.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '9px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                    <Eye className="w-3 h-3" /> Enhanced
                  </button>
                )}
                {item.workPermitFile && <span style={{ fontSize: '8px', padding: '2px 5px', borderRadius: '4px', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>+WP</span>}
              </div>
            );
          })}

          {previewItem?.enhancedImageUrl && (
            <div className="animate-slide-up glass-card" style={{ padding: '14px', border: '1px solid var(--border-bright)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enhanced vs Original</span>
                <button onClick={() => setPreviewId(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}><X className="w-3.5 h-3.5" /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', textAlign: 'center' }}>Original</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewItem.passportPreviewUrl} alt="Original" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px', textAlign: 'center' }}>Enhanced</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewItem.enhancedImageUrl} alt="Enhanced" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--accent)', boxShadow: '0 0 15px rgba(124,92,252,0.15)' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div className={!allDone ? 'dot-pulse' : ''} style={{ width: '7px', height: '7px', borderRadius: '50%', background: allDone ? 'var(--success)' : 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Activity Log</span>
            <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--text-muted)' }}>{logs.length}</span>
          </div>
          <div className="log-panel" style={{ flex: 1, overflowY: 'auto', padding: '6px 0', minHeight: '300px', maxHeight: '50vh' }}>
            {logs.map((log) => (
              <div key={log.id} className="animate-fade-in" style={{ display: 'flex', gap: '6px', padding: '2px 12px', fontSize: '10.5px', fontFamily: "'Inter', monospace" }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.4, fontSize: '9px', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>{log.timestamp}</span>
                <span style={{ color: LOG_COLORS[log.level], flexShrink: 0, fontWeight: log.level !== 'info' ? 700 : 400, fontSize: '9px', marginTop: '2px' }}>[{LOG_PREFIXES[log.level]}]</span>
                <span style={{ color: log.level === 'info' ? 'var(--text-secondary)' : LOG_COLORS[log.level], wordBreak: 'break-word', lineHeight: 1.5 }}>{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
          <span style={{ color: 'var(--text-muted)' }}>{done}/{total} applicants processed</span>
          <span style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>{pct}%</span>
        </div>
        <div className="progress-bar-track">
          <div className={`progress-bar-fill ${!allDone ? 'progress-shimmer' : ''}`} style={{ width: `${pct}%`, background: allDone ? (failed > 0 ? 'var(--warn)' : 'var(--success)') : undefined }} />
        </div>
      </div>

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

// ————————————————————————————————————————————————————————————————
// COPY BUTTON
// ————————————————————————————————————————————————————————————————
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

// ————————————————————————————————————————————————————————————————
// REVIEW STEP
// ————————————————————————————————————————————————————————————————
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
          Select an applicant — edit any field — click <strong style={{ marginLeft: 4 }}>Send to Portal AutoFiller</strong> anytime.
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

            {/* MRZ Quality Banner */}
            {selected.mrzQuality && (
              <div style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: selected.mrzQuality === 'VERIFIED' ? 'rgba(52,211,153,0.08)' : selected.mrzQuality === 'PARTIAL' ? 'rgba(251,191,36,0.08)' : selected.mrzQuality === 'FAILED' ? 'rgba(248,113,113,0.08)' : 'rgba(148,163,184,0.08)',
                border: `1px solid ${selected.mrzQuality === 'VERIFIED' ? 'rgba(52,211,153,0.3)' : selected.mrzQuality === 'PARTIAL' ? 'rgba(251,191,36,0.3)' : selected.mrzQuality === 'FAILED' ? 'rgba(248,113,113,0.3)' : 'rgba(148,163,184,0.3)'}`,
                display: 'flex', gap: '8px', alignItems: 'center',
                fontSize: '11.5px', fontWeight: 600,
                color: selected.mrzQuality === 'VERIFIED' ? 'var(--success)' : selected.mrzQuality === 'PARTIAL' ? '#f59e0b' : selected.mrzQuality === 'FAILED' ? 'var(--error)' : 'var(--text-muted)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {selected.mrzQuality === 'VERIFIED' ? <ShieldCheck className="w-4 h-4" /> : selected.mrzQuality === 'PARTIAL' ? <ShieldAlert className="w-4 h-4" /> : selected.mrzQuality === 'FAILED' ? <AlertCircle className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                </span>
                MRZ {selected.mrzQuality}
                <span style={{ fontWeight: 400, opacity: 0.8 }}>
                  {selected.mrzQuality === 'VERIFIED' ? '— All dates & passport# checksum-verified' : selected.mrzQuality === 'PARTIAL' ? '— Some fields verified, review others' : selected.mrzQuality === 'FAILED' ? '— Checksum failed, verify ALL dates manually' : '— MRZ not readable, all dates from AI only'}
                </span>
              </div>
            )}

            {/* Passport fields */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Passport Fields</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ROP Portal label shown in pink</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px' }}>
                {PASSPORT_FIELD_LABELS.map(({ key, label, portal }) => {
                  const vStatus = selected.fieldVerification?.[key];
                  const showBadge = vStatus && ['date_of_birth', 'expiry_date', 'issue_date', 'gender', 'passport_number'].includes(key);
                  let badgeText = '';
                  let badgeBg = '';
                  let badgeColor = '';
                  let badgeBorder = '';
                  if (showBadge && vStatus) {
                    if (vStatus === 'MRZ_VERIFIED') {
                      badgeText = 'MRZ OK'; badgeBg = 'rgba(52,211,153,0.12)'; badgeColor = '#34d399'; badgeBorder = 'rgba(52,211,153,0.3)';
                    } else if (vStatus === 'MRZ_PARTIAL') {
                      badgeText = 'MRZ Partial'; badgeBg = 'rgba(251,191,36,0.1)'; badgeColor = '#f59e0b'; badgeBorder = 'rgba(251,191,36,0.25)';
                    } else if (vStatus === 'COMPUTED') {
                      badgeText = 'Calculated'; badgeBg = 'rgba(96,165,250,0.1)'; badgeColor = '#60a5fa'; badgeBorder = 'rgba(96,165,250,0.25)';
                    } else if (vStatus === 'LLM_HIGH') {
                      badgeText = 'AI High'; badgeBg = 'rgba(148,163,184,0.08)'; badgeColor = 'var(--text-muted)'; badgeBorder = 'rgba(148,163,184,0.2)';
                    } else if (vStatus === 'LLM_MEDIUM') {
                      badgeText = 'AI Medium'; badgeBg = 'rgba(251,191,36,0.08)'; badgeColor = '#f59e0b'; badgeBorder = 'rgba(251,191,36,0.2)';
                    } else if (vStatus === 'LLM_LOW') {
                      badgeText = 'Low Confidence'; badgeBg = 'rgba(248,113,113,0.1)'; badgeColor = '#f87171'; badgeBorder = 'rgba(248,113,113,0.25)';
                    } else if (vStatus === 'UNVERIFIED') {
                      badgeText = 'Unverified'; badgeBg = 'rgba(248,113,113,0.08)'; badgeColor = '#f87171'; badgeBorder = 'rgba(248,113,113,0.2)';
                    }
                  }
                  return (
                    <div key={key} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>{portal}</span>
                        {showBadge && badgeText && (
                          <span style={{
                            fontSize: '8px', fontWeight: 700, letterSpacing: '0.05em',
                            padding: '1px 6px', borderRadius: '3px', flexShrink: 0,
                            background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`,
                          }}>
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={(selected.passportData as ManualPassportData)?.[key] || ''}
                          onChange={(e) => updatePassport(key, e.target.value)}
                          style={{
                            flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
                            ...(showBadge && (vStatus === 'LLM_LOW' || vStatus === 'UNVERIFIED') ? { borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.04)' } : {}),
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = showBadge && (vStatus === 'LLM_LOW' || vStatus === 'UNVERIFIED') ? 'rgba(248,113,113,0.4)' : 'var(--border)'; }}
                        />
                        <CopyBtn value={(selected.passportData as ManualPassportData)?.[key] || ''} />
                      </div>
                    </div>
                  );
                })}
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
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>{portal}</span>
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
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>

        {/* Right: Send to extension */}
        <button
          onClick={() => {
            if (!selected) {
              alert('No applicant selected. Select one from the list first.');
              return;
            }
            if (!selected.passportData) {
              alert('No passport data found for this applicant. Did extraction complete?');
              return;
            }

            // Build the payload — be careful NOT to let work permit fields clobber
            // passport fields that share the same key name (e.g. both have expiry_date).
            // We rename the WP expiry_date → wp_expiry_date before merging.
            const { expiry_date: _wpExpiry, ...wpFieldsRest } = selected.workPermitData || {};
            const payload = {
              ...selected.passportData,       // passport fields (including passport expiry_date)
              ...wpFieldsRest,                // WP fields minus expiry_date (no collision)
              wp_expiry_date: _wpExpiry || '', // WP expiry stored separately
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
              // This timeout is just a fallback hint â€” the extension alert will appear first if it's working
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN MODULE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STORAGE_KEY = 'vizez_manual_v2';

export default function ManualVisaModule({ logs, addLog, onStepChange }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<ManualVisaItem[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [previewEnhanced, setPreviewEnhanced] = useState(false);

  // â”€â”€ Restore persisted data on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        setStep(4);
        onStepChange?.(4);
      }
    } catch {
      // ignore corrupt storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // â”€â”€ Persist extracted items whenever they change â”€â”€â”€â”€â”€â”€
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
        // Storage full â€” silently ignore
      }
    }
  }, [items]);

  // â”€â”€ Clear everything and return to step 1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const clearAll = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    setStep(1);
    onStepChange?.(1);
  }, [onStepChange]);

  const goNext = () => setStep((s) => {
    let next: Step;
    if (s === 1 && !previewEnhanced) {
      next = 3 as Step;
    } else {
      next = Math.min(s + 1, 4) as Step;
    }
    onStepChange?.(next);
    return next;
  });
  const goPrev = () => setStep((s) => {
    let prev: Step;
    if (s === 3 && !previewEnhanced) {
      prev = 1 as Step;
    } else {
      prev = Math.max(s - 1, 1) as Step;
    }
    onStepChange?.(prev);
    return prev;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {step === 1 && <UploadStep items={items} setItems={setItems} onNext={goNext} selectedModel={selectedModel} onModelChange={setSelectedModel} previewEnhanced={previewEnhanced} onPreviewToggle={setPreviewEnhanced} />}
      {step === 2 && <EnhancePreviewStep items={items} setItems={setItems} addLog={addLog} onNext={goNext} onPrev={goPrev} />}
      {step === 3 && <ExtractStep items={items} setItems={setItems} logs={logs} addLog={addLog} onNext={goNext} onPrev={goPrev} selectedModel={selectedModel} />}
      {step === 4 && <ReviewStep items={items} setItems={setItems} onPrev={goPrev} onClear={clearAll} />}
    </div>
  );
}
