'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox, Clock, UserCheck, Mail, RefreshCw, Check, X,
  Loader2, AlertCircle, Trash2, MailPlus, Search, Users,
} from 'lucide-react';
import { useAdminKey } from '@/context/AdminKeyContext';

/* ── Types ── */
interface EarlyAccessReq {
  id: string;
  name: string;
  email: string;
  company?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface AuthorizedEmail {
  id: string;
  email: string;
  name: string;
  added_by: string;
  created_at: string;
}

interface Stats {
  totalRequests: number;
  pending: number;
  authorizedEmails: number;
}

/* ── Shared Styles ── */
const card: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
};

const inputStyle: React.CSSProperties = {
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#111111',
  color: '#ffffff',
  fontSize: '13px',
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.50)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
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
    rejected: { bg: 'rgba(248,113,113,0.10)',  border: 'rgba(248,113,113,0.20)', color: '#f87171' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '3px 10px',
        borderRadius: '99px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
      }}
    >
      {status}
    </span>
  );
}

/* ── Page ── */
export default function AccessPage() {
  const adminKey = useAdminKey();
  const [tab, setTab] = useState<'requests' | 'emails'>('requests');
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<EarlyAccessReq[]>([]);
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Add email form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, reqRes, emailRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'X-Admin-Key': adminKey } }),
        fetch('/api/admin/early-access', { headers: { 'X-Admin-Key': adminKey } }),
        fetch('/api/admin/authorized-emails', { headers: { 'X-Admin-Key': adminKey } }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests || []);
      }
      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmails(data.emails || []);
      }
    } catch {
      // silent fail
    }
    setLoading(false);
  }, [adminKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await fetch('/api/admin/early-access', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, action }),
      });
      await fetchAll();
    } catch {
      // silent
    }
    setActionLoading(null);
  };

  const handleDeleteEmail = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch('/api/admin/authorized-emails', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id }),
      });
      await fetchAll();
    } catch {
      // silent
    }
    setActionLoading(null);
    setDeleteConfirm(null);
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newEmail.trim() || !newName.trim()) {
      setAddError('Email and name are required');
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch('/api/admin/authorized-emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error || 'Failed to add email');
        setAddLoading(false);
        return;
      }
      setNewEmail('');
      setNewName('');
      await fetchAll();
    } catch {
      setAddError('Network error');
    }
    setAddLoading(false);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const statCards = stats
    ? [
        {
          label: 'Total Requests',
          value: stats.totalRequests,
          icon: <Inbox size={15} />,
          color: 'rgba(255,255,255,0.50)',
          accentBg: 'rgba(255,255,255,0.04)',
        },
        {
          label: 'Pending',
          value: stats.pending,
          icon: <Clock size={15} />,
          color: '#fbbf24',
          accentBg: 'rgba(251,191,36,0.08)',
        },
        {
          label: 'Authorized Users',
          value: stats.authorizedEmails,
          icon: <UserCheck size={15} />,
          color: '#4ade80',
          accentBg: 'rgba(74,222,128,0.08)',
        },
      ]
    : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '32px 32px 0',
          maxWidth: '1120px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 4px',
                fontFamily: "'Outfit', 'Inter', sans-serif",
                letterSpacing: '-0.02em',
              }}
            >
              User Access
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
                margin: 0,
              }}
            >
              Manage early access requests and authorized users
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.50)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(124,92,252,0.08)';
              e.currentTarget.style.borderColor = 'rgba(124,92,252,0.25)';
              e.currentTarget.style.color = '#9b85ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.50)';
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 32px 64px' }}>
        {/* ── Stats Row ── */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              marginBottom: '28px',
            }}
          >
            {statCards.map((stat, i) => (
              <div
                key={stat.label}
                className="animate-card-appear"
                style={{
                  ...card,
                  padding: '22px 20px',
                  animationDelay: `${i * 0.08}s`,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: stat.accentBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <span style={{ ...labelStyle, color: stat.color }}>{stat.label}</span>
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#ffffff',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '20px',
            padding: '4px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.04)',
            width: 'fit-content',
          }}
        >
          {([
            { key: 'requests' as const, label: 'Early Access Requests', icon: <Mail size={14} /> },
            { key: 'emails' as const, label: 'Authorized Emails', icon: <UserCheck size={14} /> },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: tab === t.key ? 'rgba(124,92,252,0.12)' : 'transparent',
                color: tab === t.key ? '#7c5cfc' : 'rgba(255,255,255,0.45)',
                fontSize: '13px',
                fontWeight: tab === t.key ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              onMouseEnter={(e) => {
                if (tab !== t.key) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.70)';
                }
              }}
              onMouseLeave={(e) => {
                if (tab !== t.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                }
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.30)' }}>
            <Loader2
              size={24}
              className="animate-spin"
              style={{ margin: '0 auto 12px', display: 'block' }}
            />
            <span style={{ fontSize: '13px' }}>Loading data...</span>
          </div>
        ) : tab === 'requests' ? (
          /* ── Early Access Requests Tab ── */
          <div
            className="animate-card-appear"
            style={{ ...card, overflow: 'hidden', animationDelay: '0.1s' }}
          >
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Inbox size={24} style={{ color: 'rgba(255,255,255,0.20)' }} />
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.35)',
                    margin: '0 0 4px',
                  }}
                >
                  No requests yet
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.20)', margin: 0 }}>
                  Early access requests will appear here
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['Name', 'Email', 'Company', 'Message', 'Date', 'Status', 'Actions'].map((h) => (
                        <th key={h} style={thStyle}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr
                        key={req.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            'rgba(255,255,255,0.02)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                        }}
                      >
                        <td style={{ ...tdBase, color: '#ffffff', fontWeight: 500 }}>{req.name}</td>
                        <td
                          style={{
                            ...tdBase,
                            color: 'rgba(255,255,255,0.60)',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '12px',
                          }}
                        >
                          {req.email}
                        </td>
                        <td style={{ ...tdBase, color: 'rgba(255,255,255,0.40)' }}>
                          {req.company || '—'}
                        </td>
                        <td
                          style={{
                            ...tdBase,
                            color: 'rgba(255,255,255,0.40)',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={req.message || ''}
                        >
                          {req.message || '—'}
                        </td>
                        <td
                          style={{
                            ...tdBase,
                            color: 'rgba(255,255,255,0.35)',
                            whiteSpace: 'nowrap',
                            fontSize: '12px',
                          }}
                        >
                          {formatDate(req.created_at)}
                        </td>
                        <td style={tdBase}>
                          <StatusBadge status={req.status} />
                        </td>
                        <td style={tdBase}>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleAction(req.id, 'approve')}
                                disabled={actionLoading === req.id}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(74,222,128,0.25)',
                                  background: 'rgba(74,222,128,0.08)',
                                  color: '#4ade80',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: actionLoading === req.id ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  fontFamily: "'Inter', system-ui, sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(74,222,128,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(74,222,128,0.08)';
                                }}
                              >
                                {actionLoading === req.id ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Check size={11} />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(req.id, 'reject')}
                                disabled={actionLoading === req.id}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(248,113,113,0.25)',
                                  background: 'rgba(248,113,113,0.08)',
                                  color: '#f87171',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: actionLoading === req.id ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  fontFamily: "'Inter', system-ui, sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(248,113,113,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(248,113,113,0.08)';
                                }}
                              >
                                <X size={11} />
                                Reject
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
          /* ── Authorized Emails Tab ── */
          <div className="animate-card-appear" style={{ animationDelay: '0.1s' }}>
            {/* Add Email Form */}
            <form
              onSubmit={handleAddEmail}
              style={{
                ...card,
                padding: '20px 24px',
                marginBottom: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@company.com"
                  style={{ ...inputStyle, width: '100%' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7c5cfc';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Jane Doe"
                  style={{ ...inputStyle, width: '100%' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7c5cfc';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={addLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: addLoading ? '#1a1a1a' : '#7c5cfc',
                  color: addLoading ? 'rgba(255,255,255,0.35)' : '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: addLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!addLoading) e.currentTarget.style.background = '#9b85ff';
                }}
                onMouseLeave={(e) => {
                  if (!addLoading) e.currentTarget.style.background = '#7c5cfc';
                }}
              >
                {addLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MailPlus size={14} />
                )}
                Add User
              </button>
            </form>

            {addError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.20)',
                  color: '#f87171',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {addError}
              </div>
            )}

            {/* Email List */}
            <div style={{ ...card, overflow: 'hidden' }}>
              {emails.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Users size={24} style={{ color: 'rgba(255,255,255,0.20)' }} />
                  </div>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.35)',
                      margin: '0 0 4px',
                    }}
                  >
                    No authorized emails
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.20)', margin: 0 }}>
                    Add emails above to grant access
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Email', 'Name', 'Added By', 'Date', 'Actions'].map((h) => (
                          <th key={h} style={thStyle}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((em) => (
                        <tr
                          key={em.id}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              'rgba(255,255,255,0.02)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              'transparent';
                          }}
                        >
                          <td
                            style={{
                              ...tdBase,
                              color: '#ffffff',
                              fontWeight: 500,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '12px',
                            }}
                          >
                            {em.email}
                          </td>
                          <td style={{ ...tdBase, color: 'rgba(255,255,255,0.60)' }}>{em.name}</td>
                          <td style={{ ...tdBase, color: 'rgba(255,255,255,0.40)' }}>
                            {em.added_by}
                          </td>
                          <td
                            style={{
                              ...tdBase,
                              color: 'rgba(255,255,255,0.35)',
                              whiteSpace: 'nowrap',
                              fontSize: '12px',
                            }}
                          >
                            {formatDate(em.created_at)}
                          </td>
                          <td style={tdBase}>
                            {deleteConfirm === em.id ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.40)',
                                    marginRight: '4px',
                                  }}
                                >
                                  Sure?
                                </span>
                                <button
                                  onClick={() => handleDeleteEmail(em.id)}
                                  disabled={actionLoading === em.id}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(248,113,113,0.30)',
                                    background: 'rgba(248,113,113,0.12)',
                                    color: '#f87171',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor:
                                      actionLoading === em.id ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                  }}
                                >
                                  {actionLoading === em.id ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <Check size={11} />
                                  )}
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: 'rgba(255,255,255,0.50)',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                  }}
                                >
                                  <X size={11} />
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(em.id)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(248,113,113,0.20)',
                                  background: 'rgba(248,113,113,0.06)',
                                  color: '#f87171',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  fontFamily: "'Inter', system-ui, sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(248,113,113,0.12)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
                                }}
                              >
                                <Trash2 size={11} />
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
