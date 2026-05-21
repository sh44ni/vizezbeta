'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export default function PortalNav({ title = 'Portal Manager', backHref = '/', backLabel = 'Back to Dashboard', children }: Props) {
  return (
    <nav className="portal-topnav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <Link
          href={backHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'color 0.12s ease, background 0.12s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
        <h1 style={{
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: "'Outfit', 'Inter', sans-serif",
          color: '#ffffff',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          {title}
        </h1>
        {children}
      </div>
    </nav>
  );
}
