'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Globe, Bot, Blocks,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Users, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ExtensionStatus from '@/components/ExtensionStatus';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: <LayoutDashboard size={16} />, href: '/' },
  { id: 'portals',   label: 'Portals',      icon: <Globe size={16} />,          href: '/dashboard/portals' },
  { id: 'train',     label: 'AI Training',  icon: <Bot size={16} />,            href: '/dashboard/portals/new' },
  { id: 'addons',    label: 'Addons',       icon: <Blocks size={16} />,        href: '/addons' },
];

interface Props {
  children: React.ReactNode;
  onSettingsOpen?: () => void;
  onAccessOpen?: () => void;
  onLogsOpen?: () => void;
}

export default function AppShell({ children, onSettingsOpen, onAccessOpen, onLogsOpen }: Props) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const sidebarW = collapsed ? 60 : 240;

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  };

  if (!mounted) return null;

  const navBtnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: collapsed ? '9px 0' : '8px 12px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: '7px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.40)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.12s ease, color 0.12s ease',
    width: '100%',
    textAlign: 'left',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000' }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: sidebarW,
          minWidth: sidebarW,
          transition: 'width 0.25s ease, min-width 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: '#000000',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: '60px',
          gap: '8px',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_logo for darkBG.svg"
            alt="VizEz"
            style={{
              height: collapsed ? '20px' : '22px',
              width: 'auto',
              flexShrink: 0,
              transition: 'height 0.2s ease',
            }}
          />
          {!collapsed && (
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.35)',
              flexShrink: 0,
            }}>
              v3.1
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.id}
                href={item.href}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: collapsed ? '9px 0' : '8px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '7px',
                  textDecoration: 'none',
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.40)',
                  background: active ? 'rgba(124,92,252,0.10)' : 'transparent',
                  fontWeight: active ? 600 : 500,
                  fontSize: '13px',
                  transition: 'background 0.12s ease, color 0.12s ease',
                  position: 'relative',
                  borderLeft: active && !collapsed ? '2px solid #7c5cfc' : '2px solid transparent',
                  marginLeft: collapsed ? 0 : 0,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.40)';
                  }
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '99px',
                    background: 'rgba(124,92,252,0.15)',
                    color: '#7c5cfc',
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}




          {isAdmin && onAccessOpen && (
            <button
              onClick={onAccessOpen}
              title={collapsed ? 'Manage Users' : undefined}
              style={{...navBtnBase, display: 'none'}}
            >
              <Users size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>Team</span>}
            </button>
          )}

          {isAdmin && onLogsOpen && (
            <button
              onClick={onLogsOpen}
              title={collapsed ? 'View Logs' : undefined}
              style={{...navBtnBase, display: 'none'}}
            >
              <BarChart3 size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>Logs</span>}
            </button>
          )}
        </nav>

        {/* Extension status */}
        <div style={{ padding: collapsed ? '6px 4px' : '6px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <ExtensionStatus compact />
        </div>

        {/* Bottom section */}
        <div style={{
          padding: collapsed ? '10px 8px' : '10px 8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {onSettingsOpen && (
            <button
              onClick={onSettingsOpen}
              title="Settings"
              style={navBtnBase}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
            >
              <Settings size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span>Settings</span>}
            </button>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={navBtnBase}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span>Collapse</span>}
          </button>

          {/* User */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: collapsed ? '8px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              marginTop: '2px',
              paddingTop: '10px',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                flexShrink: 0,
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.70)',
                fontSize: '11px',
                fontWeight: 700,
              }}>
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name || user.email}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {isAdmin ? 'Admin' : 'Operator'}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign out"
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(248,113,113,0.10)';
                      e.currentTarget.style.color = '#f87171';
                      e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    <LogOut size={13} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{
        flex: 1,
        marginLeft: sidebarW,
        transition: 'margin-left 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#000000',
      }}>
        {children}
      </div>
    </div>
  );
}
