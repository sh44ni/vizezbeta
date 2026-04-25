'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Puzzle, CheckCircle, ChevronRight, ChevronLeft, X, Download, Globe, ToggleRight, FolderOpen, RefreshCw, PlayCircle } from 'lucide-react';

type ExtStatus = 'checking' | 'installed' | 'not-installed';

export default function ExtensionStatus({ compact }: { compact?: boolean }) {
  const [status, setStatus] = useState<ExtStatus>('checking');
  const [showGuide, setShowGuide] = useState(false);

  const check = useCallback(() => {
    if (document.documentElement.getAttribute('data-vizez-extension') === 'installed') {
      setStatus('installed');
    } else {
      setStatus('not-installed');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(check, 800);
    const h = (e: MessageEvent) => { if (e.data?.type === 'VIZEZ_EXTENSION_READY') setStatus('installed'); };
    window.addEventListener('message', h);
    return () => { clearTimeout(t); window.removeEventListener('message', h); };
  }, [check]);

  useEffect(() => {
    if (status === 'installed') return;
    const i = setInterval(() => {
      if (document.documentElement.getAttribute('data-vizez-extension') === 'installed') setStatus('installed');
    }, 3000);
    return () => clearInterval(i);
  }, [status]);

  if (!compact) return showGuide ? <InstallWizard onClose={() => setShowGuide(false)} onRecheck={check} /> : null;

  return (
    <>
      <button
        onClick={() => status !== 'installed' && setShowGuide(true)}
        title={status === 'installed' ? 'VizEz Extension — Active' : 'Install VizEz Extension'}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 12px', borderRadius: 'var(--radius-md)',
          border: `1px solid ${status === 'installed' ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
          background: status === 'installed' ? 'var(--success-bg)' : 'var(--glass-bg)',
          cursor: status === 'installed' ? 'default' : 'pointer',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)', textAlign: 'left',
        }}
        onMouseEnter={(e) => { if (status !== 'installed') { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}}
        onMouseLeave={(e) => { if (status !== 'installed') { (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: status === 'installed' ? 'rgba(52,211,153,0.15)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {status === 'installed' ? <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
           : status === 'checking' ? <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
           : <Puzzle className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: status === 'installed' ? 'var(--success)' : 'var(--text-secondary)', lineHeight: 1.2 }}>
            {status === 'installed' ? 'Extension Active' : status === 'checking' ? 'Checking...' : 'Install Extension'}
          </div>
          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: 1 }}>
            {status === 'installed' ? 'AutoFiller connected' : 'Required for ROP portal'}
          </div>
        </div>
        {status === 'not-installed' && <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        {status === 'installed' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px rgba(52,211,153,0.5)', flexShrink: 0, animation: 'dot-pulse 2s ease-in-out infinite' }} />}
      </button>
      {showGuide && createPortal(<InstallWizard onClose={() => setShowGuide(false)} onRecheck={check} />, document.body)}
    </>
  );
}

/* ═══════════════════════════════════════════════
   INTERACTIVE INSTALL WIZARD
═══════════════════════════════════════════════ */

const STEPS = [
  {
    icon: Download,
    title: 'Download Extension',
    heading: 'First, grab the extension files',
    body: 'Click the button below to download the VizEz AutoFiller extension package. This is a small ZIP file containing everything needed.',
    action: 'download',
  },
  {
    icon: PlayCircle,
    title: 'Watch Tutorial',
    heading: 'Quick video walkthrough',
    body: 'Watch this short tutorial showing the entire installation process. Follow along or skip ahead to do it yourself.',
    action: 'video',
  },
  {
    icon: FolderOpen,
    title: 'Extract the ZIP',
    heading: 'Unzip to a folder',
    body: 'Extract the downloaded ZIP file to a folder on your computer. Remember where you saved it — you\'ll need it in step 5.',
    tip: '💡 We recommend creating a folder like Desktop/VizEz Extension',
    action: null,
  },
  {
    icon: Globe,
    title: 'Open Extensions Page',
    heading: 'Navigate to Chrome Extensions',
    body: 'Open a new tab in Chrome and type the address below into the address bar, then press Enter.',
    code: 'chrome://extensions',
    action: null,
  },
  {
    icon: ToggleRight,
    title: 'Developer Mode',
    heading: 'Enable Developer Mode',
    body: 'In the top-right corner of the extensions page, you\'ll see a toggle switch labeled "Developer mode". Turn it ON.',
    tip: '🔧 This allows Chrome to load extensions from your local files',
    action: null,
  },
  {
    icon: FolderOpen,
    title: 'Load Extension',
    heading: 'Load the unpacked extension',
    body: 'Click the "Load unpacked" button that appears in the top-left. Browse to the folder where you extracted the ZIP and select it.',
    tip: '✅ You should see "VizEz AutoFiller" appear in your extensions list',
    action: null,
  },
  {
    icon: RefreshCw,
    title: 'Refresh & Connect',
    heading: 'Almost done! Refresh this page',
    body: 'Come back to this VizEz tab and refresh the page (press F5). The extension will automatically connect and you\'re ready to go!',
    action: 'finish',
  },
];

function InstallWizard({ onClose, onRecheck }: { onClose: () => void; onRecheck: () => void }) {
  const [step, setStep] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = '/vizez-autofiller-extension.zip';
    a.download = 'vizez-autofiller-extension.zip';
    a.click();
    setDownloaded(true);
  };

  return (
    <>
      {/* Overlay + centered wrapper */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        {/* Modal — stop click propagation so clicking inside doesn't close */}
        <div onClick={e => e.stopPropagation()} className="animate-slide-up" style={{
          width: 520, maxWidth: '100%', maxHeight: '80vh', overflowY: 'auto',
          background: 'var(--surface-solid)',
          border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)',
          zIndex: 1000, boxShadow: 'var(--shadow-lg), 0 0 100px rgba(124, 92, 252, 0.1)',
        }}>
        {/* Gradient top bar */}
        <div style={{ height: 3, background: 'var(--gradient-primary)' }} />

        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,92,252,0.3)' }}>
              <Puzzle className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit','Inter',sans-serif", color: 'var(--text-primary)' }}>Install Extension</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Step {step + 1} of {STEPS.length}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--glass-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, padding: '16px 28px 0', justifyContent: 'center' }}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 28 : 8, height: 8, borderRadius: 99,
              background: i < step ? 'var(--success)' : i === step ? 'var(--accent)' : 'var(--surface-3)',
              border: 'none', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: i === step ? '0 0 10px rgba(124,92,252,0.4)' : 'none',
            }} />
          ))}
        </div>

        {/* Step content */}
        <div key={step} className="animate-fade-in" style={{ padding: '24px 28px' }}>
          {/* Step icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--accent-subtle)', border: '1.5px solid var(--border-bright)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 3 }}>
                {current.title}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit','Inter',sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {current.heading}
              </div>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 16px' }}>
            {current.body}
          </p>

          {/* Code block */}
          {current.code && (
            <div
              onClick={() => navigator.clipboard.writeText(current.code!)}
              title="Click to copy"
              style={{
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                fontSize: 14, fontFamily: "'Courier New', monospace", color: 'var(--accent)',
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
            >
              {current.code}
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Click to copy</span>
            </div>
          )}

          {/* Tip */}
          {current.tip && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--info-bg)', border: '1px solid rgba(96,165,250,0.15)',
              fontSize: 12, color: 'var(--info)', lineHeight: 1.5,
            }}>
              {current.tip}
            </div>
          )}

          {/* Download action */}
          {current.action === 'download' && (
            <button onClick={handleDownload} className="btn-primary" style={{
              width: '100%', justifyContent: 'center', padding: '13px 24px', fontSize: 14, marginTop: 8,
              background: downloaded ? 'var(--success)' : undefined,
              boxShadow: downloaded ? '0 0 20px rgba(52,211,153,0.3)' : undefined,
            }}>
              <Download className="w-4 h-4" />
              {downloaded ? 'Downloaded! ✓' : 'Download VizEz Extension'}
            </button>
          )}

          {/* Video tutorial */}
          {current.action === 'video' && (
            <div style={{
              marginTop: 4, borderRadius: 'var(--radius-md)', overflow: 'hidden',
              border: '1px solid var(--border)', background: '#000',
            }}>
              <video
                src="/extension-tutorial.mp4"
                controls
                autoPlay
                style={{ width: '100%', display: 'block', maxHeight: 280 }}
              />
            </div>
          )}

          {/* Finish action */}
          {current.action === 'finish' && (
            <button onClick={() => { onRecheck(); onClose(); window.location.reload(); }} className="btn-primary" style={{
              width: '100%', justifyContent: 'center', padding: '13px 24px', fontSize: 14, marginTop: 8,
            }}>
              <RefreshCw className="w-4 h-4" />
              Refresh Page & Connect
            </button>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          padding: '0 28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={isFirst}
            className="btn-ghost"
            style={{ padding: '9px 18px', fontSize: 12.5, opacity: isFirst ? 0.3 : 1 }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {step + 1} / {STEPS.length}
          </span>

          {!isLast && (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="btn-primary"
              style={{ padding: '9px 18px', fontSize: 12.5 }}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {isLast && (
            <button onClick={onClose} className="btn-ghost" style={{ padding: '9px 18px', fontSize: 12.5 }}>
              Close
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
