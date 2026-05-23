'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface HealthStatus {
  status: 'online' | 'offline';
}

const NAV_ITEMS = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'nav-logs',
    label: 'Processing Logs',
    href: '/logs',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="5" x2="17" y2="5" />
        <line x1="3" y1="10" x2="17" y2="10" />
        <line x1="3" y1="15" x2="13" y2="15" />
      </svg>
    ),
  },
  {
    id: 'nav-test',
    label: 'Test Document',
    href: '/test',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v8" />
        <path d="M6 6l4 4 4-4" />
        <path d="M3 12v4a1 1 0 001 1h12a1 1 0 001-1v-4" />
      </svg>
    ),
  },
  {
    id: 'nav-settings',
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M16.6 3.4l-1.4 1.4M4.8 15.2l-1.4 1.4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [health, setHealth] = useState<HealthStatus>({ status: 'offline' });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/processor/health');
        if (res.ok) {
          setHealth({ status: 'online' });
        } else {
          setHealth({ status: 'offline' });
        }
      } catch {
        setHealth({ status: 'offline' });
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="lens-sidebar">
      {/* Logo */}
      <div className="lens-sidebar-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="13" stroke="#00e5c8" strokeWidth="1.5" opacity="0.4" />
          <circle cx="16" cy="16" r="9" stroke="#00e5c8" strokeWidth="2" opacity="0.7" />
          <circle cx="16" cy="16" r="5" stroke="#00e5c8" strokeWidth="2" />
          <circle cx="16" cy="16" r="2" fill="#00e5c8" />
        </svg>
        <span className="lens-sidebar-logo-text">VizEz Lens</span>
      </div>

      {/* Navigation */}
      <nav className="lens-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            id={item.id}
            href={item.href}
            className={`lens-sidebar-link${isActive(item.href) ? ' active' : ''}`}
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}
            >
              {item.icon}
              {item.label}
            </motion.span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="lens-sidebar-footer">
        <div className="lens-sidebar-status">
          <span
            className={`lens-sidebar-status-dot${health.status === 'offline' ? ' offline' : ''}`}
          />
          <span>{health.status === 'online' ? 'Engine Online' : 'Engine Offline'}</span>
        </div>

        <button
          id="sidebar-logout-btn"
          className="lens-sidebar-logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" />
            <path d="M14 14l4-4-4-4" />
            <line x1="18" y1="10" x2="8" y2="10" />
          </svg>
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
