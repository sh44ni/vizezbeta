'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ── */
interface ApiKey {
  id: number;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

interface HealthData {
  status: string;
  version?: string;
  service?: string;
}

/* ── Component ── */
export default function SettingsPage() {
  /* State */
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genName, setGenName] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthCheckedAt, setHealthCheckedAt] = useState<Date | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processorKey, setProcessorKey] = useState('');
  const [showProcessorKey, setShowProcessorKey] = useState(false);

  /* Fetch Keys */
  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/key');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch { /* ignore */ }
    finally { setKeysLoading(false); }
  }, []);

  /* Fetch Health */
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/processor/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ status: 'offline' });
      }
    } catch {
      setHealth({ status: 'offline' });
    } finally {
      setHealthLoading(false);
      setHealthCheckedAt(new Date());
    }
  }, []);

  /* Fetch Processor Key */
  const fetchProcessorKey = useCallback(async () => {
    try {
      const res = await fetch('/api/processor/key');
      if (res.ok) {
        const data = await res.json();
        setProcessorKey(data.key || '');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchHealth();
    fetchProcessorKey();
  }, [fetchKeys, fetchHealth, fetchProcessorKey]);

  /* Generate Key */
  async function handleGenerate() {
    if (!genName.trim()) return;
    setGenLoading(true);
    try {
      const res = await fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: genName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key || '');
        setShowGenerate(false);
        setGenName('');
        fetchKeys();
      }
    } catch { /* ignore */ }
    finally { setGenLoading(false); }
  }

  /* Delete Key */
  async function handleDelete(id: number) {
    try {
      await fetch(`/api/key?id=${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch { /* ignore */ }
  }

  /* Copy to clipboard */
  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  const isOnline = health?.status === 'online' || health?.status === 'ok';
  const endpointUrl = 'https://lens.vizez.cloud/api/processor/enhance';
  const maskedKey = processorKey
    ? processorKey.slice(0, 8) + '\u2022'.repeat(16) + processorKey.slice(-8)
    : '\u2022'.repeat(32);
  const curlExample = `curl -X POST ${endpointUrl} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@document.pdf"`;

  return (
    <>
      <div className="lens-page-header">
        <h1>Settings</h1>
        <p>API keys, system health, and configuration</p>
      </div>

      <div className="lens-settings-grid">
        {/* ─── Section 1: API Keys ─── */}
        <motion.div
          className="lens-settings-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="lens-settings-section-header">
            <h2 className="lens-settings-section-title">API Keys</h2>
            <button
              id="generate-key-btn"
              className="lens-generate-btn"
              onClick={() => { setShowGenerate(true); setNewKey(''); }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 2v12M2 8h12" />
              </svg>
              Generate New Key
            </button>
          </div>
          <div className="lens-settings-section-body">
            <p className="lens-settings-description">
              Use API keys to integrate VizEz Lens with external systems. Send requests to{' '}
              <strong>POST /api/processor/enhance</strong> with an{' '}
              <code>Authorization: Bearer YOUR_KEY</code> header.
            </p>

            {/* Generate form */}
            <AnimatePresence>
              {showGenerate && (
                <motion.div
                  className="lens-generate-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="lens-filter-group" style={{ flex: 1 }}>
                    <label htmlFor="gen-key-name">Key Name</label>
                    <input
                      id="gen-key-name"
                      className="lens-filter-input"
                      type="text"
                      placeholder="e.g. Production Backend"
                      value={genName}
                      onChange={(e) => setGenName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                  </div>
                  <button
                    id="gen-key-submit"
                    className="lens-filter-btn primary"
                    onClick={handleGenerate}
                    disabled={genLoading || !genName.trim()}
                  >
                    {genLoading ? 'Generating\u2026' : 'Generate'}
                  </button>
                  <button
                    id="gen-key-cancel"
                    className="lens-filter-btn secondary"
                    onClick={() => setShowGenerate(false)}
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Newly generated key */}
            <AnimatePresence>
              {newKey && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="lens-api-key-card">
                    <span className="lens-api-key-value">{newKey}</span>
                    <button
                      id="copy-new-key"
                      className={`lens-copy-btn${copiedId === 'new-key' ? ' copied' : ''}`}
                      onClick={() => copyToClipboard(newKey, 'new-key')}
                    >
                      {copiedId === 'new-key' ? (
                        <>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8l3 3 5-6" /></svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5" /></svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="lens-new-key-warning">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.5 4h1v4h-1V5zm0 5h1v1h-1v-1z" /></svg>
                    This key will not be shown again. Store it securely now.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Key List */}
            {keysLoading ? (
              <div className="lens-key-list">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="lens-skeleton" style={{ height: 56, marginBottom: 8 }} />
                ))}
              </div>
            ) : keys.length === 0 ? (
              <div className="lens-empty-state" style={{ padding: '40px 0' }}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="10" y="18" width="28" height="18" rx="3" />
                  <circle cx="20" cy="27" r="3" />
                  <path d="M23 27h10" />
                  <path d="M20 18v-4a4 4 0 118 0v4" />
                </svg>
                <p className="lens-empty-state-title">No API keys</p>
                <p className="lens-empty-state-text">Generate a key to get started</p>
              </div>
            ) : (
              <div className="lens-key-list" style={{ marginTop: 16 }}>
                {keys.map((key) => (
                  <div className="lens-key-item" key={key.id}>
                    <span className="lens-key-prefix">{key.key_prefix}\u2026</span>
                    <span className="lens-key-name">{key.name}</span>
                    <span className="lens-key-meta">
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {key.last_used_at && (
                      <span className="lens-key-meta">
                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className={`lens-badge ${key.is_active ? 'success' : 'error'}`}>
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="lens-key-actions">
                      <button
                        id={`delete-key-${key.id}`}
                        className="lens-key-delete-btn"
                        onClick={() => handleDelete(key.id)}
                        title="Delete key"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                          <path d="M2 4h12M5 4V2.5A1.5 1.5 0 016.5 1h3A1.5 1.5 0 0111 2.5V4M13 4v9.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13.5V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── Section 2: Processor Connection Key ─── */}
        <motion.div
          className="lens-settings-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          <div className="lens-settings-section-header">
            <h2 className="lens-settings-section-title">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, verticalAlign: 'middle', marginRight: 8 }}>
                <path d="M10 1L2 5v4c0 5.25 3.4 10.2 8 11.1C14.6 19.2 18 14.25 18 9V5l-8-4z" />
                <path d="M7 10l2 2 4-4" />
              </svg>
              Processor Connection Key
            </h2>
          </div>
          <div className="lens-settings-section-body">
            <p className="lens-settings-description">
              This secret authenticates all requests between VizEz Lens and the Document Processor engine.
              Direct POST requests to the processor without this key will be <strong>rejected with 401</strong>.
              The key is sent as an <code>X-Processor-Key</code> header internally.
            </p>

            <div className="lens-api-key-card" style={{ marginTop: 16 }}>
              <span className="lens-api-key-value">
                {showProcessorKey ? processorKey : maskedKey}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="toggle-processor-key"
                  className="lens-copy-btn"
                  onClick={() => setShowProcessorKey((v) => !v)}
                  title={showProcessorKey ? 'Hide' : 'Reveal'}
                >
                  {showProcessorKey ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" />
                      <circle cx="10" cy="10" r="3" />
                      <path d="M3 17L17 3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" />
                      <circle cx="10" cy="10" r="3" />
                    </svg>
                  )}
                </button>
                <button
                  id="copy-processor-key"
                  className={`lens-copy-btn${copiedId === 'processor-key' ? ' copied' : ''}`}
                  onClick={() => copyToClipboard(processorKey, 'processor-key')}
                >
                  {copiedId === 'processor-key' ? (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8l3 3 5-6" /></svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5" /></svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lens-new-key-warning" style={{ marginTop: 12 }}>
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.5 4h1v4h-1V5zm0 5h1v1h-1v-1z" /></svg>
              This key is shared between Lens and the Processor. Changing it requires updating both services.
            </div>
          </div>
        </motion.div>

        {/* ─── Section 3: API Endpoint ─── */}
        <motion.div
          className="lens-settings-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="lens-settings-section-header">
            <h2 className="lens-settings-section-title">API Endpoint</h2>
          </div>
          <div className="lens-settings-section-body">
            <div className="lens-endpoint-display">
              <span className="lens-endpoint-method">POST</span>
              <span className="lens-endpoint-url">{endpointUrl}</span>
              <button
                id="copy-endpoint"
                className={`lens-copy-btn${copiedId === 'endpoint' ? ' copied' : ''}`}
                onClick={() => copyToClipboard(endpointUrl, 'endpoint')}
              >
                {copiedId === 'endpoint' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="lens-code-block">
              <div className="lens-code-block-header">
                <span>cURL Example</span>
                <button
                  id="copy-curl"
                  className={`lens-copy-btn${copiedId === 'curl' ? ' copied' : ''}`}
                  onClick={() => copyToClipboard(curlExample, 'curl')}
                >
                  {copiedId === 'curl' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre>{curlExample}</pre>
            </div>
          </div>
        </motion.div>

        {/* ─── Section 4: Processor Health ─── */}
        <motion.div
          className="lens-settings-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
        >
          <div className="lens-settings-section-header">
            <h2 className="lens-settings-section-title">Processor Health</h2>
            <button
              id="health-check-btn"
              className="lens-filter-btn secondary"
              onClick={fetchHealth}
              disabled={healthLoading}
            >
              {healthLoading ? 'Checking\u2026' : 'Check Now'}
            </button>
          </div>
          <div className="lens-settings-section-body">
            {healthLoading && !health ? (
              <div className="lens-skeleton" style={{ height: 60 }} />
            ) : (
              <>
                <div className="lens-health-status">
                  <span className={`lens-health-dot ${isOnline ? 'online' : 'offline'}`} />
                  <span className="lens-health-text">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <span className="lens-health-detail" style={{ marginLeft: 'auto' }}>
                    {healthCheckedAt
                      ? `Last checked: ${healthCheckedAt.toLocaleTimeString()}`
                      : ''}
                  </span>
                </div>

                <div className="lens-health-grid">
                  <div className="lens-health-metric">
                    <div className="lens-health-metric-label">Service</div>
                    <div className="lens-health-metric-value">
                      {health?.service || 'VizEz Processor'}
                    </div>
                  </div>
                  <div className="lens-health-metric">
                    <div className="lens-health-metric-label">Version</div>
                    <div className="lens-health-metric-value">
                      {health?.version || '\u2014'}
                    </div>
                  </div>
                  <div className="lens-health-metric">
                    <div className="lens-health-metric-label">Auth</div>
                    <div className="lens-health-metric-value">
                      <span className={`lens-badge ${processorKey ? 'success' : 'warning'}`}>
                        {processorKey ? 'Secured' : 'No Key'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ─── Section 5: System Info ─── */}
        <motion.div
          className="lens-settings-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="lens-settings-section-header">
            <h2 className="lens-settings-section-title">System Info</h2>
          </div>
          <div className="lens-settings-section-body">
            <div className="lens-system-info-grid">
              <div className="lens-system-info-item">
                <div className="lens-system-info-label">App Version</div>
                <div className="lens-system-info-value">1.0.0</div>
              </div>
              <div className="lens-system-info-item">
                <div className="lens-system-info-label">Environment</div>
                <div className="lens-system-info-value">
                  {typeof window !== 'undefined' && window.location.hostname === 'localhost'
                    ? 'Development'
                    : 'Production'}
                </div>
              </div>
              <div className="lens-system-info-item">
                <div className="lens-system-info-label">Database</div>
                <div className="lens-system-info-value">
                  <span className={`lens-badge ${isOnline ? 'success' : 'warning'}`}>
                    {isOnline ? 'Connected' : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
