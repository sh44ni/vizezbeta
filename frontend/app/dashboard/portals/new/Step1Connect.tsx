'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Puzzle, Loader, AlertTriangle, CheckCircle, Link2, Globe, Scan, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ScanResult {
  url: string;
  title: string;
  total_fields: number;
  required_fields: number;
  language: string;
  fields: any[];
}

interface Props {
  onNext: () => void;
  onScanResult: (result: ScanResult) => void;
}

export default function Step1Connect({ onNext, onScanResult }: Props) {
  const [mode, setMode] = useState<'choose' | 'extension' | 'url'>('choose');
  const [status, setStatus] = useState<'waiting' | 'scanning' | 'analyzing' | 'done' | 'error'>('waiting');
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [analyzeStats, setAnalyzeStats] = useState<{ raw: number; clean: number; removed: number } | null>(null);
  const listenerRef = useRef(false);

  // ── AI Field Analysis ──
  // Takes raw scan data → sends to backend → GPT-4o filters noise → returns clean fields
  const analyzeFields = async (rawResult: any) => {
    setStatus('analyzing');
    try {
      const resp = await apiFetch('/api/portals/analyze-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: rawResult.url || '',
          title: rawResult.title || '',
          fields: rawResult.fields || [],
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || `Analysis failed (HTTP ${resp.status})`);
      }

      const analyzed = await resp.json();

      // Stats for the UI
      setAnalyzeStats({
        raw: rawResult.fields?.length || 0,
        clean: analyzed.fields?.length || 0,
        removed: analyzed.removed?.length || 0,
      });

      // Build the clean scan result
      const cleanResult: ScanResult = {
        url: analyzed.url || rawResult.url,
        title: analyzed.title || rawResult.title,
        total_fields: analyzed.total_fields || analyzed.fields?.length || 0,
        required_fields: analyzed.required_fields || 0,
        language: analyzed.language || 'en',
        fields: analyzed.fields || [],
      };

      setStatus('done');
      onScanResult(cleanResult);
      setTimeout(onNext, 1200);
    } catch (err: any) {
      console.error('[Step1] Field analysis failed, falling back to raw fields:', err.message);
      // Fallback — use raw fields if AI analysis fails
      setStatus('done');
      onScanResult(rawResult);
      setTimeout(onNext, 800);
    }
  };

  // Detect extension + listen for scan results
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data?.type === 'VIZEZ_SCAN_RESULT') {
        const result = event.data.payload;
        if (result?.error && (!result?.fields || result.fields.length === 0)) {
          setStatus('error');
          setErrorMsg(result.error || 'Scan failed — no fields detected.');
          return;
        }
        if (result?.fields?.length > 0) {
          // ── Send raw fields through AI analysis before continuing ──
          analyzeFields(result);
        } else {
          setStatus('error');
          setErrorMsg('No form fields detected on this page. The portal may require login first, or the page may not have a form.');
        }
      }

      if (event.data?.type === 'VIZEZ_PONG' || event.data?.type === 'VIZEZ_EXTENSION_READY') {
        setExtensionDetected(true);
      }
    };

    if (!listenerRef.current) {
      window.addEventListener('message', handler);
      listenerRef.current = true;
    }

    // Check for extension
    const attr = document.documentElement.getAttribute('data-vizez-extension');
    if (attr) setExtensionDetected(true);
    else {
      window.postMessage({ type: 'VIZEZ_PING' }, '*');
      setTimeout(() => {
        setExtensionDetected(prev => prev === null ? false : prev);
      }, 2000);
    }

    return () => {
      window.removeEventListener('message', handler);
      listenerRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Extension scan (active tab)
  const handleExtensionScan = () => {
    setStatus('scanning');
    setErrorMsg('');
    setAnalyzeStats(null);
    window.postMessage({ type: 'VIZEZ_SCAN_REQUEST' }, '*');
    setTimeout(() => {
      setStatus(prev => {
        if (prev === 'scanning') {
          setErrorMsg('No response from extension. Make sure the extension is installed and the portal tab is open.');
          return 'error';
        }
        return prev;
      });
    }, 12000);
  };

  // URL scan — extension opens the URL and scans it
  const handleUrlScan = () => {
    if (!portalUrl.trim()) return;

    // Validate URL
    try {
      new URL(portalUrl.trim());
    } catch {
      setErrorMsg('Please enter a valid URL (e.g. https://evisa.rop.gov.om/...)');
      return;
    }

    if (!extensionDetected) {
      setErrorMsg('VizEz extension is required to scan portal pages. Install it from chrome://extensions first.');
      return;
    }

    setStatus('scanning');
    setErrorMsg('');

    // Send to extension — it'll open the URL in a background tab, scan, and return results
    window.postMessage({ type: 'VIZEZ_SCAN_URL', url: portalUrl.trim() }, '*');

    // Timeout after 35s
    setTimeout(() => {
      setStatus(prev => {
        if (prev === 'scanning') {
          setErrorMsg('Scan timed out. The page may be too slow to load, or it may require login first.');
          return 'error';
        }
        return prev;
      });
    }, 35000);
  };

  // Mode: Choose
  if (mode === 'choose') {
    return (
      <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '40px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'var(--accent-subtle)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Globe className="w-10 h-10" style={{ color: 'var(--accent)' }} />
        </div>

        <h2 style={{
          fontSize: '26px', fontWeight: 800, margin: '0 0 12px',
          fontFamily: "'Outfit', 'Inter', sans-serif", color: 'var(--text-primary)',
        }}>
          Add a new portal
        </h2>
        <p style={{
          fontSize: '15px', color: 'var(--text-muted)', maxWidth: '480px',
          margin: '0 auto 40px', lineHeight: 1.7,
        }}>
          Choose how you want to connect the government portal you&apos;re mapping.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '560px', margin: '0 auto' }}>
          {/* Option 1: Paste URL */}
          <button
            onClick={() => setMode('url')}
            style={{
              padding: '32px 24px', borderRadius: 'var(--radius-xl)',
              background: 'var(--card-bg)', border: '2px solid var(--border)',
              cursor: 'pointer', textAlign: 'center', color: 'inherit',
              fontFamily: 'inherit', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'var(--accent-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Link2 className="w-7 h-7" style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Paste Portal Link
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Enter a URL — we&apos;ll open and scan it automatically
            </div>
            <div style={{
              marginTop: '16px', fontSize: '11px', fontWeight: 600, padding: '4px 12px',
              borderRadius: '99px', background: 'rgba(52,211,153,0.1)', color: 'var(--success)',
              display: 'inline-block',
            }}>
              Recommended
            </div>
          </button>

          {/* Option 2: Extension Scan */}
          <button
            onClick={() => setMode('extension')}
            style={{
              padding: '32px 24px', borderRadius: 'var(--radius-xl)',
              background: 'var(--card-bg)', border: '2px solid var(--border)',
              cursor: 'pointer', textAlign: 'center', color: 'inherit',
              fontFamily: 'inherit', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Puzzle className="w-7 h-7" style={{ color: '#818cf8' }} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Scan Active Tab
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Scan the tab you already have open in your browser
            </div>
            <div style={{
              marginTop: '16px', fontSize: '11px', fontWeight: 600, padding: '4px 12px',
              borderRadius: '99px',
              background: extensionDetected ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              color: extensionDetected ? 'var(--success)' : 'var(--error)',
              display: 'inline-block',
            }}>
              {extensionDetected ? 'Extension detected' : 'Extension required'}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Mode: URL Input
  if (mode === 'url') {
    return (
      <div className="animate-card-appear" style={{ paddingTop: '40px' }}>
        <button
          onClick={() => { setMode('choose'); setStatus('waiting'); setErrorMsg(''); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', fontSize: '13px', fontWeight: 600,
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '4px',
            fontFamily: 'inherit',
          }}
        >
          ← Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: status === 'done' ? 'var(--gradient-success)' : status === 'analyzing' ? 'rgba(251,191,36,0.15)' : status === 'scanning' ? 'var(--accent-subtle)' : 'var(--accent-subtle)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', transition: 'all 0.3s ease',
          }}>
            {status === 'done' ? (
              <CheckCircle className="w-9 h-9" style={{ color: '#fff' }} />
            ) : status === 'analyzing' ? (
              <Sparkles className="w-9 h-9 animate-spin" style={{ color: '#fbbf24' }} />
            ) : status === 'scanning' ? (
              <Loader className="w-9 h-9 animate-spin" style={{ color: 'var(--accent)' }} />
            ) : (
              <Link2 className="w-9 h-9" style={{ color: 'var(--accent)' }} />
            )}
          </div>

          <h2 style={{
            fontSize: '24px', fontWeight: 800, margin: '0 0 8px',
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}>
            {status === 'analyzing' ? 'AI analyzing fields...' : status === 'scanning' ? 'Scanning portal...' : status === 'done' ? 'Portal scanned!' : 'Enter portal URL'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.6 }}>
            {status === 'analyzing'
              ? 'AI is filtering noise fields and mapping real form inputs...'
              : status === 'scanning'
              ? 'Opening the portal in a background tab and scanning its form fields...'
              : status === 'done'
              ? `Fields analyzed! ${analyzeStats ? `${analyzeStats.clean} real fields found (${analyzeStats.removed} noise removed)` : 'Moving to the next step...'}`
              : 'Paste the link to the government portal form. The extension will open it and scan the fields automatically.'}
          </p>
        </div>

        {/* URL Input */}
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Globe className="w-4 h-4" style={{
              position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} />
            <input
              className="clean-input"
              placeholder="https://evisa.rop.gov.om/visa/apply"
              value={portalUrl}
              onChange={e => { setPortalUrl(e.target.value); setErrorMsg(''); setStatus('waiting'); }}
              onKeyDown={e => e.key === 'Enter' && handleUrlScan()}
              disabled={status === 'scanning' || status === 'done'}
              autoFocus
              style={{
                paddingLeft: '44px', fontSize: '15px',
                fontFamily: 'monospace', padding: '16px 16px 16px 44px',
                opacity: status === 'scanning' ? 0.6 : 1,
              }}
            />
          </div>

          {/* Extension warning */}
          {!extensionDetected && (
            <div style={{
              marginBottom: '16px', padding: '10px 16px', borderRadius: '10px',
              background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.15)',
              color: 'var(--error)', fontSize: '13px', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertTriangle className="w-4 h-4" style={{ flexShrink: 0 }} />
              VizEz extension required. Install it from chrome://extensions
            </div>
          )}

          {errorMsg && (
            <div style={{
              marginBottom: '16px', padding: '10px 16px', borderRadius: '10px',
              background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.15)',
              color: 'var(--error)', fontSize: '13px', fontWeight: 500,
            }}>
              {errorMsg}
            </div>
          )}

          <button
            className="btn-friendly"
            onClick={handleUrlScan}
            disabled={!portalUrl.trim() || status === 'scanning' || status === 'done' || !extensionDetected}
            style={{
              width: '100%', fontSize: '15px', padding: '16px',
              opacity: (portalUrl.trim() && extensionDetected) ? 1 : 0.5,
            }}
          >
            {status === 'scanning' ? (
              <><Loader className="w-5 h-5 animate-spin" /> Opening & scanning portal...</>
            ) : status === 'done' ? (
              <><CheckCircle className="w-5 h-5" /> Scan complete!</>
            ) : (
              <><Scan className="w-5 h-5" /> Open & Scan Portal</>
            )}
          </button>

          {/* Scanning / Analyzing progress */}
          {(status === 'scanning' || status === 'analyzing') && (
            <div style={{
              marginTop: '20px', textAlign: 'center', fontSize: '12px',
              color: 'var(--text-muted)',
            }}>
              <div style={{
                width: '100%', height: '3px', borderRadius: '99px',
                background: 'var(--border)', overflow: 'hidden', marginBottom: '10px',
              }}>
                <div className="scan-progress-bar" style={{
                  width: '60%', height: '100%', borderRadius: '99px',
                  background: 'var(--accent)',
                  animation: 'scan-progress 3s ease-in-out infinite',
                }} />
              </div>
              {status === 'analyzing'
                ? '✨ AI is filtering noise and mapping real form fields...'
                : 'The portal is loading in a background tab. This may take a few seconds...'}
            </div>
          )}

          {/* Examples */}
          {status === 'waiting' && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                Example portals:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {[
                  { label: 'ROP Oman', url: 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx#step-1' },
                  { label: 'ICA UAE', url: 'https://smartservices.ica.gov.ae/echannels/' },
                  { label: 'Absher Saudi', url: 'https://www.absher.sa/portal/' },
                ].map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => setPortalUrl(ex.url)}
                    style={{
                      fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                      borderRadius: '99px', border: '1px solid var(--border)',
                      background: 'var(--surface-2)', color: 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mode: Extension Scan (active tab)
  return (
    <div className="animate-card-appear" style={{ paddingTop: '40px' }}>
      <button
        onClick={() => { setMode('choose'); setStatus('waiting'); setErrorMsg(''); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--accent)', fontSize: '13px', fontWeight: 600,
          marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '4px',
          fontFamily: 'inherit',
        }}
      >
        ← Back
      </button>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: status === 'done' ? 'var(--gradient-success)' : status === 'analyzing' ? 'rgba(251,191,36,0.15)' : 'var(--accent-subtle)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', transition: 'all 0.3s ease',
        }}>
          {status === 'done' ? (
            <CheckCircle className="w-9 h-9" style={{ color: '#fff' }} />
          ) : status === 'analyzing' ? (
            <Sparkles className="w-9 h-9 animate-spin" style={{ color: '#fbbf24' }} />
          ) : (
            <Puzzle className="w-9 h-9" style={{ color: 'var(--accent)' }} />
          )}
        </div>

        <h2 style={{
          fontSize: '24px', fontWeight: 800, margin: '0 0 10px',
          fontFamily: "'Outfit', 'Inter', sans-serif",
        }}>
          {status === 'analyzing' ? 'AI analyzing fields...' : status === 'done' ? 'Portal analyzed!' : 'Open the portal you want to train'}
        </h2>
        <p style={{
          fontSize: '14px', color: 'var(--text-muted)', maxWidth: '460px',
          margin: '0 auto 32px', lineHeight: 1.7,
        }}>
          {status === 'analyzing'
            ? 'Filtering out navigation elements, search bars, and other noise...'
            : status === 'done'
            ? `${analyzeStats ? `${analyzeStats.clean} real fields found from ${analyzeStats.raw} raw inputs (${analyzeStats.removed} noise removed)` : 'Form fields detected successfully. Moving to the next step...'}`
            : 'Navigate to the government portal form in another tab. Log in if needed. Then click the button below to scan its fields.'}
        </p>

        {extensionDetected === false && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '12px 24px', borderRadius: '12px',
            background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.2)',
            marginBottom: '20px',
          }}>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} />
            <span style={{ fontSize: '13px', color: 'var(--error)', fontWeight: 500 }}>
              VizEz extension not detected. Install it from chrome://extensions
            </span>
          </div>
        )}

        <button
          className="btn-friendly"
          onClick={handleExtensionScan}
          disabled={status === 'scanning' || status === 'analyzing' || status === 'done'}
          style={{ fontSize: '15px', padding: '14px 36px' }}
        >
          {status === 'scanning' ? (
            <><Loader className="w-5 h-5 animate-spin" /> Scanning portal fields...</>
          ) : status === 'analyzing' ? (
            <><Sparkles className="w-5 h-5 animate-spin" /> AI analyzing fields...</>
          ) : status === 'done' ? (
            <><CheckCircle className="w-5 h-5" /> Analysis complete!</>
          ) : (
            <>🚀 I&apos;m on the form — Start Scanning</>
          )}
        </button>

        {errorMsg && (
          <div style={{
            marginTop: '16px', padding: '12px 20px', borderRadius: '10px',
            background: 'var(--error-bg)', border: '1px solid rgba(248,113,113,0.15)',
            color: 'var(--error)', fontSize: '13px', fontWeight: 500,
            maxWidth: '480px', margin: '16px auto 0',
          }}>
            {errorMsg}
          </div>
        )}

        {/* Status */}
        <div style={{
          marginTop: '28px', display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '10px 20px', borderRadius: '12px',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: extensionDetected ? 'var(--success)' : status === 'scanning' ? 'var(--accent)' : 'var(--text-muted)',
            boxShadow: extensionDetected ? '0 0 8px var(--success)' : 'none',
            animation: status === 'scanning' ? 'dot-pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: '13px', color: extensionDetected ? 'var(--success)' : 'var(--text-muted)', fontWeight: 500 }}>
            {extensionDetected ? 'Extension connected' : status === 'scanning' ? 'Scanning...' : 'Waiting for extension...'}
          </span>
        </div>
      </div>
    </div>
  );
}
