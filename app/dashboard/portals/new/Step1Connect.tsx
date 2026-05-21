'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Puzzle, Loader, AlertTriangle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import type { ScanResult } from './page';

interface Props {
  onScanComplete: (result: ScanResult) => void;
}

type ExtensionStatus = 'checking' | 'connected' | 'not_detected';

export default function Step1Connect({ onScanComplete }: Props) {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  /* ── Detect extension on mount ── */
  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-vizez-extension');
    if (attr === 'installed') { setExtensionStatus('connected'); return; }

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'VIZEZ_PONG' || e.data?.type === 'VIZEZ_EXTENSION_READY') {
        setExtensionStatus('connected');
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'VIZEZ_PING' }, '*');

    const fallback = setTimeout(() => {
      setExtensionStatus(prev => prev === 'checking' ? 'not_detected' : prev);
      window.removeEventListener('message', handler);
    }, 3000);

    return () => { clearTimeout(fallback); window.removeEventListener('message', handler); };
  }, []);

  /* ── Clean up on unmount ── */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (listenerRef.current) window.removeEventListener('message', listenerRef.current);
    };
  }, []);

  /* ── Handle scan ── */
  const handleScan = useCallback(() => {
    if (!url.trim()) { setError('Please enter a portal URL.'); return; }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) normalizedUrl = `https://${normalizedUrl}`;

    try { new URL(normalizedUrl); } catch {
      setError('Please enter a valid URL.'); return;
    }

    setError(null);
    setScanning(true);
    setProgress('Opening portal in a new tab...');

    // Clean up previous listener
    if (listenerRef.current) window.removeEventListener('message', listenerRef.current);

    // Listen for scan result
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'VIZEZ_SCAN_RESULT') return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('message', handler);
      listenerRef.current = null;
      setScanning(false);
      setProgress('');

      const payload = e.data.payload || e.data;

      if (payload.error && (!payload.fields || payload.fields.length === 0)) {
        setError(payload.error);
        return;
      }

      onScanComplete({
        url: payload.url || normalizedUrl,
        title: payload.title || '',
        total_fields: payload.total_fields || payload.fields?.length || 0,
        required_fields: payload.required_fields || 0,
        language: payload.language || 'English',
        fields: payload.fields || [],
      });
    };
    window.addEventListener('message', handler);
    listenerRef.current = handler;

    // Send SCAN_URL — extension opens the URL in a new tab, scans, then closes it
    window.postMessage({ type: 'VIZEZ_SCAN_URL', url: normalizedUrl }, '*');

    // Progress updates
    setTimeout(() => { if (scanning) setProgress('Waiting for page to load...'); }, 3000);
    setTimeout(() => { if (scanning) setProgress('Scanning form fields...'); }, 8000);
    setTimeout(() => { if (scanning) setProgress('Still scanning — some portals are slow...'); }, 18000);

    // Timeout after 45 seconds (gov portals can be slow)
    timeoutRef.current = setTimeout(() => {
      if (listenerRef.current) {
        window.removeEventListener('message', listenerRef.current);
        listenerRef.current = null;
      }
      setScanning(false);
      setProgress('');
      setError('Scan timed out after 45 seconds. The portal may be blocking extensions or taking too long to load.');
    }, 45000);
  }, [url, onScanComplete, scanning]);

  const statusColor = extensionStatus === 'connected' ? '#4ade80'
    : extensionStatus === 'not_detected' ? '#f87171' : 'rgba(255,255,255,0.45)';

  return (
    <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '40px' }}>
      {/* Icon */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '24px',
        background: 'rgba(124,92,252,0.10)', border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <Puzzle size={40} style={{ color: '#7c5cfc' }} />
      </div>

      <h2 style={{
        fontSize: '26px', fontWeight: 800, margin: '0 0 12px',
        fontFamily: "'Outfit', 'Inter', sans-serif", color: '#ffffff',
      }}>
        Enter Portal URL
      </h2>
      <p style={{
        fontSize: '15px', color: 'rgba(255,255,255,0.45)', maxWidth: '480px',
        margin: '0 auto 32px', lineHeight: 1.7,
      }}>
        Paste the government portal form URL. VizEz will open it, scan all form fields, and bring back the results.
      </p>

      {/* URL Input */}
      <div style={{ maxWidth: '520px', margin: '0 auto 20px' }}>
        <div style={{ position: 'relative' }}>
          <LinkIcon size={16} style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.30)',
          }} />
          <input
            type="url"
            placeholder="https://evisa.rop.gov.om/apply/new-visa"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter' && !scanning) handleScan(); }}
            disabled={scanning}
            style={{
              width: '100%', background: '#111111',
              border: `1px solid ${error ? '#f87171' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '10px', padding: '14px 14px 14px 40px',
              color: '#ffffff', fontSize: '14px',
              fontFamily: "'JetBrains Mono', monospace",
              outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={e => {
              if (!error) {
                e.currentTarget.style.borderColor = '#7c5cfc';
                e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
              }
            }}
            onBlur={e => {
              if (!error) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          />
        </div>
      </div>

      {/* Scan button */}
      <button
        className="btn-friendly"
        onClick={handleScan}
        disabled={scanning || extensionStatus === 'not_detected'}
        style={{
          fontSize: '16px', padding: '16px 48px',
          opacity: scanning ? 0.8 : 1,
        }}
      >
        {scanning ? (
          <>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Scanning...
          </>
        ) : (
          <>🔍 Scan Portal</>
        )}
      </button>

      {/* Progress text */}
      {scanning && progress && (
        <div style={{
          marginTop: '20px', fontSize: '13px', color: '#7c5cfc', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', background: '#7c5cfc',
            animation: 'dot-pulse 1.5s ease-in-out infinite',
          }} />
          {progress}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          marginTop: '16px', fontSize: '13px', color: '#f87171', fontWeight: 500,
          maxWidth: '520px', margin: '16px auto 0',
        }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Extension status / download */}
      <div style={{
        maxWidth: '520px', margin: '28px auto 0',
        borderRadius: '12px',
        background: '#0a0a0a', border: `1px solid ${extensionStatus === 'not_detected' ? 'rgba(248,113,113,0.20)' : 'rgba(255,255,255,0.06)'}`,
        overflow: 'hidden',
      }}>
        {/* Status row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: extensionStatus === 'not_detected' ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', background: statusColor,
              animation: extensionStatus === 'checking' ? 'dot-pulse 1.5s ease-in-out infinite' : 'none',
              boxShadow: extensionStatus === 'connected' ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
            }} />
            <span style={{ fontSize: '13px', color: statusColor, fontWeight: 600 }}>
              {extensionStatus === 'connected' ? 'VizEz Brain Connected'
                : extensionStatus === 'not_detected' ? 'VizEz Brain Not Detected'
                : 'Detecting VizEz Brain...'}
            </span>
          </div>

          {/* Retry button */}
          {extensionStatus === 'not_detected' && (
            <button
              onClick={() => {
                setExtensionStatus('checking');
                const attr = document.documentElement.getAttribute('data-vizez-extension');
                if (attr === 'installed') { setExtensionStatus('connected'); return; }
                const h = (e: MessageEvent) => {
                  if (e.data?.type === 'VIZEZ_PONG' || e.data?.type === 'VIZEZ_EXTENSION_READY') {
                    setExtensionStatus('connected');
                    window.removeEventListener('message', h);
                  }
                };
                window.addEventListener('message', h);
                window.postMessage({ type: 'VIZEZ_PING' }, '*');
                setTimeout(() => {
                  setExtensionStatus(prev => prev === 'checking' ? 'not_detected' : prev);
                  window.removeEventListener('message', h);
                }, 3000);
              }}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                color: 'rgba(255,255,255,0.50)', cursor: 'pointer',
              }}
            >
              ↻ Retry
            </button>
          )}
        </div>

        {/* Not detected — download + instructions */}
        {extensionStatus === 'not_detected' && (
          <div style={{ padding: '16px', animation: 'slide-up 0.2s ease-out' }}>
            {/* Download button */}
            <a
              href="/vizez-brain-extension.zip"
              download="vizez-brain-extension.zip"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '12px 24px', borderRadius: '8px',
                background: '#7c5cfc', color: '#fff',
                fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                cursor: 'pointer', border: 'none',
                fontFamily: "'Outfit', 'Inter', sans-serif",
              }}
            >
              ⬇ Download VizEz Brain Extension
            </a>

            {/* Install steps */}
            <div style={{
              marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.40)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
              }}>
                Installation Steps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { step: '1', text: 'Extract the downloaded .zip file' },
                  { step: '2', text: 'Open chrome://extensions in your browser' },
                  { step: '3', text: 'Enable "Developer mode" (top right toggle)' },
                  { step: '4', text: 'Click "Load unpacked" and select the extracted folder' },
                  { step: '5', text: 'Click Retry above to verify connection' },
                ].map(({ step, text }) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(124,92,252,0.12)', color: '#7c5cfc',
                      fontSize: '10px', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {step}
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Connected hint */}
        {extensionStatus === 'connected' && !scanning && !error && (
          <div style={{
            padding: '0 16px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.30)',
          }}>
            <CheckCircle size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            The extension will open the URL in a background tab, scan all fields, and close it automatically.
          </div>
        )}
      </div>
    </div>
  );
}
