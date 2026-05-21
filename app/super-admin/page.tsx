'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, ArrowLeft, LogOut, Users, Mail, Plus, Trash2,
  Check, X, Loader2, AlertCircle, RefreshCw, Clock,
  UserCheck, MailPlus,
} from 'lucide-react';
import Link from 'next/link';

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

/* ── Styles ── */
const card: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
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
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.50)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

/* ── Auth Gate Component ── */
function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!key.trim()) {
      setError('Please enter the admin key');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid key');
        setLoading(false);
        return;
      }
      onAuth(key.trim());
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '250px',
        background: 'radial-gradient(ellipse at top, rgba(124,92,252,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div
        className="animate-slide-up"
        style={{
          ...card,
          width: '100%',
          maxWidth: '380px',
          margin: '0 20px',
          padding: '36px 32px 32px',
          position: 'relative',
          zIndex: 1,
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(124,92,252,0.10)',
              border: '1px solid rgba(124,92,252,0.20)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Shield size={24} style={{ color: '#7c5cfc' }} />
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 4px',
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            Super Admin Access
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>
            Enter the secret key to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter admin key"
            autoFocus
            style={{ ...inputStyle, width: '100%', marginBottom: '16px' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#7c5cfc';
              e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {error && (
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
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: loading ? '#1a1a1a' : '#7c5cfc',
              color: loading ? 'rgba(255,255,255,0.35)' : '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.15s ease',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#9b85ff'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#7c5cfc'; }}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield size={15} />
                Access Panel
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Status Badges ── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; border: string; color: string }> = {
    pending: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.20)', color: '#fbbf24' },
    approved: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.20)', color: '#4ade80' },
    rejected: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.20)', color: '#f87171' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '3px 8px',
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

/* ── Admin Dashboard ── */
function AdminDashboard({ adminKey }: { adminKey: string }) {
  const [tab, setTab] = useState<'requests' | 'emails'>('requests');
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<EarlyAccessReq[]>([]);
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const tabBtn = (t: 'requests' | 'emails', label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(t)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        background: tab === t ? 'rgba(124,92,252,0.12)' : 'transparent',
        color: tab === t ? '#7c5cfc' : 'rgba(255,255,255,0.45)',
        fontSize: '13px',
        fontWeight: tab === t ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onMouseEnter={(e) => {
        if (tab !== t) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.70)';
        }
      }}
      onMouseLeave={(e) => {
        if (tab !== t) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
        }
      }}
    >
      {icon}
      {label}
    </button>
  );

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255,255,255,0.40)',
              fontSize: '12px',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
          >
            <ArrowLeft size={14} />
            Home
          </Link>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: '#7c5cfc' }} />
            <span
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: "'Outfit', 'Inter', sans-serif",
                letterSpacing: '-0.02em',
              }}
            >
              VizEz Super Admin
            </span>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.50)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(248,113,113,0.08)';
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.borderColor = 'rgba(248,113,113,0.20)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.50)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </header>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '28px 32px 64px' }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Total Requests', value: stats.totalRequests, icon: <Users size={14} />, color: 'rgba(255,255,255,0.40)' },
              { label: 'Pending', value: stats.pending, icon: <Clock size={14} />, color: '#fbbf24' },
              { label: 'Authorized Emails', value: stats.authorizedEmails, icon: <UserCheck size={14} />, color: '#4ade80' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="animate-card-appear"
                style={{
                  ...card,
                  padding: '20px',
                  animationDelay: `${i * 0.07}s`,
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: stat.color }}>
                  {stat.icon}
                  <span style={{ ...labelStyle, color: stat.color }}>{stat.label}</span>
                </div>
                <div
                  style={{
                    fontSize: '32px',
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '20px',
          padding: '4px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.04)',
          width: 'fit-content',
        }}>
          {tabBtn('requests', 'Early Access Requests', <Mail size={14} />)}
          {tabBtn('emails', 'Authorized Emails', <UserCheck size={14} />)}
          <button
            onClick={fetchAll}
            disabled={loading}
            title="Refresh"
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.30)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              marginLeft: '4px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.30)'; }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.30)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
            <span style={{ fontSize: '13px' }}>Loading...</span>
          </div>
        ) : tab === 'requests' ? (
          /* Early Access Requests */
          <div style={{ ...card, overflow: 'hidden' }}>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.30)' }}>
                <Mail size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <span style={{ fontSize: '13px' }}>No early access requests yet</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['Name', 'Email', 'Company', 'Message', 'Date', 'Status', 'Actions'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'rgba(255,255,255,0.35)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            whiteSpace: 'nowrap',
                          }}
                        >
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
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: 500 }}>{req.name}</td>
                        <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.60)' }}>{req.email}</td>
                        <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.40)' }}>{req.company || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.40)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.message || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {formatDate(req.created_at)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge status={req.status} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
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
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.08)'; }}
                              >
                                {actionLoading === req.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
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
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
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
          /* Authorized Emails */
          <div>
            {/* Add Email Form */}
            <form
              onSubmit={handleAddEmail}
              style={{
                ...card,
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: '6px' }}>Email</label>
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
              <div style={{ flex: 1, minWidth: '140px' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: '6px' }}>Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
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
                  padding: '9px 16px',
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
                onMouseEnter={(e) => { if (!addLoading) e.currentTarget.style.background = '#9b85ff'; }}
                onMouseLeave={(e) => { if (!addLoading) e.currentTarget.style.background = '#7c5cfc'; }}
              >
                {addLoading ? <Loader2 size={14} className="animate-spin" /> : <MailPlus size={14} />}
                Add
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

            {/* Email list */}
            <div style={{ ...card, overflow: 'hidden' }}>
              {emails.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.30)' }}>
                  <UserCheck size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                  <span style={{ fontSize: '13px' }}>No authorized emails yet</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Email', 'Name', 'Added By', 'Date', 'Actions'].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: 'rgba(255,255,255,0.35)',
                              borderBottom: '1px solid rgba(255,255,255,0.06)',
                              whiteSpace: 'nowrap',
                            }}
                          >
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
                          onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: 500 }}>{em.email}</td>
                          <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.60)' }}>{em.name}</td>
                          <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.40)' }}>{em.added_by}</td>
                          <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            {formatDate(em.created_at)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => handleDeleteEmail(em.id)}
                              disabled={actionLoading === em.id}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(248,113,113,0.20)',
                                background: 'rgba(248,113,113,0.06)',
                                color: '#f87171',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: actionLoading === em.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; }}
                            >
                              {actionLoading === em.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              Delete
                            </button>
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

/* ── Page Export ── */
export default function SuperAdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(null);

  if (!adminKey) {
    return <AuthGate onAuth={setAdminKey} />;
  }

  return <AdminDashboard adminKey={adminKey} />;
}
