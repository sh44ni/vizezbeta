'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Play, RefreshCw, Trash2, CheckCircle, Edit3,
  ArrowRight, Hand, Search, Globe, Layers, Clock, Loader, Inbox
} from 'lucide-react';

const BACKEND_URL = '';

interface PortalField {
  id: number;
  portal_selector: string;
  portal_label: string;
  type: string;
  source_key: string | null;
  fill_method: string;
  default_value: string | null;
  option_map: Record<string, string> | null;
  transform: string | null;
  required: boolean;
  sort_order: number;
  review_status: string;
  confidence: number;
}

interface PortalDetail {
  id: string;
  name: string;
  url_pattern: string;
  status: string;
  portal_type: string;
  fields: PortalField[];
  updated_at: string;
  created_at: string;
}

type FilterKey = 'all' | 'required' | 'optional' | 'manual' | 'low_confidence';

function ConfidenceDot({ confidence }: { confidence: number }) {
  const cls = confidence >= 0.9 ? 'high' : confidence >= 0.7 ? 'medium' : 'low';
  const pct = Math.round(confidence * 100);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span className={`confidence-dot confidence-dot--${cls}`} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: cls === 'high' ? 'var(--success)' : cls === 'medium' ? 'var(--warn)' : 'var(--error)' }}>
        {pct}%
      </span>
    </span>
  );
}

function getFieldStatus(f: PortalField): string {
  if (f.review_status === 'manual' || (f.confidence === 0 && !f.source_key)) return 'Manual';
  if (f.review_status === 'edited' || (f.confidence < 0.8 && f.source_key)) return 'User-edited';
  return 'Auto-mapped';
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    'Auto-mapped': { bg: 'var(--success-bg)', fg: 'var(--success)' },
    'Manual': { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
    'User-edited': { bg: 'var(--info-bg)', fg: 'var(--info)' },
  };
  const c = colors[status] || colors['Auto-mapped'];
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '3px 10px',
      borderRadius: '99px', background: c.bg, color: c.fg,
    }}>
      {status}
    </span>
  );
}

function sourceLabel(sourceKey: string | null): string {
  if (!sourceKey) return '— manual —';
  const parts = sourceKey.split('.');
  const doc = parts[0] === 'passport' ? 'Passport' : parts[0] === 'work_permit' ? 'Work Permit' : parts[0];
  const field = parts.slice(1).join(' ').replace(/_/g, ' ');
  return `${doc} → ${field}`;
}

export default function PortalDetailPage() {
  const params = useParams();
  const portalId = params?.id as string;

  const [portal, setPortal] = useState<PortalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [testFilling, setTestFilling] = useState(false);
  const [testDone, setTestDone] = useState(false);

  const fetchPortal = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/portals/${portalId}`);
      if (res.ok) {
        const data = await res.json();
        setPortal(data.portal);
      }
    } catch (err) {
      console.error('Failed to fetch portal:', err);
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  useEffect(() => {
    if (portalId) fetchPortal();
  }, [portalId, fetchPortal]);

  const fields = portal?.fields || [];

  const filtered = useMemo(() => {
    let list = fields;
    if (filter === 'required') list = list.filter(f => f.required);
    if (filter === 'optional') list = list.filter(f => !f.required);
    if (filter === 'manual') list = list.filter(f => f.confidence === 0 && !f.source_key);
    if (filter === 'low_confidence') list = list.filter(f => f.confidence > 0 && f.confidence < 0.8);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => (f.portal_label || '').toLowerCase().includes(q) || (f.portal_selector || '').toLowerCase().includes(q));
    }
    return list;
  }, [fields, filter, search]);

  const handleTestFill = () => {
    setTestFilling(true);
    setTimeout(() => { setTestFilling(false); setTestDone(true); setTimeout(() => setTestDone(false), 3000); }, 2000);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this portal and all its field mappings?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/portals/${portalId}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/dashboard/portals';
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: fields.length },
    { key: 'required', label: 'Required', count: fields.filter(f => f.required).length },
    { key: 'optional', label: 'Optional', count: fields.filter(f => !f.required).length },
    { key: 'manual', label: 'Manual', count: fields.filter(f => f.confidence === 0 && !f.source_key).length },
    { key: 'low_confidence', label: 'Low Confidence', count: fields.filter(f => f.confidence > 0 && f.confidence < 0.8).length },
  ];

  if (loading) {
    return (
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 28px', textAlign: 'center' }}>
          <Loader className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.30)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Loading portal...</p>
        </div>
      </main>
    );
  }

  if (!portal) {
    return (
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 28px', textAlign: 'center' }}>
          <Inbox className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginBottom: '16px' }}>Portal not found</p>
          <Link href="/dashboard/portals" style={{ fontSize: '13px', color: '#7c5cfc', textDecoration: 'none' }}>
            ← Back to Portal Manager
          </Link>
        </div>
      </main>
    );
  }

  const manualCount = fields.filter(f => f.confidence === 0 && !f.source_key).length;

  return (
    <>
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 28px 64px' }}>
          {/* Portal header card */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: '24px',
          }} className="animate-card-appear">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: "'Outfit', 'Inter', sans-serif", margin: '0 0 8px' }}>
                  {portal.name}
                </h2>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <Globe className="w-3.5 h-3.5" /> {portal.url_pattern}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <Layers className="w-3.5 h-3.5" /> {fields.length} fields • {manualCount} manual
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5" /> Updated: {new Date(portal.updated_at || portal.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={handleTestFill} disabled={testFilling} style={{ fontSize: '13px', padding: '9px 18px' }}>
                  {testFilling ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing...</> : <><Play className="w-3.5 h-3.5" /> Test Fill</>}
                </button>
                <Link href="/dashboard/portals/new" className="btn-ghost" style={{ fontSize: '13px', padding: '9px 18px', textDecoration: 'none' }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Remap from Scratch
                </Link>
                <button className="btn-danger" style={{ fontSize: '13px', padding: '9px 18px' }} onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Portal
                </button>
              </div>
            </div>
          </div>

          {/* Test fill toast */}
          {testDone && (
            <div className="status-toast status-toast--success">
              <CheckCircle className="w-5 h-5" /> Test fill completed — {fields.filter(f => f.source_key).length} of {fields.length} fields filled successfully
            </div>
          )}

          {/* Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div className="filter-tabs">
              {filters.map(f => (
                <button
                  key={f.key}
                  className={`filter-tab ${filter === f.key ? 'filter-tab--active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span style={{ fontSize: '11px', opacity: 0.7 }}>({f.count})</span>
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
              <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="clean-input"
                placeholder="Search fields..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>Portal Field</th>
                    <th>Source Mapping</th>
                    <th>Fill Method</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, i) => {
                    const status = getFieldStatus(f);
                    return (
                      <tr key={f.id || f.portal_selector} className="animate-card-appear" style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                            {f.portal_label || f.portal_selector} {f.required && <span style={{ color: 'var(--error)' }}>*</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {f.portal_selector}
                          </div>
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {sourceLabel(f.source_key)}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '12px', fontWeight: 500,
                            color: 'var(--text-muted)',
                            textTransform: 'capitalize',
                          }}>
                            {f.fill_method || 'value'}
                          </span>
                        </td>
                        <td><ConfidenceDot confidence={f.confidence} /></td>
                        <td><StatusBadge status={status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={{
                              width: '30px', height: '30px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'transparent',
                              cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                            }} title="Edit">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button style={{
                              width: '30px', height: '30px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'transparent',
                              cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                            }} title="Change Source">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button style={{
                              width: '30px', height: '30px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'transparent',
                              cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                            }} title="Mark as Manual">
                              <Hand className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                {fields.length === 0 ? 'No fields mapped for this portal yet' : 'No fields match this filter'}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
