'use client';

import React, { useRef, useState } from 'react';
import { PassportItem } from '@/app/types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ArrowLeft, Download, Loader2, FileDown, CheckCircle2, Info, Eye, Image } from 'lucide-react';

const BATCH_SIZE = 10;

interface Props {
  passports: PassportItem[];
  onPrev: () => void;
  letterheadSrc: string;
  stampSrc: string;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function LetterPage({ passports, letterheadSrc, stampSrc }: { passports: PassportItem[]; letterheadSrc: string; stampSrc: string }) {
  return (
    <div style={{ position: 'relative', width: '595px', height: '842px', backgroundColor: '#ffffff', overflow: 'hidden', fontFamily: 'Arial, Helvetica, sans-serif', boxSizing: 'border-box', flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={letterheadSrc} alt="Letterhead" crossOrigin={letterheadSrc.startsWith('data:') ? undefined : 'anonymous'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '138px', paddingLeft: '48px', paddingRight: '48px', boxSizing: 'border-box' }}>
        <div dir="rtl" style={{ textAlign: 'right', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', margin: '0 0 4px 0', color: '#000' }}>الفاضل / مدير عام الإدارة العامة للجوازات والإقامة &nbsp;&nbsp;&nbsp; المحترم.</p>
          <p style={{ fontSize: '11px', margin: '0 0 10px 0', color: '#000' }}>شرطة عمان السلطانية</p>
          <p style={{ fontSize: '11px', margin: '0 0 12px 0', color: '#000' }}>تحية طيبة وبعد&quot;</p>
          <p style={{ fontSize: '11px', margin: '0 0 5px 0', fontWeight: 'bold', textDecoration: 'underline', color: '#000' }}>الموضوع / طلب تمديد تأشيرة سياحية</p>
          <p style={{ fontSize: '10.5px', margin: '0 0 3px 0', color: '#000', lineHeight: '1.6' }}>بالإشارة إلى الموضوع أعلاه ، نتقدم لكم بطلب تمديد تأشيرة سياحية للموضحة أسمائهم في الجدول أدناه، وتتحمل الشركة المسؤولية وذلك</p>
          <p style={{ fontSize: '10.5px', margin: '0', color: '#000', lineHeight: '1.6' }}>حسب القوانين والنظم المعمول بها إلى حين إنهاء مدة التمديد</p>
        </div>
        <div style={{ height: '16px' }} />
        <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', color: '#000' }}>
          <thead><tr>
            <th style={thStyle('28px')} />
            <th style={thStyle()}>الاسم</th>
            <th style={thStyle('90px')}>الجنسية</th>
            <th style={thStyle('110px')}>رقم جواز السفر</th>
          </tr></thead>
          <tbody>{passports.map((p, i) => { const d = p.extractedData!; return (
            <tr key={p.id}>
              <td style={tdStyle()}>{i + 1}</td>
              <td style={{ ...tdStyle(), fontWeight: 'bold' }}>{d.full_name.toUpperCase()}</td>
              <td style={tdStyle()}>{d.nationality.toUpperCase()}</td>
              <td style={tdStyle()}>{d.passport_number.toUpperCase()}</td>
            </tr>
          ); })}</tbody>
        </table>
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stampSrc} alt="Stamp" crossOrigin={stampSrc.startsWith('data:') ? undefined : 'anonymous'} style={{ width: '170px', mixBlendMode: 'multiply', opacity: 0.9 }} />
        </div>
      </div>
    </div>
  );
}

function thStyle(width?: string): React.CSSProperties {
  return { border: '1px solid #000', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fff', ...(width ? { width } : {}) };
}
function tdStyle(): React.CSSProperties {
  return { border: '1px solid #000', padding: '4px 6px', textAlign: 'center' };
}

export default function LetterGenerationScreen({ passports, onPrev, letterheadSrc, stampSrc }: Props) {
  const [exportingBatch, setExportingBatch] = useState<number | null>(null);
  const [exportingJpgBatch, setExportingJpgBatch] = useState<number | null>(null);
  const [exportedBatches, setExportedBatches] = useState<Set<number>>(new Set());
  const [exportedJpgBatches, setExportedJpgBatches] = useState<Set<number>>(new Set());
  const [previewBatch, setPreviewBatch] = useState(0);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const batchRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const successfulPassports = passports.filter((p) => p.status === 'extracted' && p.extractedData);
  const batches = chunkArray(successfulPassports, BATCH_SIZE);

  const exportBatch = async (batchIndex: number) => {
    const ref = batchRefs.current.get(batchIndex); if (!ref) return;
    setExportingBatch(batchIndex);
    try {
      const canvas = await html2canvas(ref, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      pdf.save(`visa_letter_batch_${batchIndex + 1}.pdf`);
      setExportedBatches((prev) => new Set(prev).add(batchIndex));
    } catch (err) { console.error(err); alert(`Failed to generate PDF for batch ${batchIndex + 1}`); }
    finally { setExportingBatch(null); }
  };

  const sanitizeFilename = (raw: string): string => raw.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 50);
  const batchFilename = (batchIndex: number): string => {
    const first = batches[batchIndex]?.[0]; if (!first?.extractedData) return `BATCH_${batchIndex + 1}`;
    const { passport_number, full_name } = first.extractedData;
    const nameParts = full_name.trim().split(/\s+/);
    return sanitizeFilename(`${passport_number}_${nameParts[0] || ''}_${nameParts[1] || ''}`) || `BATCH_${batchIndex + 1}`;
  };

  const canvasToJpegUnder500KB = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const MAX_BYTES = 500 * 1024;
      const tryQuality = (q: number) => {
        canvas.toBlob((blob) => { if (!blob) { reject(new Error('Canvas toBlob failed')); return; } if (blob.size <= MAX_BYTES || q <= 0.1) resolve(blob); else tryQuality(Math.max(q - 0.1, 0.1)); }, 'image/jpeg', q);
      };
      tryQuality(0.85);
    });

  const exportBatchAsJPG = async (batchIndex: number) => {
    const ref = batchRefs.current.get(batchIndex); if (!ref) return;
    setExportingJpgBatch(batchIndex);
    try {
      const canvas = await html2canvas(ref, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' });
      const blob = await canvasToJpegUnder500KB(canvas);
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `${batchFilename(batchIndex)}.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setExportedJpgBatches((prev) => new Set(prev).add(batchIndex));
    } catch (err) { console.error(err); alert(`Failed to generate JPG for batch ${batchIndex + 1}`); }
    finally { setExportingJpgBatch(null); }
  };

  const downloadAll = async () => {
    setIsDownloadingAll(true);
    for (let i = 0; i < batches.length; i++) { await exportBatch(i); if (i < batches.length - 1) await new Promise((r) => setTimeout(r, 500)); }
    setIsDownloadingAll(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 className="gradient-text" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>Generate PDF Letters</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            {successfulPassports.length} passport{successfulPassports.length !== 1 ? 's' : ''} → {batches.length} PDF{batches.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onPrev} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Edit Data</button>
          {batches.length > 1 && (
            <button onClick={downloadAll} disabled={isDownloadingAll} className="btn-primary" style={isDownloadingAll ? { opacity: 0.7, cursor: 'wait' } : {}}>
              {isDownloadingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Download All ({batches.length})
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--info-bg)', border: '1px solid rgba(96,165,250,0.15)', fontSize: '12px', color: 'var(--info)', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Each PDF contains a maximum of 10 passport entries as required by Oman immigration.
        {batches.length > 1 && ` You have ${batches.length} separate letters to submit.`}
      </div>

      {successfulPassports.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', fontSize: '14px' }}>No successfully extracted passports to generate.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', minHeight: '620px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 2px' }}>Batches</div>
            {batches.map((batch, i) => {
              const isExporting = exportingBatch === i; const isDone = exportedBatches.has(i); const isActive = previewBatch === i;
              return (
                <div key={i} className="glass-card" style={{ padding: '14px', border: `1px solid ${isActive ? 'var(--border-bright)' : 'var(--glass-border)'}`, boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>Batch {i + 1}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>Passports {i * BATCH_SIZE + 1}–{Math.min((i + 1) * BATCH_SIZE, successfulPassports.length)} ({batch.length} entries)</div>
                    </div>
                    {isDone && <CheckCircle2 className="w-4 h-4 pop-in" style={{ color: 'var(--success)' }} />}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setPreviewBatch(i)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '7px', fontSize: '12px', ...(isActive ? { background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--border-bright)' } : {}) }}>
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button onClick={() => exportBatch(i)} disabled={isExporting || isDownloadingAll} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '7px', fontSize: '12px', ...(isDone ? { background: 'var(--success-bg)', color: 'var(--success)', boxShadow: 'none' } : {}), ...(isExporting ? { opacity: 0.7, cursor: 'wait' } : {}) }}>
                      {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                    </button>
                  </div>
                  <button onClick={() => exportBatchAsJPG(i)} disabled={exportingJpgBatch === i || isDownloadingAll} className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', padding: '6px', marginTop: '6px', fontSize: '11px', ...(exportedJpgBatches.has(i) ? { borderColor: 'rgba(52,211,153,0.3)', background: 'var(--success-bg)', color: 'var(--success)' } : {}), ...(exportingJpgBatch === i ? { opacity: 0.7, cursor: 'wait' } : {}) }}
                    title={`Download JPG (≤500KB) — ${batchFilename(i)}.jpg`}>
                    {exportingJpgBatch === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                    {exportedJpgBatches.has(i) ? '✓ JPG saved' : 'Download JPG'}
                    <span style={{ opacity: 0.5, fontSize: '10px', marginLeft: '4px' }}>≤500KB</span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="glass-card" style={{ overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>
            <div style={{ boxShadow: '0 12px 50px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {batches.map((batch, i) => (<div key={i} ref={(el) => { if (el) batchRefs.current.set(i, el); }}><LetterPage passports={batch} letterheadSrc={letterheadSrc} stampSrc={stampSrc} /></div>))}
              </div>
              <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                <LetterPage passports={batches[previewBatch] || []} letterheadSrc={letterheadSrc} stampSrc={stampSrc} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
