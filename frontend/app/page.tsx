'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import AppShell from '@/components/AppShell';
import LoginScreen from '@/components/LoginScreen';
import MobileBlocker from '@/components/MobileBlocker';
import ChangelogNotification from '@/components/ChangelogNotification';
import SettingsPanel from '@/components/SettingsPanel';
import UserManagement from '@/components/UserManagement';
import PassportLogsPanel from '@/components/PassportLogsPanel';
import Link from 'next/link';
import {
  Globe, Layers, Zap,
  CheckCircle, ArrowRight,
  Bot, RefreshCw, Users, Loader,
} from 'lucide-react';

interface Applicant {
  id: number;
  name: string;
  passport_number: string;
  nationality: string;
  mrz_quality: string;
  has_work_permit: boolean;
  created_at: string;
}

interface Portal {
  id: string;
  name: string;
  url_pattern: string;
  portal_type: string;
  field_count: number;
  status: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DashboardContent() {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [loadingPortals, setLoadingPortals] = useState(true);

  useEffect(() => {
    apiFetch('/api/applicants?limit=20')
      .then(r => r.json())
      .then(data => setApplicants(data.applicants || []))
      .catch(() => {})
      .finally(() => setLoadingApplicants(false));

    apiFetch('/api/portals')
      .then(r => r.json())
      .then(data => setPortals(data.portals || []))
      .catch(() => {})
      .finally(() => setLoadingPortals(false));
  }, []);

  const totalApplicants = applicants.length;
  const verifiedCount = applicants.filter(a => a.mrz_quality === 'VERIFIED').length;
  const activePortals = portals.filter(p => p.status === 'active').length;
  const loading = loadingApplicants || loadingPortals;

  const refresh = () => {
    setLoadingApplicants(true);
    setLoadingPortals(true);
    apiFetch('/api/applicants?limit=20').then(r => r.json()).then(d => setApplicants(d.applicants || [])).catch(() => {}).finally(() => setLoadingApplicants(false));
    apiFetch('/api/portals').then(r => r.json()).then(d => setPortals(d.portals || [])).catch(() => {}).finally(() => setLoadingPortals(false));
  };

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
                  {loadingApplicants ? '...' : `${totalApplicants} applicant${totalApplicants !== 1 ? 's' : ''}`}
                  {' \u2022 '}
                  {loadingPortals ? '...' : `${activePortals} active portal${activePortals !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={refresh}
                  title="Refresh"
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.45)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.12s ease, color 0.12s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <Link
                  href="/manual"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '9px 18px', borderRadius: '8px',
                    background: '#7c5cfc', color: '#ffffff',
                    fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#9b85ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#7c5cfc'; }}
                >
                  <Zap size={14} /> Extract Passport
                </Link>
              </div>
            </div>

            {/* ── Metric Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
              {[
                {
                  label: 'Applicants Extracted',
                  value: loadingApplicants ? '—' : String(totalApplicants),
                  icon: <Users size={14} />,
                  sub: loadingApplicants ? '' : totalApplicants === 0 ? 'No applicants yet' : `${verifiedCount} MRZ verified`,
                },
                {
                  label: 'MRZ Verified',
                  value: loadingApplicants ? '—' : totalApplicants > 0 ? `${Math.round((verifiedCount / totalApplicants) * 100)}%` : '—',
                  icon: <CheckCircle size={14} />,
                  sub: loadingApplicants ? '' : `${verifiedCount} of ${totalApplicants}`,
                },
                {
                  label: 'Trained Portals',
                  value: loadingPortals ? '—' : String(portals.length),
                  icon: <Globe size={14} />,
                  sub: loadingPortals ? '' : activePortals > 0 ? `${activePortals} active` : 'None trained yet',
                },
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
                    fontSize: '32px', fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#ffffff', letterSpacing: '-0.03em',
                    lineHeight: 1, marginBottom: '8px',
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Recent Applicants + Trained Portals ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>

              {/* Recent Applicants */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Recent Applicants
                  </h2>
                  <Link href="/manual" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
                  >
                    Extract New <ArrowRight size={12} />
                  </Link>
                </div>

                {loadingApplicants ? (
                  <div style={{ ...card, padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)' }}>
                    <Loader size={18} className="animate-spin" />
                  </div>
                ) : applicants.length === 0 ? (
                  <div style={{ ...card, padding: '48px 24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <Users size={32} style={{ color: 'rgba(255,255,255,0.20)', margin: '0 auto 12px', display: 'block' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>
                      No applicants yet
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)', marginBottom: '16px' }}>
                      Extract a passport to get started
                    </div>
                    <Link href="/manual" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '9px 18px', borderRadius: '8px',
                      background: '#7c5cfc', color: '#ffffff',
                      fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                    }}>
                      <Zap size={14} /> Extract Passport
                    </Link>
                  </div>
                ) : (
                  <div style={{ ...card, overflow: 'hidden' }}>
                    {applicants.slice(0, 6).map((a, i) => (
                      <div
                        key={a.id}
                        className="animate-card-appear"
                        style={{
                          animationDelay: `${i * 0.06}s`,
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '12px 18px',
                          borderBottom: i < Math.min(applicants.length, 6) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'flex', gap: '10px' }}>
                            <span>{a.passport_number || '—'}</span>
                            <span>{a.nationality || '—'}</span>
                            <span>{timeAgo(a.created_at)}</span>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          ...(a.mrz_quality === 'VERIFIED'
                            ? { background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.18)' }
                            : { background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.18)' }),
                        }}>
                          {a.mrz_quality || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trained Portals */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Trained Portals
                  </h2>
                  <Link href="/dashboard/portals" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
                  >
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                <div style={{ ...card, overflow: 'hidden' }}>
                  {loadingPortals ? (
                    <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)' }}>
                      <Loader size={18} className="animate-spin" />
                    </div>
                  ) : portals.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center' }}>
                      <Globe size={28} style={{ color: 'rgba(255,255,255,0.20)', margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: '4px' }}>No portals yet</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)', marginBottom: '14px' }}>Train your first portal to enable auto-fill</div>
                      <Link href="/dashboard/portals/new" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', borderRadius: '8px',
                        background: '#7c5cfc', color: '#ffffff',
                        fontSize: '12px', fontWeight: 600, textDecoration: 'none',
                      }}>
                        Train Portal
                      </Link>
                    </div>
                  ) : portals.slice(0, 5).map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/portals/${p.id}/process`}
                      className="animate-card-appear"
                      style={{
                        animationDelay: `${i * 0.05}s`,
                        display: 'flex', gap: '12px', padding: '12px 16px',
                        borderBottom: i < Math.min(portals.length, 5) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        textDecoration: 'none', color: 'inherit',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '7px', flexShrink: 0,
                        background: '#111111', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                      }}>
                        {(p.portal_type || 'visa') === 'visa' ? '🛂' : '📋'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                          {p.field_count} fields &bull; {p.url_pattern?.replace(/^\*:\/\//, '').replace(/\/\*$/, '').split('/')[0] || p.url_pattern}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px',
                        alignSelf: 'center', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em',
                        ...(p.status === 'active'
                          ? { background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.18)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }),
                      }}>
                        {p.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                    </Link>
                  ))}
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
                  { label: 'Extract Passport', desc: 'Upload & extract passport data with AI', icon: <Zap size={18} />, href: '/manual' },
                  { label: 'Train a Portal',   desc: 'Teach VizEz a new government form',    icon: <Bot size={18} />,   href: '/dashboard/portals/new' },
                  { label: 'Portal Manager',  desc: `${portals.length} portal${portals.length !== 1 ? 's' : ''} trained`, icon: <Globe size={18} />, href: '/dashboard/portals' },
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
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
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
