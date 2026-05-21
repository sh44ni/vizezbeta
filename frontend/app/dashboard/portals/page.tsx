'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Globe, ArrowLeft, Plus, Trash2, RefreshCw, Loader, Play,
} from 'lucide-react';

interface Portal {
  id: string;
  name: string;
  url_pattern: string;
  status: string;
  portal_type: string;
  field_count: number;
  manual_count: number;
  created_at: string;
  updated_at: string;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PortalManagerPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'visa' | 'web_form'>('all');

  const loadPortals = async () => {
    setLoading(true);
    try {
      const resp = await apiFetch('/api/portals');
      const data = await resp.json();
      setPortals(data.portals || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadPortals(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete portal "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/portals/${id}`, { method: 'DELETE' });
      setPortals(prev => prev.filter(p => p.id !== id));
    } catch {}
    setDeleting(null);
  };

  return (
    <main style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 32px 64px' }}>

        {/* Header */}
        <div className="animate-card-appear" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{
              fontSize: '28px', fontWeight: 800,
              fontFamily: "'Outfit', 'Inter', sans-serif",
              margin: '0 0 6px', color: 'var(--text-primary)',
            }}>
              Portal Manager
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              {portals.length} trained portal{portals.length !== 1 ? 's' : ''} • Manage field mappings and auto-fill rules
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-ghost"
              onClick={loadPortals}
              style={{ padding: '10px', borderRadius: '10px' }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard/portals/new"
              className="btn-friendly"
              style={{ fontSize: '13px', padding: '10px 20px', textDecoration: 'none' }}
            >
              <Plus className="w-4 h-4" /> Train New Portal
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        {portals.length > 0 && !loading && (
          <div className="animate-card-appear" style={{ marginBottom: '20px' }}>
            <div className="filter-tabs">
              {[
                { key: 'all' as const, label: 'All', count: portals.length },
                { key: 'visa' as const, label: '🛂 Visa Portals', count: portals.filter(p => (p.portal_type || 'visa') === 'visa').length },
                { key: 'web_form' as const, label: '📋 Web Forms', count: portals.filter(p => p.portal_type === 'web_form').length },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`filter-tab ${typeFilter === tab.key ? 'filter-tab--active' : ''}`}
                  onClick={() => setTypeFilter(tab.key)}
                >
                  {tab.label}
                  <span style={{
                    marginLeft: '6px', fontSize: '11px', fontWeight: 700,
                    padding: '1px 7px', borderRadius: '99px',
                    background: typeFilter === tab.key ? 'var(--accent-subtle)' : 'var(--surface-3)',
                    color: typeFilter === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader className="w-8 h-8 animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
            <p style={{ fontSize: '14px' }}>Loading portals...</p>
          </div>
        ) : portals.length === 0 ? (
          <div className="animate-card-appear" style={{
            padding: '64px 32px', textAlign: 'center', borderRadius: 'var(--radius-xl)',
            background: 'var(--card-bg)', border: '1px dashed var(--border)',
          }}>
            <Globe className="w-14 h-14" style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
              No portals trained yet
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 24px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              Train VizEz on a portal form to enable auto-filling.
            </p>
            <Link
              href="/dashboard/portals/new"
              className="btn-friendly"
              style={{ fontSize: '14px', padding: '12px 28px', textDecoration: 'none', display: 'inline-flex' }}
            >
              <Plus className="w-4 h-4" /> Train Your First Portal
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {portals
              .filter(portal => {
                if (typeFilter === 'all') return true;
                return (portal.portal_type || 'visa') === typeFilter;
              })
              .map((portal, i) => (
              <div
                key={portal.id}
                className="animate-card-appear"
                style={{
                  animationDelay: `${i * 0.04}s`,
                  background: 'var(--card-bg)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'var(--accent-subtle)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Globe className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {portal.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace' }}>{portal.url_pattern}</span>
                    <span>Updated {timeAgo(portal.updated_at)}</span>
                  </div>
                </div>

                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px',
                  background: 'var(--accent-subtle)', color: 'var(--accent)',
                }}>
                  {portal.field_count} fields
                </span>

                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
                  background: (portal.portal_type || 'visa') === 'visa' ? 'rgba(124,92,252,0.1)' : 'rgba(56,189,248,0.1)',
                  color: (portal.portal_type || 'visa') === 'visa' ? 'var(--accent)' : '#38bdf8',
                }}>
                  {(portal.portal_type || 'visa') === 'visa' ? '🛂 Visa' : '📋 Web Form'}
                </span>

                {/* START → links to processing page */}
                <Link
                  href={`/dashboard/portals/${portal.id}/process`}
                  className="btn-friendly"
                  style={{
                    fontSize: '12px', fontWeight: 700, padding: '8px 18px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    borderRadius: '10px', textDecoration: 'none',
                  }}
                >
                  <Play className="w-3.5 h-3.5" /> Start
                </Link>

                <button
                  onClick={() => handleDelete(portal.id, portal.name)}
                  disabled={deleting === portal.id}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '6px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Delete portal"
                >
                  {deleting === portal.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '32px' }}>
          <Link
            href="/"
            style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
