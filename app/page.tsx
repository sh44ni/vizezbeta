'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import LoginScreen from '@/components/LoginScreen';
import MobileBlocker from '@/components/MobileBlocker';
import ChangelogNotification from '@/components/ChangelogNotification';
import SettingsPanel from '@/components/SettingsPanel';
import UserManagement from '@/components/UserManagement';
import PassportLogsPanel from '@/components/PassportLogsPanel';
import Link from 'next/link';
import {
  Globe, Layers, Zap, TrendingUp, ArrowRight, Bot, Users, Inbox,
} from 'lucide-react';

/* ─── Types ─── */
interface PortalData {
  id: string;
  name: string;
  url_pattern: string;
  status: string;
  field_count: number | string;
  manual_count: number | string;
  updated_at: string;
  created_at: string;
}

interface ActivityItem {
  time: string;
  text: string;
  detail: string;
  type: 'success' | 'warn' | 'info';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const STATUS_COLORS = {
  success: '#4ade80',
  warn: '#fbbf24',
  info: 'rgba(255,255,255,0.35)',
} as const;

const BACKEND_URL = '';

function DashboardContent() {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const [portals, setPortals] = useState<PortalData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch portals from backend
      const portalsRes = await fetch(`${BACKEND_URL}/api/portals`);
      if (portalsRes.ok) {
        const portalsData = await portalsRes.json();
        setPortals(portalsData.portals || []);
      }

      // Fetch passport logs for activity feed
      const logsRes = await fetch(`${BACKEND_URL}/api/passport-logs?limit=10`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        const items: ActivityItem[] = (logsData.rows || []).map((log: { full_name: string; passport_number?: string; nationality?: string; processed_by?: string; processed_at: string }) => ({
          time: timeAgo(log.processed_at),
          text: `Passport processed — ${log.full_name}`,
          detail: `${log.nationality || 'Unknown'} • ${log.passport_number || 'N/A'} • by ${log.processed_by || 'system'}`,
          type: 'success' as const,
        }));
        setActivity(items);
      }

      // Fetch applicant count
      const appRes = await fetch(`${BACKEND_URL}/api/applicants`);
      if (appRes.ok) {
        const appData = await appRes.json();
        setApplicantCount(appData.applicants?.length || 0);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalFields = portals.reduce((s, p) => s + Number(p.field_count || 0), 0);

  const card: React.CSSProperties = {
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    transition: 'border-color 0.15s ease',
  };

  return (
    <>
      <ChangelogNotification />
      <MobileBlocker />

      <AppShell
        onSettingsOpen={() => setSettingsOpen(true)}
        onAccessOpen={() => setAccessOpen(true)}
        onLogsOpen={() => setLogsOpen(true)}
      >
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 32px 72px' }}>

            {/* ── Header ── */}
            <div className="animate-card-appear" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  margin: '0 0 6px',
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                }}>
                  {getGreeting()}, {user?.name || 'there'}
                </h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  {loading ? 'Loading...' : `${portals.length} portal${portals.length !== 1 ? 's' : ''} trained • ${totalFields} fields mapped`}
                </p>
              </div>
              <Link
                href="/dashboard/portals/new"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#7c5cfc',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#9b85ff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#7c5cfc'; }}
              >
                <Bot size={14} /> Train New Portal
              </Link>
            </div>

            {/* ── Metric Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
              {[
                { label: 'Portals Trained', value: loading ? '—' : String(portals.length), icon: <Globe size={14} />, sub: portals.filter(p => p.status === 'active').length + ' active' },
                { label: 'Fields Mapped', value: loading ? '—' : String(totalFields), icon: <Layers size={14} />, sub: portals.length > 0 ? `avg ${Math.round(totalFields / portals.length)} per portal` : 'no portals yet' },
                { label: 'Applicants', value: loading ? '—' : String(applicantCount), icon: <Users size={14} />, sub: 'total processed' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="animate-card-appear"
                  style={{ ...card, animationDelay: `${i * 0.07}s`, padding: '20px' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'rgba(255,255,255,0.40)' }}>
                    {stat.icon}
                    <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</span>
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#ffffff',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    marginBottom: '8px',
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={11} style={{ color: 'rgba(255,255,255,0.30)' }} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>{stat.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Portals + Activity ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>
              {/* Active Portals */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Active Portals
                  </h2>
                  <Link href="/dashboard/portals" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', transition: 'color 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
                  >
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                <div style={{ ...card, overflow: 'hidden' }}>
                  {loading ? (
                    <div style={{ padding: '40px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.30)', fontSize: '13px' }}>
                      Loading portals...
                    </div>
                  ) : portals.length === 0 ? (
                    <div style={{ padding: '40px 18px', textAlign: 'center' }}>
                      <Inbox size={28} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '12px' }} />
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>No portals trained yet</p>
                      <Link href="/dashboard/portals/new" style={{ fontSize: '12px', color: '#7c5cfc', textDecoration: 'none' }}>
                        Train your first portal →
                      </Link>
                    </div>
                  ) : (
                    portals.slice(0, 5).map((portal, i) => (
                      <Link
                        key={portal.id}
                        href={`/dashboard/portals/${portal.id}`}
                        className="animate-card-appear"
                        style={{
                          animationDelay: `${i * 0.06}s`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '14px 18px',
                          borderBottom: i < Math.min(portals.length, 5) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {portal.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'flex', gap: '10px' }}>
                            <span>{portal.url_pattern}</span>
                            <span>{portal.field_count} fields</span>
                            <span>{timeAgo(portal.updated_at || portal.created_at)}</span>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '99px',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          ...(portal.status === 'active'
                            ? { background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.18)' }
                            : { background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.18)' }),
                        }}>
                          {portal.status === 'active' ? 'Active' : 'Needs Remap'}
                        </span>
                        <ArrowRight size={13} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Feed */}
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recent Activity
                </h2>
                <div style={{ ...card, overflow: 'hidden' }}>
                  {loading ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.30)', fontSize: '13px' }}>
                      Loading activity...
                    </div>
                  ) : activity.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <Inbox size={24} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '8px' }} />
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)', margin: 0 }}>No recent activity</p>
                    </div>
                  ) : (
                    activity.map((a, i) => (
                      <div
                        key={i}
                        className="animate-card-appear"
                        style={{
                          animationDelay: `${i * 0.05}s`,
                          display: 'flex',
                          gap: '12px',
                          padding: '12px 16px',
                          borderBottom: i < activity.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        }}
                      >
                        <div style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          marginTop: '7px',
                          flexShrink: 0,
                          background: STATUS_COLORS[a.type],
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff', lineHeight: 1.4 }}>
                            {a.text}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                            {a.detail} &bull; {a.time}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div style={{ marginTop: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quick Actions
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Manual Entry',    desc: 'Upload & extract passport data',     icon: <Layers size={18} />, href: '/manual' },
                  { label: 'Train Portal',    desc: 'Teach VizEz a new government form',  icon: <Bot size={18} />,   href: '/dashboard/portals/new' },
                  { label: 'Portal Manager', desc: 'View and edit all trained portals',   icon: <Globe size={18} />, href: '/dashboard/portals' },
                ].map((action, i) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="animate-card-appear"
                    style={{
                      animationDelay: `${i * 0.07}s`,
                      ...card,
                      padding: '20px',
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#111111',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.60)',
                    }}>
                      {action.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>{action.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>{action.desc}</div>
                    </div>
                    <ArrowRight size={13} style={{ color: 'rgba(255,255,255,0.25)', marginTop: 'auto' }} />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </main>
      </AppShell>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        letterheadSrc=""
        stampSrc=""
        onLetterheadChange={() => {}}
        onStampChange={() => {}}
      />
      <UserManagement isOpen={accessOpen} onClose={() => setAccessOpen(false)} />
      <PassportLogsPanel isOpen={logsOpen} onClose={() => setLogsOpen(false)} />
    </>
  );
}

export default function Home() {
  const { user } = useAuth();
  if (!user) return <LoginScreen />;
  return <DashboardContent />;
}
