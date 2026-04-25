'use client';

import React, { useState, useRef } from 'react';
import { PassportItem } from '@/app/types';
import { UploadCloud, X, ArrowRight, Info, ChevronDown, ChevronUp, Plus, FileImage } from 'lucide-react';

interface Props {
  passports: PassportItem[];
  setPassports: React.Dispatch<React.SetStateAction<PassportItem[]>>;
  onNext: () => void;
}

export default function UploadScreen({ passports, setPassports, onNext }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(
      (f) => f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/webp',
    );
    const newItems: PassportItem[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }));
    setPassports((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setPassports((prev) => prev.filter((p) => p.id !== id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const totalBatches = Math.ceil(passports.length / 10);
  const hasFiles = passports.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2
            className="gradient-text"
            style={{
              fontSize: '26px',
              fontWeight: 800,
              margin: '0 0 6px 0',
              letterSpacing: '-0.5px',
            }}
          >
            Upload Passport Photos
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Drop any number of images — AI will extract the data.
          </p>
        </div>

        {/* Live count badge */}
        {hasFiles && (
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '3px',
              flexShrink: 0,
            }}
          >
            <div
              className="tag-pill"
              style={{
                padding: '6px 16px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--border-bright)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--accent-hover)',
              }}
            >
              {passports.length} photo{passports.length !== 1 ? 's' : ''}
            </div>
            {totalBatches > 1 && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                → {totalBatches} PDFs
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Upload Zone — 3 states ── */}
      {!hasFiles ? (
        /* STATE 1: Empty — animated landing pad */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={isDragOver ? 'zone-inhale' : ''}
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-xl)',
            border: `2px solid ${isDragOver ? 'var(--accent)' : 'transparent'}`,
            background: isDragOver
              ? 'var(--accent-subtle)'
              : 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            padding: '56px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: isDragOver ? 'var(--accent-glow)' : 'var(--shadow-sm)',
            outline: isDragOver ? 'none' : '2px dashed var(--border-bright)',
            outlineOffset: '-2px',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          />

          {/* Icon */}
          <div
            className={isDragOver ? '' : 'icon-bob'}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: isDragOver ? 'var(--gradient-accent)' : 'var(--surface-2)',
              border: `1px solid ${isDragOver ? 'transparent' : 'var(--border-bright)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '22px',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: isDragOver ? 'var(--accent-glow)' : '0 0 25px rgba(124, 92, 252, 0.08)',
            }}
          >
            <UploadCloud
              style={{
                width: '30px',
                height: '30px',
                color: isDragOver ? '#fff' : 'var(--accent)',
                transition: 'all 0.2s ease',
              }}
            />
          </div>

          <h3
            style={{
              fontSize: '17px',
              fontWeight: 700,
              fontFamily: "'Outfit', 'Inter', sans-serif",
              color: isDragOver ? 'var(--accent-hover)' : 'var(--text-primary)',
              margin: '0 0 8px 0',
              transition: 'color 0.2s ease',
            }}
          >
            {isDragOver ? 'Release to add photos' : 'Drop passport photos here'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 22px 0' }}>
            or click to browse — JPG, PNG, WEBP supported
          </p>

          {/* Format pips */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['JPG', 'PNG', 'WEBP'].map((fmt) => (
              <span
                key={fmt}
                className="tag-pill"
                style={{
                  color: 'var(--text-muted)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                }}
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* STATE 2/3: Files loaded — compact add-more banner + grid */
        <>
          {/* Add-more pill banner */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              border: `1.5px dashed ${isDragOver ? 'var(--accent)' : 'var(--border-bright)'}`,
              background: isDragOver ? 'var(--accent-subtle)' : 'var(--glass-bg)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
            }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--border-bright)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Plus style={{ width: '14px', height: '14px', color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Add more photos
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Drag & drop or click to browse
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
              {passports.length} staged
            </div>
          </div>

          {/* File grid with batch separators */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '10px',
                alignContent: 'start',
              }}
            >
              {passports.map((p, i) => {
                const batchNum = Math.floor(i / 10) + 1;
                const isBatchStart = i % 10 === 0;
                return (
                  <React.Fragment key={p.id}>
                    {/* Batch divider label */}
                    {isBatchStart && totalBatches > 1 && (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '4px 0',
                          marginTop: i > 0 ? '4px' : '0',
                        }}
                      >
                        <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
                        <span className="tag-pill" style={{
                          color: 'var(--accent)',
                          background: 'var(--accent-subtle)',
                          border: '1px solid var(--border-bright)',
                        }}>
                          Batch {batchNum} — PDF #{batchNum}
                        </span>
                        <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
                      </div>
                    )}

                    {/* Card */}
                    <div
                      className="glass-card animate-card-appear"
                      style={{
                        position: 'relative',
                        animationDelay: `${Math.min((i % 10) * 40, 400)}ms`,
                        animationFillMode: 'both',
                      }}
                    >
                      {/* Number badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: 'rgba(0,0,0,0.55)',
                          backdropFilter: 'blur(6px)',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.9)',
                          zIndex: 2,
                        }}
                      >
                        #{i + 1}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(p.id); }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '7px',
                          background: 'rgba(0,0,0,0.55)',
                          backdropFilter: 'blur(6px)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.7)',
                          zIndex: 2,
                          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--error)';
                          (e.currentTarget as HTMLElement).style.color = '#fff';
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.55)';
                          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                        }}
                      >
                        <X style={{ width: '11px', height: '11px' }} />
                      </button>

                      {/* Thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt="Passport"
                        style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }}
                      />

                      {/* File name */}
                      <div
                        style={{
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <FileImage
                          style={{ width: '11px', height: '11px', color: 'var(--text-muted)', flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.file.name}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Info accordion ── */}
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(96,165,250,0.15)',
          background: 'var(--info-bg)',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={() => setShowInstructions((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--info)',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          <Info style={{ width: '13px', height: '13px', flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>How this works</span>
          {showInstructions
            ? <ChevronUp style={{ width: '13px', height: '13px' }} />
            : <ChevronDown style={{ width: '13px', height: '13px' }} />}
        </button>
        {showInstructions && (
          <div
            className="animate-fade-in"
            style={{
              padding: '0 14px 12px 36px',
              fontSize: '12px',
              color: 'var(--info)',
              lineHeight: 1.8,
            }}
          >
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>Upload any number of passport photos (JPG, PNG, WEBP)</li>
              <li>The AI will extract: Name, Passport No., Nationality, Date of Birth, Expiry</li>
              <li>Every <strong>10 passports</strong> generates one PDF</li>
              <li>You can review and edit all extracted data before generating</li>
              <li>Blurry or low-quality images may reduce extraction accuracy</li>
            </ul>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {passports.length === 0
            ? 'No files selected yet'
            : `${passports.length} passport${passports.length !== 1 ? 's' : ''} ready${totalBatches > 1 ? ` → ${totalBatches} PDFs` : ''}`}
        </div>
        <button
          onClick={onNext}
          disabled={passports.length === 0}
          className="btn-primary"
          style={{
            ...(passports.length === 0 ? { background: 'var(--surface-2)', color: 'var(--text-muted)', boxShadow: 'none', cursor: 'not-allowed' } : {}),
          }}
        >
          Start Extraction <ArrowRight style={{ width: '15px', height: '15px' }} />
        </button>
      </div>
    </div>
  );
}
