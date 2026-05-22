'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Globe, Clock, Layers, MoreVertical, Edit3, RefreshCw, Trash2, Copy, CheckCircle, AlertTriangle, Loader, Inbox, Play } from 'lucide-react';
import type { PortalStatus } from './portal-types';

const BACKEND_URL = '';

interface PortalData {
  id: string;
  name: string;
  url_pattern: string;
  status: PortalStatus;
  field_count: number | string;
  manual_count: number | string;
  updated_at: string;
  created_at: string;
}

function daysAgo(dateStr: string): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Mapped today';
  if (diff === 1) return 'Mapped yesterday';
  return `Mapped ${diff} days ago`;
}

function StatusBadge({ status }: { status: PortalStatus }) {
  const conf: Record<PortalStatus, { icon: React.ReactNode; label: string }> = {
    active: { icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
    needs_remap: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Needs Remap' },
    in_progress: { icon: <Loader className="w-3.5 h-3.5 animate-spin" />, label: 'In Progress' },
  };
  const c = conf[status] || conf.active;
  return (
    <span className={`portal-status portal-status--${status}`}>
      {c.icon} {c.label}
    </span>
  );
}

function DotMenu({ portalId, onDelete, onDuplicate }: { portalId: string; onDelete: (id: string) => void; onDuplicate: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="dot-menu-btn" onClick={() => setOpen(!open)}>
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="dot-menu-dropdown">
          <button className="dot-menu-item" onClick={() => { onDuplicate(portalId); setOpen(false); }}>
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button className="dot-menu-item dot-menu-item--danger" onClick={() => { onDelete(portalId); setOpen(false); }}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function PortalManagerPage() {
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [remapping, setRemapping] = useState<string | null>(null);

  const fetchPortals = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/portals`);
      if (res.ok) {
        const data = await res.json();
        setPortals((data.portals || []).map((p: PortalData) => ({
          ...p,
          field_count: Number(p.field_count || 0),
          manual_count: Number(p.manual_count || 0),
        })));
      }
    } catch (err) {
      console.error('Failed to fetch portals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortals();
  }, [fetchPortals]);

  const handleRemap = (id: string) => {
    setRemapping(id);
    setPortals(prev => prev.map(p => p.id === id ? { ...p, status: 'in_progress' as PortalStatus } : p));
    setTimeout(() => {
      setPortals(prev => prev.map(p => p.id === id ? { ...p, status: 'active' as PortalStatus, updated_at: new Date().toISOString() } : p));
      setRemapping(null);
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/portals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPortals(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    const original = portals.find(p => p.id === id);
    if (!original) return;
    try {
      // Fetch full portal with fields
      const res = await fetch(`${BACKEND_URL}/api/portals/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const portal = data.portal;

      // Create duplicate
      const dupId = `${id}-copy-${Date.now().toString(36)}`;
      const createRes = await fetch(`${BACKEND_URL}/api/portals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dupId,
          name: `${portal.name} (Copy)`,
          url_pattern: portal.url_pattern,
          portal_type: portal.portal_type,
          fields: portal.fields || [],
          pre_actions: portal.pre_actions || [],
          phase_groups: portal.phase_groups || [],
        }),
      });
      if (createRes.ok) {
        await fetchPortals();
      }
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  if (loading) {
    return (
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <Loader className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.30)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Loading portals...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 32px 64px' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, fontFamily: "'Outfit', 'Inter', sans-serif", margin: 0, color: 'var(--text-primary)' }}>
                Portal Manager
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Manage your trained government portal mappings
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '99px',
                background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border)',
              }}>
                {portals.length} portal{portals.length !== 1 ? 's' : ''} trained
              </span>
              <Link href="/dashboard/portals/new" className="btn-friendly" style={{ fontSize: '14px', padding: '10px 22px', textDecoration: 'none' }}>
                <Plus className="w-4 h-4" /> Add New Portal
              </Link>
            </div>
          </div>

          {/* Portal cards grid */}
          {portals.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 32px',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
            }}>
              <Inbox className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.12)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
                No portals trained yet
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 24px' }}>
                Train your first government portal to start auto-filling visa applications.
              </p>
              <Link href="/dashboard/portals/new" className="btn-friendly" style={{ fontSize: '14px', padding: '10px 22px', textDecoration: 'none' }}>
                <Plus className="w-4 h-4" /> Train First Portal
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {portals.map((portal, i) => (
                <div
                  key={portal.id}
                  className="portal-card animate-card-appear"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: '16px', fontWeight: 700, margin: 0,
                        fontFamily: "'Outfit', 'Inter', sans-serif",
                        color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {portal.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <Globe className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {portal.url_pattern}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={portal.status} />
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'flex', gap: '16px', padding: '12px 0',
                    borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                    marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {daysAgo(portal.updated_at || portal.created_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {portal.field_count} fields • {portal.manual_count} manual
                      </span>
                    </div>
                  </div>

                  {/* Start Processing Button */}
                  <Link
                    href={`/dashboard/portals/${portal.id}/process`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      width: '100%', padding: '12px 16px', marginBottom: '10px',
                      borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                      color: '#000000', fontSize: '14px', fontWeight: 700,
                      textDecoration: 'none', cursor: 'pointer',
                      transition: 'all 0.2s ease', boxShadow: '0 2px 12px rgba(74,222,128,0.20)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(74,222,128,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(74,222,128,0.20)'; }}
                  >
                    <Play className="w-4 h-4" style={{ fill: 'currentColor' }} /> Start Processing
                  </Link>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      href={`/dashboard/portals/${portal.id}`}
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '13px', padding: '9px 16px', textDecoration: 'none' }}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Mapping
                    </Link>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '13px', padding: '9px 14px' }}
                      onClick={() => handleRemap(portal.id)}
                      disabled={remapping === portal.id}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${remapping === portal.id ? 'animate-spin' : ''}`} />
                      {remapping === portal.id ? 'Remapping...' : 'Remap'}
                    </button>
                    <DotMenu portalId={portal.id} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                  </div>
                </div>
              ))}

              {/* Add new portal card */}
              <Link
                href="/dashboard/portals/new"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '48px 24px', borderRadius: 'var(--radius-xl)',
                  border: '2px dashed var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', textDecoration: 'none',
                  transition: 'all 0.3s ease', cursor: 'pointer', minHeight: '200px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-subtle)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Plus className="w-8 h-8" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Add New Portal</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
