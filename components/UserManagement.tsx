'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Shield, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserManagement({ isOpen, onClose }: Props) {
  const { isAdmin } = useAuth();

  if (!isOpen || !isAdmin) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
        }}
      />

      {/* Panel */}
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '90vw',
          background: '#0a0a0a',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: "'Outfit', 'Inter', sans-serif",
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Shield size={20} style={{ color: '#7c5cfc' }} />
              Access Management
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginTop: '4px' }}>
              Manage user access via the Super Admin panel
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.40)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.40)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(124,92,252,0.10)',
              border: '1px solid rgba(124,92,252,0.20)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <Shield size={28} style={{ color: '#7c5cfc' }} />
          </div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
              margin: '0 0 8px',
              fontFamily: "'Outfit', 'Inter', sans-serif",
              textAlign: 'center',
            }}
          >
            User management has moved
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.45)',
              margin: '0 0 24px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Manage authorized emails and early access requests from the Super Admin panel.
          </p>
          <a
            href="/super-admin"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#7c5cfc',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.15s ease',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#9b85ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#7c5cfc'; }}
          >
            <ExternalLink size={14} />
            Open Super Admin
          </a>
        </div>
      </div>
    </>
  );
}
