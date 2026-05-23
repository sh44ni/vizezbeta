'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Briefcase,
  ClipboardList,
  Settings,
  LogOut,
  Users,
  Database,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ExtensionStatus from '@/components/ExtensionStatus';

interface Module {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  available: boolean;
  href?: string;
}

const MODULES: Module[] = [
  {
    id: 'manual-visa',
    label: 'Manual Visa',
    desc: 'Upload & extract',
    icon: <ClipboardList className="w-5 h-5" />,
    available: true,
  },
  {
    id: 'visit-visa',
    label: 'Visit Visa',
    desc: 'Letter generation',
    icon: <FileText className="w-5 h-5" />,
    available: false,
  },
  {
    id: 'employment-visa',
    label: 'Employment',
    desc: 'Coming soon',
    icon: <Briefcase className="w-5 h-5" />,
    available: false,
  },
  {
    id: 'portal-manager',
    label: 'Portals',
    desc: 'Train & map',
    icon: <Globe className="w-5 h-5" />,
    available: true,
    href: '/dashboard/portals',
  },
];

interface Props {
  activeModule: string;
  onModuleChange: (id: string) => void;
  onSettingsOpen: () => void;
  onAccessOpen?: () => void;
  onLogsOpen?: () => void;
}

const NavButton = ({ onClick, title, children, hoverBg = 'var(--surface-2)', hoverColor = 'var(--text-primary)' }: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  hoverBg?: string;
  hoverColor?: string;
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '12px', border: '1px solid var(--border)',
      background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.color = hoverColor; (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
  >
    {children}
  </button>
);

export default function Sidebar({
  activeModule,
  onModuleChange,
  onSettingsOpen,
  onAccessOpen,
  onLogsOpen,
}: Props) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <nav className="topnav">
      {/* Left: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '32px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_logo for darkBG.svg"
          alt="VizEz"
          className="animate-fade-in"
          style={{
            height: '30px',
            width: 'auto',
            maxWidth: '120px',
            display: 'block',
          }}
        />
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            padding: '3px 10px',
            borderRadius: '99px',
            background: 'var(--accent-subtle)',
            color: 'var(--accent)',
            border: '1px solid var(--border)',
          }}
        >
          v3.1
        </span>
      </div>

      {/* Center: Module Tabs — bigger & friendlier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
        {MODULES.map((mod) => {
          const isActive = mod.id === activeModule && mod.available;
          const tabStyle: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: isActive ? 'var(--accent-subtle)' : 'transparent',
            color: isActive ? 'var(--accent)' : !mod.available ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: isActive ? 700 : 500,
            cursor: mod.available ? 'pointer' : 'not-allowed',
            opacity: mod.available ? 1 : 0.5,
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          };
          const hoverIn = (e: React.MouseEvent) => { if (mod.available && !isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }};
          const hoverOut = (e: React.MouseEvent) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = mod.available ? 'var(--text-secondary)' : 'var(--text-muted)'; }};
          const inner = (
            <>
              {mod.icon}
              <div style={{ textAlign: 'left' }}>
                <div style={{ lineHeight: 1.2, fontSize: '13px' }}>{mod.label}</div>
                <div style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)', lineHeight: 1 }}>{mod.desc}</div>
              </div>
              {!mod.available && (
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '2px 7px', borderRadius: '99px', background: 'var(--warn-bg)', color: 'var(--warn)', border: '1px solid var(--border)' }}>
                  Soon
                </span>
              )}
            </>
          );
          if (mod.href) {
            return (
              <Link key={mod.id} href={mod.href} style={tabStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={mod.id} onClick={() => mod.available && onModuleChange(mod.id)} style={tabStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              {inner}
            </button>
          );
        })}
      </div>

      {/* Right: Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        {/* Extension status */}
        <div style={{ marginRight: '4px' }}>
          <ExtensionStatus compact />
        </div>

        {/* Admin buttons */}
        {isAdmin && onAccessOpen && (
          <NavButton onClick={onAccessOpen} title="Manage Users">
            <Users className="w-4 h-4" />
          </NavButton>
        )}
        {isAdmin && onLogsOpen && (
          <NavButton onClick={onLogsOpen} title="View Logs">
            <Database className="w-4 h-4" />
          </NavButton>
        )}

        <NavButton onClick={onSettingsOpen} title="Settings">
          <Settings className="w-4 h-4" />
        </NavButton>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', background: 'var(--border)', margin: '0 4px' }} />

        {/* User info + logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px', height: '36px', borderRadius: '12px',
                background: '#1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isAdmin ? '#fff' : 'var(--text-muted)',
                fontSize: '14px', fontWeight: 700,
              }}
            >
              {(user.name || user.email || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.name || user.email}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isAdmin ? 'Admin' : 'User'}
              </div>
            </div>
            <NavButton onClick={logout} title="Sign out" hoverBg="var(--error-bg)" hoverColor="var(--error)">
              <LogOut className="w-4 h-4" />
            </NavButton>
          </div>
        )}
      </div>
    </nav>
  );
}
