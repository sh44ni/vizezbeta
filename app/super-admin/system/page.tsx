'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Server, Monitor, Activity, RefreshCw,
  CheckCircle2, XCircle, Loader2, Table2, Info,
  Globe, Code2, HardDrive, Cpu, ScanLine,
} from 'lucide-react';
import { useAdminKey } from '@/context/AdminKeyContext';

/* ── Types ── */
interface ServiceStatus {
  status: 'connected' | 'error' | 'checking';
  latency?: number;
  message?: string;
}

interface TableInfo {
  name: string;
  displayName: string;
}

/* ── Known Tables ── */
const KNOWN_TABLES: TableInfo[] = [
  { name: 'users', displayName: 'Users' },
  { name: 'passport_logs', displayName: 'Passport Logs' },
  { name: 'applicants', displayName: 'Applicants' },
  { name: 'portals', displayName: 'Portals' },
  { name: 'portal_fields', displayName: 'Portal Fields' },
  { name: 'authorized_emails', displayName: 'Authorized Emails' },
  { name: 'otp_codes', displayName: 'OTP Codes' },
  { name: 'early_access_requests', displayName: 'Early Access Requests' },
  { name: 'analytics_events', displayName: 'Analytics Events' },
  { name: 'user_sessions', displayName: 'User Sessions' },
];

/* ── Shared Styles ── */
const card: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
};

/* ── Status Dot ── */
function StatusDot({ status }: { status: 'connected' | 'error' | 'checking' }) {
  const colors = {
    connected: '#4ade80',
    error: '#f87171',
    checking: '#fbbf24',
  };
  const color = colors[status];

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '8px',
        height: '8px',
      }}
    >
      {status === 'connected' && (
        <span
          style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '50%',
            background: color,
            opacity: 0.3,
            animation: 'pulse 2s infinite',
          }}
        />
      )}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </span>
  );
}

/* ── Service Status Card ── */
function ServiceCard({
  title,
  icon,
  status,
  details,
  index,
}: {
  title: string;
  icon: React.ReactNode;
  status: ServiceStatus;
  details: { label: string; value: string }[];
  index: number;
}) {
  const statusLabel = {
    connected: 'Operational',
    error: 'Error',
    checking: 'Checking...',
  };
  const statusColor = {
    connected: '#4ade80',
    error: '#f87171',
    checking: '#fbbf24',
  };

  return (
    <div
      className="animate-card-appear"
      style={{
        ...card,
        padding: '24px',
        animationDelay: `${index * 0.08}s`,
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(124,92,252,0.08)',
              border: '1px solid rgba(124,92,252,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c5cfc',
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusDot status={status.status} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: statusColor[status.status],
            }}
          >
            {statusLabel[status.status]}
          </span>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {status.latency !== undefined && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>Latency</span>
            <span
              style={{
                fontSize: '12px',
                fontFamily: "'JetBrains Mono', monospace",
                color: status.latency < 200 ? '#4ade80' : status.latency < 500 ? '#fbbf24' : '#f87171',
              }}
            >
              {status.latency}ms
            </span>
          </div>
        )}
        {details.map((d) => (
          <div
            key={d.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>{d.label}</span>
            <span
              style={{
                fontSize: '12px',
                fontFamily: "'JetBrains Mono', monospace",
                color: 'rgba(255,255,255,0.70)',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {d.value}
            </span>
          </div>
        ))}
        {status.message && (
          <div
            style={{
              fontSize: '11px',
              color: status.status === 'error' ? '#f87171' : 'rgba(255,255,255,0.35)',
              background:
                status.status === 'error'
                  ? 'rgba(248,113,113,0.06)'
                  : 'rgba(255,255,255,0.02)',
              borderRadius: '6px',
              padding: '8px 10px',
              marginTop: '4px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function SystemPage() {
  const adminKey = useAdminKey();
  const [dbStatus, setDbStatus] = useState<ServiceStatus>({ status: 'checking' });
  const [apiStatus, setApiStatus] = useState<ServiceStatus>({ status: 'checking' });
  const [passportStatus, setPassportStatus] = useState<ServiceStatus>({ status: 'checking' });
  const [frontendStatus] = useState<ServiceStatus>({ status: 'connected', latency: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    setRefreshing(true);
    setDbStatus({ status: 'checking' });
    setApiStatus({ status: 'checking' });
    setPassportStatus({ status: 'checking' });

    try {
      const t = Date.now();
      const res = await fetch('/api/admin/health', {
        headers: { 'X-Admin-Key': adminKey },
        signal: AbortSignal.timeout(5000),
      });
      const roundTrip = Date.now() - t;
      const data = await res.json().catch(() => ({} as any));

      // DB status — server-measured SELECT 1
      setDbStatus(data.dbOk
        ? { status: 'connected', latency: data.dbPing ?? roundTrip, message: 'All queries executing normally' }
        : { status: 'error', latency: roundTrip, message: data.dbError || 'Database error' });

      // API status — overhead = roundTrip minus internal work
      const apiLatency = Math.max(0, roundTrip - (data.dbPing ?? 0) - (data.ppLatency ?? 0));
      setApiStatus(res.ok
        ? { status: 'connected', latency: apiLatency, message: 'API responding to requests' }
        : { status: 'error', latency: roundTrip, message: `HTTP ${res.status} response` });

      // Passport Processor — server-measured localhost ping (no CORS overhead)
      setPassportStatus(data.ppOk
        ? { status: 'connected', latency: data.ppLatency ?? 0, message: 'Document processing engine online' }
        : { status: 'error', latency: data.ppLatency, message: data.ppError || 'Passport processor not responding' });
    } catch {
      setDbStatus({ status: 'error', message: 'Connection failed — services unreachable' });
      setApiStatus({ status: 'error', message: 'API server is not responding' });
      setPassportStatus({ status: 'error', message: 'Passport processor is not responding' });
    }

    setRefreshing(false);
  }, [adminKey]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const maskUrl = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}/****`;
    } catch {
      return '****';
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
      {/* ── Header ── */}
      <div style={{ padding: '32px 32px 0', maxWidth: '1120px', margin: '0 auto' }}>
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
              System Overview
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Monitor system health, services, and infrastructure
            </p>
          </div>
          <button
            onClick={checkHealth}
            disabled={refreshing}
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
              cursor: refreshing ? 'not-allowed' : 'pointer',
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
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 32px 64px' }}>
        {/* ── Service Status Cards ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px',
            marginBottom: '32px',
          }}
        >
          <ServiceCard
            title="Database"
            icon={<Database size={18} />}
            status={dbStatus}
            index={0}
            details={[
              { label: 'Engine', value: 'PostgreSQL' },
              { label: 'Provider', value: 'Neon / Supabase' },
            ]}
          />
          <ServiceCard
            title="API Server"
            icon={<Server size={18} />}
            status={apiStatus}
            index={1}
            details={[
              { label: 'Runtime', value: 'Next.js API Routes' },
              { label: 'Region', value: 'Auto' },
            ]}
          />
          <ServiceCard
            title="Passport Processor"
            icon={<ScanLine size={18} />}
            status={passportStatus}
            index={2}
            details={[
              { label: 'Engine', value: 'FastAPI / Python' },
              { label: 'Version', value: 'v3.1.1' },
            ]}
          />
          <ServiceCard
            title="Frontend"
            icon={<Monitor size={18} />}
            status={frontendStatus}
            index={3}
            details={[
              { label: 'Framework', value: 'Next.js 14' },
              { label: 'Renderer', value: 'App Router (RSC)' },
            ]}
          />
        </div>

        {/* ── Database Tables ── */}
        <div
          className="animate-card-appear"
          style={{
            ...card,
            overflow: 'hidden',
            marginBottom: '32px',
            animationDelay: '0.25s',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Table2 size={16} style={{ color: '#7c5cfc' }} />
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#ffffff',
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                }}
              >
                Database Tables
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'rgba(124,92,252,0.80)',
                  background: 'rgba(124,92,252,0.10)',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {KNOWN_TABLES.length}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0',
            }}
          >
            {KNOWN_TABLES.map((table, i) => (
              <div
                key={table.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 24px',
                  borderBottom:
                    i < KNOWN_TABLES.length - (KNOWN_TABLES.length % 2 === 0 ? 2 : 1)
                      ? '1px solid rgba(255,255,255,0.03)'
                      : 'none',
                  borderRight:
                    i % 2 === 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HardDrive
                    size={13}
                    style={{ color: 'rgba(255,255,255,0.20)' }}
                  />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.70)' }}>
                    {table.displayName}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'rgba(255,255,255,0.30)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {table.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Environment Info ── */}
        <div
          className="animate-card-appear"
          style={{
            ...card,
            overflow: 'hidden',
            animationDelay: '0.35s',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <Info size={16} style={{ color: '#7c5cfc' }} />
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: "'Outfit', 'Inter', sans-serif",
              }}
            >
              Environment
            </span>
          </div>

          <div style={{ padding: '4px 0' }}>
            {[
              {
                icon: <Code2 size={14} />,
                label: 'App Version',
                value: '3.1.1',
              },
              {
                icon: <Globe size={14} />,
                label: 'Node Environment',
                value: process.env.NODE_ENV || 'development',
              },
              {
                icon: <Cpu size={14} />,
                label: 'Next.js Runtime',
                value: 'App Router (v14)',
              },
              {
                icon: <Database size={14} />,
                label: 'Database URL',
                value: process.env.NEXT_PUBLIC_DATABASE_URL
                  ? maskUrl(process.env.NEXT_PUBLIC_DATABASE_URL)
                  : '••••••••',
              },
              {
                icon: <Server size={14} />,
                label: 'Deploy Platform',
                value: process.env.VERCEL ? 'Vercel' : 'Self-hosted',
              },
              {
                icon: <Activity size={14} />,
                label: 'Status Page',
                value: 'All systems operational',
              },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 24px',
                  borderBottom:
                    i < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.50)' }}>
                    {item.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontFamily: "'JetBrains Mono', monospace",
                    color:
                      item.label === 'Status Page'
                        ? '#4ade80'
                        : 'rgba(255,255,255,0.70)',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
