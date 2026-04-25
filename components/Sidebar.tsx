'use client';

import React, { useState } from 'react';
import {
  FileText,
  Briefcase,
  ClipboardList,
  Settings,
  Sun,
  Moon,
  LogOut,
  Users,
  Database,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import ExtensionStatus from '@/components/ExtensionStatus';

interface Module {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  available: boolean;
}

const MODULES: Module[] = [
  {
    id: 'visit-visa',
    label: 'Visit Visa',
    sublabel: 'Automate the process',
    icon: <FileText className="w-4 h-4" />,
    available: true,
  },
  {
    id: 'employment-visa',
    label: 'Employment Visa',
    sublabel: 'Work permit letters',
    icon: <Briefcase className="w-4 h-4" />,
    available: false,
  },
  {
    id: 'manual-visa',
    label: 'Manual Visa',
    sublabel: 'ROP eVisa portal',
    icon: <ClipboardList className="w-4 h-4" />,
    available: true,
  },
];

interface Props {
  activeModule: string;
  onModuleChange: (id: string) => void;
  onSettingsOpen: () => void;
  onAccessOpen?: () => void;
  onLogsOpen?: () => void;
}

export default function Sidebar({
  activeModule,
  onModuleChange,
  onSettingsOpen,
  onAccessOpen,
  onLogsOpen,
}: Props) {
  const { theme, toggle } = useTheme();
  const { user, isAdmin, logout } = useAuth();
  const [toggleKey, setToggleKey] = useState(0);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const handleThemeToggle = () => {
    toggle();
    setToggleKey((k) => k + 1);
  };

  return (
    <aside
      style={{
        width: '230px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        background: 'var(--sidebar)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        borderRight: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* ── Brand ── */}
      <div
        style={{
          padding: '20px 18px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={theme}
            src={theme === 'dark' ? '/logo_logo for darkBG.svg' : '/logo_logoforwhitebg.svg'}
            alt="VizEz"
            className="animate-fade-in"
            style={{
              height: '34px',
              width: 'auto',
              maxWidth: '140px',
              display: 'block',
              filter: 'drop-shadow(0 0 20px rgba(124, 92, 252, 0.15))',
            }}
          />
          <span
            className="beta-badge"
            style={{
              fontSize: '8.5px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: '2.5px 8px',
              borderRadius: '99px',
              background: 'linear-gradient(135deg, rgba(124,92,252,0.25), rgba(56,189,248,0.2))',
              color: '#a78bfa',
              border: '1px solid rgba(124,92,252,0.3)',
              flexShrink: 0,
              animation: 'glow-breathe 3s ease-in-out infinite',
            }}
          >
            Beta
          </span>
        </div>
      </div>

      {/* ── Modules ── */}
      <div style={{ padding: '16px 12px 8px', flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            padding: '0 8px',
            marginBottom: '8px',
          }}
        >
          Modules
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {MODULES.map((mod) => {
            const isActive = mod.id === activeModule && mod.available;
            const isPressed = pressedId === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => mod.available && onModuleChange(mod.id)}
                onMouseDown={() => mod.available && setPressedId(mod.id)}
                onMouseUp={() => setPressedId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--border-bright)' : '1px solid transparent',
                  cursor: mod.available ? 'pointer' : 'not-allowed',
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  opacity: !mod.available ? 0.35 : 1,
                  position: 'relative',
                  transform: isPressed ? 'scale(0.97)' : isActive ? 'scale(1)' : 'scale(1)',
                  boxShadow: isActive ? '0 0 20px rgba(124, 92, 252, 0.08)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (mod.available && !isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  setPressedId(null);
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }
                }}
              >
                {/* Active left accent pill */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '8px',
                      bottom: '8px',
                      width: '3px',
                      borderRadius: '0 3px 3px 0',
                      background: 'var(--gradient-accent)',
                      boxShadow: '0 0 8px rgba(124, 92, 252, 0.4)',
                    }}
                  />
                )}

                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    background: isActive ? 'var(--gradient-accent)' : 'var(--surface-2)',
                    border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: isActive ? '0 0 15px rgba(124, 92, 252, 0.3)' : 'none',
                  }}
                >
                  {mod.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      lineHeight: 1.2,
                      fontFamily: "'Outfit', 'Inter', sans-serif",
                    }}
                  >
                    {mod.label}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {mod.sublabel}
                  </div>
                </div>

                {!mod.available && (
                  <span
                    className="tag-pill"
                    style={{
                      color: 'var(--warn)',
                      background: 'var(--warn-bg)',
                      border: '1px solid rgba(251,191,36,0.2)',
                      fontSize: '8px',
                    }}
                  >
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>


      </div>

      {/* ── Current user badge ── */}
      {user && (
        <div
          style={{
            padding: '10px 12px',
            margin: '0 12px 4px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: isAdmin ? 'var(--gradient-accent)' : 'var(--surface-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isAdmin ? '#fff' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {user.name}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
              @{user.username}
            </div>
          </div>
        </div>
      )}

      {/* ── Extension status ── */}
      <div style={{ padding: '4px 12px 8px' }}>
        <ExtensionStatus compact />
      </div>

      {/* ── Bottom: Icon bar ── */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '6px',
        }}
      >
        {/* Theme toggle — pill switch */}
        <button
          onClick={handleThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '9px 10px',
            borderRadius: '99px',
            border: '1px solid var(--border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '11.5px',
            fontWeight: 500,
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
          }}
        >
          <span key={toggleKey} className="theme-icon-enter" style={{ display: 'flex', alignItems: 'center' }}>
            {theme === 'dark'
              ? <Sun className="w-3.5 h-3.5" style={{ color: 'var(--warn)' }} />
              : <Moon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
          </span>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {/* Access management (admin only) */}
        {isAdmin && onAccessOpen && (
          <button
            onClick={onAccessOpen}
            title="Access Management"
            style={{
              width: '40px',
              height: '40px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '99px',
              border: '1px solid var(--border)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)';
              (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
            }}
          >
            <Users className="w-4 h-4" />
          </button>
        )}

        {/* Passport logs (admin only) */}
        {isAdmin && onLogsOpen && (
          <button
            onClick={onLogsOpen}
            title="Passport Logs"
            style={{
              width: '40px',
              height: '40px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '99px',
              border: '1px solid var(--border)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)';
              (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
            }}
          >
            <Database className="w-4 h-4" />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onSettingsOpen}
          title="Settings"
          style={{
            width: '40px',
            height: '40px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '99px',
            border: '1px solid var(--border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLElement).style.transform = 'rotate(30deg) scale(1.1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            (e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'rotate(45deg) scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'rotate(30deg) scale(1.1)';
          }}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          style={{
            width: '40px',
            height: '40px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '99px',
            border: '1px solid var(--border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--error-bg)';
            (e.currentTarget as HTMLElement).style.color = 'var(--error)';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,113,133,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
          }}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
