'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Blocks, Clock, Check, X, Loader2, RefreshCw,
  ToggleLeft, ToggleRight, Inbox, UserCheck,
} from 'lucide-react';
import { useAdminKey } from '@/context/AdminKeyContext';

/* ── Types ── */
interface AddonRequest {
  id: number;
  user_email: string;
  user_name: string;
  addon_id: string;
  addon_name: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface AddonAccess {
  id: number;
  user_email: string;
  addon_id: string;
  enabled: boolean;
  granted_by: string | null;
  created_at: string;
}

/* ── Shared Styles ── */
const card: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.35)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  whiteSpace: 'nowrap' as const,
};

const tdBase: React.CSSProperties = {
  padding: '12px 16px',
};

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; border: string; color: string }> = {
    pending:  { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.20)',  color: '#fbbf24' },
    approved: { bg: 'rgba(74,222,128,0.10)',   border: 'rgba(74,222,128,0.20)',  color: '#4ade80' },
    denied:   { bg: 'rgba(248,113,113,0.10)',  border: 'rgba(248,113,113,0.20)', color: '#f87171' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', padding: '3px 10px', borderRadius: '99px',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>
      {status}
    </span>
  );
}

/* ── Page ── */
export default function AdminAddonsPage() {
  const adminKey = useAdminKey();
  const [tab, setTab] = useState<'requests' | 'access'>('requests');
  const [requests, setRequests] = useState<AddonRequest[]>([]);
  const [access, setAccess] = useState<AddonAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, accRes] = await Promise.all([
        fetch('/api/addons/requests', { headers: { 'X-Admin-Key': adminKey } }),
        fetch('/api/addons/access', { headers: { 'X-Admin-Key': adminKey } }),
      ]);
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests || []);
      }
      if (accRes.ok) {
        const data = await accRes.json();
        setAccess(data.access || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [adminKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleReview = async (id: number, status: 'approved' | 'denied') => {
    const key = `review-${id}`;
    setActionLoading(key);
    try {
      await fetch(`/api/addons/requests/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, reviewed_by: 'admin' }),
      });
      await fetchAll();
    } catch {
      // silent
    }
    setActionLoading(null);
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    const key = `toggle-${id}`;
    setActionLoading(key);
    try {
      await fetch(`/api/addons/access/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ enabled }),
      });
      await fetchAll();
    } catch {
      // silent
    }
    setActionLoading(null);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const activeCount = access.filter(a => a.enabled).length;

  const statCards = [
    { label: 'Pending Requests', value: pendingCount, icon: <Clock size={15} />, color: '#fbbf24', accentBg: 'rgba(251,191,36,0.08)' },
    { label: 'Active Grants', value: activeCount, icon: <UserCheck size={15} />, color: '#4ade80', accentBg: 'rgba(74,222,128,0.08)' },
    { label: 'Total Requests', value: requests.length, icon: <Inbox size={15} />, color: 'rgba(255,255,255,0.50)', accentBg: 'rgba(255,255,255,0.04)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '32px 32px 0', maxWidth: '1120px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <h1 style={{
              fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px',
              fontFamily: "'Outfit', 'Inter', sans-serif", letterSpacing: '-0.02em',
            }}>
              Addon Management
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Approve addon requests and manage user access
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
              color: 'rgba(255,255,255,0.50)', fontSize: '12px', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,252,0.08)'; e.currentTarget.style.borderColor = 'rgba(124,92,252,0.25)'; e.currentTarget.style.color = '#9b85ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 32px 64px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="animate-card-appear"
              style={{ ...card, padding: '22px 20px', animationDelay: `${i * 0.08}s`, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stat.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  {stat.icon}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: stat.color }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px', padding: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', width: 'fit-content' }}>
          {([
            { key: 'requests' as const, label: 'Addon Requests', icon: <Blocks size={14} /> },
            { key: 'access' as const, label: 'User Access', icon: <UserCheck size={14} /> },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: tab === t.key ? 'rgba(124,92,252,0.12)' : 'transparent',
                color: tab === t.key ? '#7c5cfc' : 'rgba(255,255,255,0.45)',
                fontSize: '13px', fontWeight: tab === t.key ? 600 : 500,
                cursor: 'pointer', transition: 'all 0.15s ease',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              onMouseEnter={e => { if (tab !== t.key) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; } }}
              onMouseLeave={e => { if (tab !== t.key) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
            >
              {t.icon}
              {t.label}
              {t.key === 'requests' && pendingCount > 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                  borderRadius: '99px', background: 'rgba(251,191,36,0.15)',
                  color: '#fbbf24', marginLeft: '4px',
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.30)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
            <span style={{ fontSize: '13px' }}>Loading data...</span>
          </div>
        ) : tab === 'requests' ? (
          /* ── Addon Requests Tab ── */
          <div className="animate-card-appear" style={{ ...card, overflow: 'hidden', animationDelay: '0.1s' }}>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Inbox size={24} style={{ color: 'rgba(255,255,255,0.20)' }} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>
                  No addon requests yet
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.20)', margin: 0 }}>
                  User addon requests will appear here
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['User', 'Email', 'Addon', 'Requested', 'Status', 'Actions'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => (
                      <tr
                        key={req.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ ...tdBase, color: '#ffffff', fontWeight: 500 }}>{req.user_name || '—'}</td>
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.60)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                          {req.user_email}
                        </td>
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.70)' }}>
                          {req.addon_name}
                        </td>
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {formatDate(req.created_at)}
                        </td>
                        <td style={tdBase}>
                          <StatusBadge status={req.status} />
                        </td>
                        <td style={tdBase}>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleReview(req.id, 'approved')}
                                disabled={actionLoading === `review-${req.id}`}
                                style={{
                                  padding: '5px 10px', borderRadius: '6px',
                                  border: '1px solid rgba(74,222,128,0.25)',
                                  background: 'rgba(74,222,128,0.08)',
                                  color: '#4ade80', fontSize: '11px', fontWeight: 600,
                                  cursor: actionLoading === `review-${req.id}` ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  transition: 'all 0.15s ease', fontFamily: "'Inter', system-ui, sans-serif",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.08)'; }}
                              >
                                {actionLoading === `review-${req.id}` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(req.id, 'denied')}
                                disabled={actionLoading === `review-${req.id}`}
                                style={{
                                  padding: '5px 10px', borderRadius: '6px',
                                  border: '1px solid rgba(248,113,113,0.25)',
                                  background: 'rgba(248,113,113,0.08)',
                                  color: '#f87171', fontSize: '11px', fontWeight: 600,
                                  cursor: actionLoading === `review-${req.id}` ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  transition: 'all 0.15s ease', fontFamily: "'Inter', system-ui, sans-serif",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                              >
                                <X size={11} />
                                Deny
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ── User Access Tab ── */
          <div className="animate-card-appear" style={{ ...card, overflow: 'hidden', animationDelay: '0.1s' }}>
            {access.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <UserCheck size={24} style={{ color: 'rgba(255,255,255,0.20)' }} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>
                  No addon access granted yet
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.20)', margin: 0 }}>
                  Approve requests to grant addon access
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['User Email', 'Addon', 'Granted By', 'Date', 'Status'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {access.map(acc => (
                      <tr
                        key={acc.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.60)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                          {acc.user_email}
                        </td>
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.70)' }}>
                          {acc.addon_id}
                        </td>
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.40)' }}>
                          {acc.granted_by || '—'}
                        </td>
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {formatDate(acc.created_at)}
                        </td>
                        <td style={tdBase}>
                          <button
                            onClick={() => handleToggle(acc.id, !acc.enabled)}
                            disabled={actionLoading === `toggle-${acc.id}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '5px 12px', borderRadius: '6px', border: 'none',
                              background: acc.enabled ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                              color: acc.enabled ? '#4ade80' : 'rgba(255,255,255,0.35)',
                              fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              transition: 'all 0.15s ease', fontFamily: "'Inter', system-ui, sans-serif",
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = acc.enabled ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = acc.enabled ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)';
                            }}
                          >
                            {actionLoading === `toggle-${acc.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : acc.enabled ? (
                              <ToggleRight size={16} />
                            ) : (
                              <ToggleLeft size={16} />
                            )}
                            {acc.enabled ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
