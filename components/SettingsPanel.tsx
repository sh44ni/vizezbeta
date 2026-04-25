'use client';

import React, { useRef } from 'react';
import { X, ImagePlus, RotateCcw, CheckCircle2, Info } from 'lucide-react';

const DEFAULT_LETTERHEAD = '/letterheadbg.png';
const DEFAULT_STAMP = '/signandstamptransparent.png';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  letterheadSrc: string;
  stampSrc: string;
  onLetterheadChange: (src: string) => void;
  onStampChange: (src: string) => void;
}

function AssetCard({
  label,
  description,
  src,
  defaultSrc,
  onUpload,
  onReset,
  inputRef,
}: {
  label: string;
  description: string;
  src: string;
  defaultSrc: string;
  onUpload: () => void;
  onReset: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const isCustom = src !== defaultSrc;
  return (
    <div
      className="glass-card"
      style={{
        padding: '20px',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '3px',
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{description}</div>
      </div>

      {/* Preview */}
      <div
        style={{
          width: '100%',
          height: '120px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          overflow: 'hidden',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.3s ease' }}
          crossOrigin={src.startsWith('data:') ? undefined : 'anonymous'}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        />
      </div>

      {/* Status badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '12px',
          fontSize: '11px',
          color: isCustom ? 'var(--success)' : 'var(--text-muted)',
        }}
      >
        <CheckCircle2 className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
        {isCustom ? 'Custom image loaded' : 'Using default asset'}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onUpload}
          className="btn-ghost"
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: '9px 14px',
            fontSize: '12px',
            color: 'var(--accent)',
            borderColor: 'var(--border-bright)',
          }}
        >
          <ImagePlus className="w-3.5 h-3.5" />
          {isCustom ? 'Replace' : 'Upload'}
        </button>
        {isCustom && (
          <button
            onClick={onReset}
            title="Restore default"
            className="btn-ghost"
            style={{
              padding: '9px 12px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--error)';
              (e.currentTarget as HTMLElement).style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hidden input */}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} />
    </div>
  );
}

export default function SettingsPanel({
  isOpen,
  onClose,
  letterheadSrc,
  stampSrc,
  onLetterheadChange,
  onStampChange,
}: Props) {
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleLetterheadUpload = () => {
    if (!letterheadInputRef.current) return;
    const input = letterheadInputRef.current;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          onLetterheadChange(result);
          try { localStorage.setItem('vizez_letterhead', result); } catch {}
        }
      };
      reader.readAsDataURL(file);
      input.value = '';
    };
    input.click();
  };

  const handleStampUpload = () => {
    if (!stampInputRef.current) return;
    const input = stampInputRef.current;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          onStampChange(result);
          try { localStorage.setItem('vizez_stamp', result); } catch {}
        }
      };
      reader.readAsDataURL(file);
      input.value = '';
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 40,
        }}
        className="animate-fade-in"
      />

      {/* Panel */}
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          background: 'var(--sidebar)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          borderLeft: '1px solid var(--glass-border)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.4), var(--shadow-glow)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
              Settings
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Configure global assets for your letters
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '99px',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Info banner */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--info-bg)',
              border: '1px solid rgba(96,165,250,0.15)',
              marginBottom: '20px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} />
            <p style={{ fontSize: '12px', color: 'var(--info)', lineHeight: 1.6, margin: 0 }}>
              Assets configured here apply to <strong>all modules</strong>. Changes take effect immediately
              and are saved in your browser — no re-upload needed on next visit.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AssetCard
              label="Letterhead Background"
              description="Full-page A4 background image for generated letters"
              src={letterheadSrc}
              defaultSrc={DEFAULT_LETTERHEAD}
              onUpload={handleLetterheadUpload}
              onReset={() => {
                onLetterheadChange(DEFAULT_LETTERHEAD);
                try { localStorage.removeItem('vizez_letterhead'); } catch {}
              }}
              inputRef={letterheadInputRef}
            />
            <AssetCard
              label="Stamp & Signature"
              description="Transparent PNG overlaid at the bottom of each letter"
              src={stampSrc}
              defaultSrc={DEFAULT_STAMP}
              onUpload={handleStampUpload}
              onReset={() => {
                onStampChange(DEFAULT_STAMP);
                try { localStorage.removeItem('vizez_stamp'); } catch {}
              }}
              inputRef={stampInputRef}
            />
          </div>

          {/* Section: Future settings placeholder */}
          <div
            style={{
              marginTop: '24px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border)',
              textAlign: 'center',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              More settings coming soon — API config, templates, user management
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
