'use client';

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ── */
interface ProcessingResult {
  request_id: string;
  document_type: string;
  classification_confidence: number;
  crop_applied: boolean;
  crop_method: string;
  crop_confidence: number;
  original_quality_score: number;
  enhanced_quality_score: number;
  quality_improvement: number;
  processing_time_ms: number;
  original_image?: string;
  enhanced_image?: string;
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif,.bmp';
const FORMATS = ['PDF', 'JPG', 'PNG', 'WEBP', 'TIFF', 'BMP'];

function formatDocType(t: string): string {
  return t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown';
}

/* ── Component ── */
export default function TestPage() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function processFile(file: File) {
    setError('');
    setResult(null);
    setProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/processor/enhance', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Processing failed' }));
        setError(data.error || `Processing failed (${res.status})`);
        setProcessing(false);
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError('Network error — could not reach the processing engine');
    } finally {
      setProcessing(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError('');
  }

  return (
    <>
      <div className="lens-page-header">
        <h1>Test Document</h1>
        <p>Upload a document to test the processing engine</p>
      </div>

      <div className="lens-test-area">
        <AnimatePresence mode="wait">
          {/* ── Upload / Dropzone ── */}
          {!processing && !result && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div
                id="test-dropzone"
                className={`lens-test-dropzone${dragging ? ' dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="4" width="40" height="48" rx="4" />
                  <path d="M28 18v16" />
                  <path d="M22 24l6-6 6 6" />
                  <path d="M18 40h20" />
                </svg>
                <p className="lens-test-dropzone-text">
                  Drag &amp; drop a document here
                </p>
                <p className="lens-test-dropzone-hint">or click to browse</p>
                <div className="lens-test-dropzone-formats">
                  {FORMATS.map((f) => (
                    <span key={f} className="lens-test-dropzone-format">{f}</span>
                  ))}
                </div>
              </div>
              <input
                id="test-file-input"
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {error && (
                <motion.div
                  className="lens-login-error"
                  style={{ marginTop: 16 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Processing ── */}
          {processing && (
            <motion.div
              key="processing"
              className="lens-test-processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="lens-spinner lg" />
              <p className="lens-test-processing-text">Processing document…</p>
            </motion.div>
          )}

          {/* ── Result ── */}
          {result && (
            <motion.div
              key="result"
              className="lens-test-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Images */}
              {(result.original_image || result.enhanced_image) && (
                <div className="lens-test-images">
                  {result.original_image && (
                    <div className="lens-test-image-card">
                      <div className="lens-test-image-card-header">Original</div>
                      <img
                        src={`data:image/png;base64,${result.original_image}`}
                        alt="Original document"
                      />
                    </div>
                  )}
                  {result.enhanced_image && (
                    <div className="lens-test-image-card">
                      <div className="lens-test-image-card-header">Enhanced</div>
                      <img
                        src={`data:image/png;base64,${result.enhanced_image}`}
                        alt="Enhanced document"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Metrics */}
              <div className="lens-test-metrics">
                <div className="lens-test-metric">
                  <div className="lens-test-metric-label">Document Type</div>
                  <div className="lens-test-metric-value">
                    {formatDocType(result.document_type)}
                  </div>
                  <div className="lens-test-metric-sub">
                    {(result.classification_confidence * 100).toFixed(1)}% confidence
                  </div>
                </div>

                <div className="lens-test-metric">
                  <div className="lens-test-metric-label">Crop Applied</div>
                  <div className="lens-test-metric-value">
                    {result.crop_applied ? 'Yes' : 'No'}
                  </div>
                  <div className="lens-test-metric-sub">
                    {result.crop_method || '—'}{' '}
                    {result.crop_confidence
                      ? `(${(result.crop_confidence * 100).toFixed(1)}%)`
                      : ''}
                  </div>
                </div>

                <div className="lens-test-metric">
                  <div className="lens-test-metric-label">Quality Score</div>
                  <div className="lens-test-metric-value">
                    {(result.original_quality_score * 100).toFixed(0)}% →{' '}
                    {(result.enhanced_quality_score * 100).toFixed(0)}%
                  </div>
                  <div className="lens-test-metric-sub">
                    +{(result.quality_improvement * 100).toFixed(1)}% improvement
                  </div>
                  <div className="lens-test-quality-bar">
                    <div
                      className="lens-test-quality-fill"
                      style={{
                        width: `${Math.min(result.enhanced_quality_score * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="lens-test-metric">
                  <div className="lens-test-metric-label">Processing Time</div>
                  <div className="lens-test-metric-value">{result.processing_time_ms}ms</div>
                </div>

                <div className="lens-test-metric">
                  <div className="lens-test-metric-label">Request ID</div>
                  <div
                    className="lens-test-metric-value"
                    style={{
                      fontFamily: 'var(--lens-font-mono)',
                      fontSize: '13px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {result.request_id}
                  </div>
                </div>
              </div>

              <button
                id="test-another-btn"
                className="lens-test-another-btn"
                onClick={handleReset}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <path d="M4 10a6 6 0 1 1 1.8 4.3" />
                  <path d="M4 14V10h4" />
                </svg>
                Process Another
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
