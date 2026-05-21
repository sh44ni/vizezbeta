'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  RefreshCw, Trash2, CheckCircle,
  Edit3, ArrowRight, Hand, Search, Globe, Layers, Clock,
  Loader, ArrowLeft
} from 'lucide-react';

interface PortalField {
  id: number;
  portal_selector: string;
  portal_label: string;
  type: string;
  source_key: string | null;
  fill_method: string;
  default_value: string | null;
  required: boolean;
  confidence: number;
  review_status: string;
}

interface Portal {
  id: string;
  name: string;
  url_pattern: string;
  status: string;
  fields: PortalField[];
  created_at: string;
  updated_at: string;
}

type FilterKey = 'all' | 'required' | 'optional' | 'manual' | 'low_confidence';

function ConfidenceDot({ confidence }: { confidence: number }) {
  const cls = confidence >= 0.85 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    'approved': { bg: 'var(--success-bg)', fg: 'var(--success)' },
    'manual': { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
    'edited': { bg: 'var(--info-bg)', fg: 'var(--info)' },
    'pending': { bg: 'var(--surface-2)', fg: 'var(--text-muted)' },
  };
  const c = colors[status] || colors['pending'];
  const label = status === 'approved' ? 'Auto-mapped' : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '3px 10px',
      borderRadius: '99px', background: c.bg, color: c.fg,
    }}>
      {label}
    </span>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PortalDetailPage() {
  const params = useParams();
  const portalId = params?.id as string;
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!portalId) return;
    apiFetch(`/api/portals/${portalId}`)
      .then(r => r.json())
      .then(data => {
        if (data.portal) setPortal(data.portal);
        else setError('Portal not found');
      })
      .catch(() => setError('Failed to load portal'))
      .finally(() => setLoading(false));
  }, [portalId]);

  const fields = portal?.fields || [];

  const filtered = useMemo(() => {
    let list = fields;
    if (filter === 'required') list = list.filter(f => f.required);
    if (filter === 'optional') list = list.filter(f => !f.required);
    if (filter === 'manual') list = list.filter(f => f.fill_method === 'manual');
    if (filter === 'low_confidence') list = list.filter(f => f.confidence > 0 && f.confidence < 0.8);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => f.portal_label?.toLowerCase().includes(q) || f.portal_selector?.toLowerCase().includes(q));
    }
    return list;
  }, [fields, filter, search]);

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: fields.length },
    { key: 'required', label: 'Required', count: fields.filter(f => f.required).length },
    { key: 'optional', label: 'Optional', count: fields.filter(f => !f.required).length },
    { key: 'manual', label: 'Manual', count: fields.filter(f => f.fill_method === 'manual').length },
    { key: 'low_confidence', label: 'Low Confidence', count: fields.filter(f => f.confidence > 0 && f.confidence < 0.8).length },
  ];

  if (loading) {
    return (
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </main>
    );
  }

  if (error || !portal) {
    return (
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{error || 'Portal not found'}</p>
        <Link href="/dashboard/portals" style={{ color: 'var(--accent)', fontSize: '14px', textDecoration: 'none' }}>
          <ArrowLeft className="w-4 h-4" style={{ display: 'inline', verticalAlign: 'middle' }} /> Back to Portals
        </Link>
      </main>
    );
  }

  return (
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
                  <Layers className="w-3.5 h-3.5" /> {fields.length} fields
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <Clock className="w-3.5 h-3.5" /> Updated {timeAgo(portal.updated_at)}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link href="/dashboard/portals/new" className="btn-ghost" style={{ fontSize: '13px', padding: '9px 18px', textDecoration: 'none' }}>
                <RefreshCw className="w-3.5 h-3.5" /> Remap
              </Link>
            </div>
          </div>
        </div>

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
                  <th>Source Key</th>
                  <th>Fill Method</th>
                  <th>Confidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr key={f.id || i} className="animate-card-appear" style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {f.portal_label} {f.required && <span style={{ color: 'var(--error)' }}>*</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {f.portal_selector}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', fontFamily: 'monospace', color: f.source_key ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {f.source_key || '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px',
                        background: 'var(--surface-2)', color: 'var(--text-secondary)',
                      }}>
                        {f.fill_method}
                      </span>
                    </td>
                    <td><ConfidenceDot confidence={f.confidence} /></td>
                    <td><StatusBadge status={f.review_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No fields match this filter
            </div>
          )}
        </div>

        {/* Back link */}
        <div style={{ marginTop: '24px' }}>
          <Link href="/dashboard/portals" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft className="w-4 h-4" /> All Portals
          </Link>
        </div>
      </div>
    </main>
  );
}
