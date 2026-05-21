'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, Globe, BarChart3, RefreshCw,
  TrendingUp, TrendingDown, Minus, Clock, Monitor,
  Zap, Shield, ChevronDown, Loader2, AlertCircle,
  LogIn, FileText, Server, Eye,
} from 'lucide-react';
import { useAdminKey } from '@/context/AdminKeyContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ═══════════════════ TYPES ═══════════════════ */

interface DashboardData {
  overview?: {
    totalUsers: number;
    activeToday: number;
    totalExtractions: number;
    extractionsTrend: number;
    activePortals: number;
    totalFields: number;
    dauSparkline: number[];
  };
  users?: {
    dailyActiveUsers: Array<{ day: string; count: number }>;
    sessionDuration: Array<{ bucket: string; count: number }>;
    topUsers: Array<{
      user_email: string;
      user_name: string;
      session_count: number;
      total_seconds: number;
      avg_seconds: number;
      last_active: string;
    }>;
  };
  screentime?: {
    heatmap: Array<{ day: number; hour: number; value: number }>;
    perUser: Array<{
      user_email: string;
      user_name: string;
      total_seconds: number;
      avg_session: number;
      session_count: number;
      last_active: string;
    }>;
    stats: { avg_duration: number; median_duration: number; total_sessions: number };
  };
  extractions?: {
    byDay: Array<{ day: string; success: number; failed: number }>;
    mrzQuality: Array<{ quality: string; count: number }>;
    avgProcessingTime: number;
    successRate: number;
    totalExtractions: number;
  };
  portals?: {
    usage: Array<{ name: string; count: number }>;
    confidence: Array<{ level: string; count: number }>;
    list: Array<{
      id: string;
      name: string;
      url_pattern: string;
      status: string;
      field_count: number;
      created_at: string;
      updated_at: string;
    }>;
  };
  growth?: {
    userGrowth: Array<{ day: string; count: number }>;
    funnel: {
      requests: number;
      approved: number;
      rejected: number;
      pending: number;
      activated: number;
    };
  };
  activity?: {
    recent: Array<{
      id: string;
      type: string;
      user: string;
      message: string;
      detail?: string;
      timestamp: string;
    }>;
  };
  availableUsers?: Array<{ email: string; name: string }>;
}

/* ═══════════════════ HELPERS ═══════════════════ */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CHART_COLORS = {
  primary: '#7c5cfc',
  primaryLight: '#9b85ff',
  success: '#4ade80',
  error: '#f87171',
  warn: '#fbbf24',
  info: '#60a5fa',
  muted: 'rgba(255,255,255,0.20)',
};

const MRZ_COLORS: Record<string, string> = {
  VERIFIED: '#4ade80',
  PARTIAL: '#fbbf24',
  FAILED: '#f87171',
  UNREADABLE: '#f87171',
  UNKNOWN: 'rgba(255,255,255,0.20)',
};

const EVENT_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  login: { icon: <LogIn size={12} />, color: '#60a5fa' },
  logout: { icon: <LogIn size={12} />, color: 'rgba(255,255,255,0.30)' },
  extraction_completed: { icon: <FileText size={12} />, color: '#4ade80' },
  extraction_failed: { icon: <AlertCircle size={12} />, color: '#f87171' },
  extraction_started: { icon: <Zap size={12} />, color: '#fbbf24' },
  portal_fill: { icon: <Globe size={12} />, color: '#7c5cfc' },
  portal_created: { icon: <Globe size={12} />, color: '#4ade80' },
  page_view: { icon: <Eye size={12} />, color: 'rgba(255,255,255,0.30)' },
  letter_generated: { icon: <FileText size={12} />, color: '#60a5fa' },
  error: { icon: <AlertCircle size={12} />, color: '#f87171' },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DATE_RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

/* ═══════════════════ CUSTOM TOOLTIP ═══════════════════ */

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '10px',
      padding: '12px 16px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.60)',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
        {label}
      </div>
      {payload.map((item, i) => (
        <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.70)', display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
          <span>{item.name}: <span style={{ color: '#fff', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{item.value.toLocaleString()}</span></span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function AnalyticsDashboard() {
  const adminKey = useAdminKey();
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedUser, setSelectedUser] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!adminKey) return;
    setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams({ range: dateRange });
      if (selectedUser) params.set('user', selectedUser);
      const res = await fetch(`/api/analytics/dashboard?${params}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const result = await res.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminKey, dateRange, selectedUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: '16px' }}>
        <Loader2 size={28} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>Loading analytics...</span>
      </div>
    );
  }

  const { overview, users, screentime, extractions, portals, growth, activity, availableUsers } = data;

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* ─── Page Header ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Analytics Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: '4px 0 0' }}>
            Platform insights and user activity
          </p>
        </div>
        {lastUpdated && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)', marginTop: '8px' }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="animate-card-appear" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {DATE_RANGES.map(r => (
            <button
              key={r.key}
              className={`filter-chip ${dateRange === r.key ? 'active' : ''}`}
              onClick={() => setDateRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)', margin: '0 6px' }} />

        {/* User filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '99px',
              padding: '6px 32px 6px 14px',
              color: selectedUser ? '#f59e0b' : 'rgba(255,255,255,0.45)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              minWidth: '140px',
            }}
          >
            <option value="">All Users</option>
            {(availableUsers || []).map(u => (
              <option key={u.email} value={u.email}>{u.name || u.email}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.30)', pointerEvents: 'none' }} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Refresh */}
        <button
          onClick={fetchData}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent',
            color: refreshing ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.60)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.30)'; e.currentTarget.style.color = '#f59e0b'; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = refreshing ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.60)'; }}
        >
          <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.20)',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          color: '#f87171',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* ═══════════ SECTION 1: KPI Cards ═══════════ */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
          {[
            { icon: <Users size={18} />, label: 'Total Users', value: overview.totalUsers, color: '#7c5cfc' },
            { icon: <Activity size={18} />, label: 'Active Today', value: overview.activeToday, color: '#4ade80', spark: overview.dauSparkline },
            { icon: <Zap size={18} />, label: 'Extractions', value: overview.totalExtractions, color: '#f59e0b', trend: overview.extractionsTrend },
            { icon: <Globe size={18} />, label: 'Active Portals', value: overview.activePortals, color: '#60a5fa', sub: `${overview.totalFields} fields mapped` },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="analytics-kpi animate-card-appear"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: `${kpi.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: kpi.color,
                }}>
                  {kpi.icon}
                </div>
                {kpi.trend !== undefined && kpi.trend !== 0 && (
                  <div className={kpi.trend > 0 ? 'trend-up' : 'trend-down'}>
                    {kpi.trend > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {Math.abs(kpi.trend)}%
                  </div>
                )}
                {kpi.trend === 0 && (
                  <div className="trend-neutral"><Minus size={13} /> —</div>
                )}
              </div>
              <div style={{
                fontSize: '28px', fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#fff', lineHeight: 1, marginBottom: '4px',
              }}>
                {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                {kpi.label}
              </div>
              {kpi.sub && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)', marginTop: '2px' }}>
                  {kpi.sub}
                </div>
              )}
              {/* Mini sparkline */}
              {kpi.spark && kpi.spark.length > 1 && (
                <div style={{ marginTop: '10px', height: '28px' }}>
                  <ResponsiveContainer width="100%" height={28}>
                    <AreaChart data={kpi.spark.map((v, idx) => ({ i: idx, v }))}>
                      <defs>
                        <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={kpi.color} stopOpacity={0.30} />
                          <stop offset="100%" stopColor={kpi.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={kpi.color} fill={`url(#spark-${i})`} strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ SECTION 2: User Activity & Sessions ═══════════ */}
      {users && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
          {/* DAU Chart */}
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.15s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">Daily Active Users</div>
                <div className="analytics-section-subtitle">Unique users per day</div>
              </div>
            </div>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={users.dailyActiveUsers.map(d => ({ ...d, day: formatDate(d.day) }))}>
                  <defs>
                    <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Users" stroke={CHART_COLORS.primary} fill="url(#dauGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART_COLORS.primary, stroke: '#0a0a0a', strokeWidth: 2 }} animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Session Duration Distribution */}
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.20s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">Session Duration</div>
                <div className="analytics-section-subtitle">Distribution of session lengths</div>
              </div>
            </div>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={users.sessionDuration}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="bucket" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Sessions" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} animationDuration={1200}>
                    {users.sessionDuration.map((_, idx) => (
                      <Cell key={idx} fill={idx === 0 ? CHART_COLORS.muted : CHART_COLORS.primary} fillOpacity={0.6 + (idx * 0.1)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ SECTION 3: Screen Time ═══════════ */}
      {screentime && (
        <div className="animate-card-appear" style={{ marginBottom: '28px', animationDelay: '0.25s' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
            {[
              { label: 'Avg Session', value: formatDuration(screentime.stats.avg_duration), icon: <Clock size={16} /> },
              { label: 'Median Session', value: formatDuration(screentime.stats.median_duration), icon: <Monitor size={16} /> },
              { label: 'Total Sessions', value: screentime.stats.total_sessions.toLocaleString(), icon: <Activity size={16} /> },
            ].map((s, i) => (
              <div key={i} className="analytics-kpi" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124,92,252,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c5cfc', flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#fff', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="chart-container" style={{ marginBottom: '14px' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">Peak Usage Hours</div>
                <div className="analytics-section-subtitle">When your users are most active (sessions by hour & day)</div>
              </div>
            </div>
            <HeatmapView data={screentime.heatmap} />
          </div>

          {/* Per-user screen time table */}
          {screentime.perUser.length > 0 && (
            <div className="chart-container">
              <div className="analytics-section-header">
                <div>
                  <div className="analytics-section-title">User Screen Time</div>
                  <div className="analytics-section-subtitle">Time spent by each user in the platform</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Total Time</th>
                      <th>Avg Session</th>
                      <th>Sessions</th>
                      <th>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screentime.perUser.map((u, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '6px',
                              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'rgba(255,255,255,0.60)', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                            }}>
                              {(u.user_name || u.user_email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: '#fff', fontWeight: 500, fontSize: '13px' }}>{u.user_name || 'Unknown'}</div>
                              <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: '11px' }}>{u.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#fff' }}>
                          {formatDuration(u.total_seconds)}
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatDuration(u.avg_session)}
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {u.session_count}
                        </td>
                        <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>
                          {u.last_active ? timeAgo(u.last_active) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SECTION 4: Extraction Analytics ═══════════ */}
      {extractions && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', marginBottom: '28px' }}>
          {/* Extractions over time */}
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.30s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">Extractions Over Time</div>
                <div className="analytics-section-subtitle">Successful vs failed extractions</div>
              </div>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.50)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: CHART_COLORS.success }} /> Success
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.50)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: CHART_COLORS.error }} /> Failed
                </span>
              </div>
            </div>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={extractions.byDay.map(d => ({ ...d, day: formatDate(d.day) }))}>
                  <defs>
                    <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.20} />
                      <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.error} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={CHART_COLORS.error} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="success" name="Success" stroke={CHART_COLORS.success} fill="url(#successGrad)" strokeWidth={2} dot={false} animationDuration={1200} />
                  <Area type="monotone" dataKey="failed" name="Failed" stroke={CHART_COLORS.error} fill="url(#failGrad)" strokeWidth={2} dot={false} animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MRZ Quality Donut */}
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.35s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">MRZ Quality</div>
                <div className="analytics-section-subtitle">Passport scan verification results</div>
              </div>
            </div>
            {extractions.mrzQuality.length > 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={extractions.mrzQuality}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="count"
                      nameKey="quality"
                      animationDuration={1200}
                      strokeWidth={0}
                    >
                      {extractions.mrzQuality.map((entry, idx) => (
                        <Cell key={idx} fill={MRZ_COLORS[entry.quality] || MRZ_COLORS.UNKNOWN} fillOpacity={0.80} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                No extraction data yet
              </div>
            )}
            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', justifyContent: 'center' }}>
              {extractions.mrzQuality.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: MRZ_COLORS[m.quality] || MRZ_COLORS.UNKNOWN }} />
                  {m.quality} ({m.count})
                </div>
              ))}
            </div>

            {/* Quality metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: CHART_COLORS.success }}>
                  {extractions.successRate}%
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>Success Rate</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#fff' }}>
                  {extractions.totalExtractions}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>Total</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ SECTION 5: Portal Analytics ═══════════ */}
      {portals && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
          {/* Portal usage bar chart */}
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.40s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">Portal Usage</div>
                <div className="analytics-section-subtitle">Most used portals by fill count</div>
              </div>
            </div>
            {portals.usage.length > 0 ? (
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={portals.usage} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Fills" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} animationDuration={1200} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                No portal usage data yet
              </div>
            )}
          </div>

          {/* Field confidence */}
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.45s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">Field Confidence</div>
                <div className="analytics-section-subtitle">AI mapping confidence distribution</div>
              </div>
            </div>
            {portals.confidence.length > 0 ? (
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={portals.confidence}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="level" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Fields" radius={[4, 4, 0, 0]} animationDuration={1200}>
                      {portals.confidence.map((entry, idx) => {
                        const colors = [CHART_COLORS.success, CHART_COLORS.info, CHART_COLORS.warn, CHART_COLORS.error];
                        return <Cell key={idx} fill={colors[idx] || CHART_COLORS.muted} fillOpacity={0.75} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                No field data yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ SECTION 6: Growth & Activity ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
        {/* User Growth */}
        {growth && (
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.50s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">User Growth</div>
                <div className="analytics-section-subtitle">New authorized users over time</div>
              </div>
            </div>
            {growth.userGrowth.length > 0 ? (
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growth.userGrowth.map(d => ({ ...d, day: formatDate(d.day) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="New Users" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} animationDuration={1200} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                No growth data yet
              </div>
            )}

            {/* Funnel */}
            {growth.funnel && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Early Access Funnel</div>
                {[
                  { label: 'Requests', value: growth.funnel.requests, color: CHART_COLORS.info },
                  { label: 'Approved', value: growth.funnel.approved, color: CHART_COLORS.success },
                  { label: 'Activated', value: growth.funnel.activated, color: CHART_COLORS.primary },
                ].map((stage, idx) => {
                  const maxVal = growth!.funnel.requests || 1;
                  const pct = Math.round((stage.value / maxVal) * 100);
                  return (
                    <div key={idx} style={{ marginBottom: idx < 2 ? '8px' : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{stage.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#fff' }}>
                          {stage.value} <span style={{ color: 'rgba(255,255,255,0.30)' }}>({pct}%)</span>
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`, background: stage.color,
                          borderRadius: '99px', transition: 'width 1s ease-out',
                          opacity: 0.75,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Recent Activity Feed */}
        {activity && (
          <div className="chart-container animate-card-appear" style={{ animationDelay: '0.55s' }}>
            <div className="analytics-section-header">
              <div>
                <div className="analytics-section-title">Recent Activity</div>
                <div className="analytics-section-subtitle">Latest platform events</div>
              </div>
            </div>
            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {activity.recent.length > 0 ? (
                activity.recent.map((item, idx) => {
                  const eventStyle = EVENT_ICONS[item.type] || { icon: <Activity size={12} />, color: 'rgba(255,255,255,0.30)' };
                  return (
                    <div key={item.id || idx} className="activity-feed-item" style={{ animationDelay: `${idx * 0.02}s` }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '6px',
                        background: `${eventStyle.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: eventStyle.color, flexShrink: 0, marginTop: '1px',
                      }}>
                        {eventStyle.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{item.user}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)' }}>·</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)' }}>{timeAgo(item.timestamp)}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.50)', marginTop: '2px' }}>
                          {item.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                  <Activity size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                  No recent activity
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ HEATMAP COMPONENT ═══════════════════ */

function HeatmapView({ data }: { data: Array<{ day: number; hour: number; value: number }> }) {
  const [tooltip, setTooltip] = useState<{ day: number; hour: number; value: number; x: number; y: number } | null>(null);

  const maxVal = Math.max(1, ...data.map(d => d.value));

  // Build a map for quick lookup
  const heatMap = new Map<string, number>();
  data.forEach(d => heatMap.set(`${d.day}-${d.hour}`, d.value));

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Hour labels column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '22px' }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{
              width: '28px', height: '14px', fontSize: '9px', color: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {h % 3 === 0 ? `${h}:00` : ''}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {[0, 1, 2, 3, 4, 5, 6].map(day => (
          <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Day label */}
            <div style={{
              height: '18px', fontSize: '10px', color: 'rgba(255,255,255,0.35)',
              textAlign: 'center', fontWeight: 600,
            }}>
              {DAY_LABELS[day]}
            </div>
            {/* Hour cells */}
            {Array.from({ length: 24 }, (_, h) => {
              const val = heatMap.get(`${day}-${h}`) || 0;
              const intensity = val / maxVal;
              return (
                <div
                  key={h}
                  className="heatmap-cell"
                  style={{
                    height: '14px',
                    background: intensity > 0
                      ? `rgba(124, 92, 252, ${Math.max(0.08, intensity * 0.85)})`
                      : 'rgba(255,255,255,0.02)',
                    borderRadius: '2px',
                  }}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ day, hour: h, value: val, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)' }}>Less</span>
        {[0.05, 0.20, 0.40, 0.65, 0.85].map((op, i) => (
          <div key={i} style={{ width: '12px', height: '12px', borderRadius: '2px', background: `rgba(124, 92, 252, ${op})` }} />
        ))}
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)' }}>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 40,
          transform: 'translateX(-50%)',
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#fff',
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: '0 4px 16px rgba(0,0,0,0.50)',
          pointerEvents: 'none',
        }}>
          {DAY_LABELS[tooltip.day]} {tooltip.hour}:00 — <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{tooltip.value}</span> sessions
        </div>
      )}
    </div>
  );
}
