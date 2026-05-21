'use client';

import React from 'react';
import { Inbox } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'login' | 'extraction' | 'portal_fill' | 'error' | 'system';
  user?: string;
  message: string;
  detail?: string;
  timestamp: string;
}

interface ActivityFeedProps {
  title: string;
  items: ActivityItem[];
}

const TYPE_COLORS: Record<ActivityItem['type'], string> = {
  login: '#4ade80',
  extraction: '#7c5cfc',
  portal_fill: '#60a5fa',
  error: '#f87171',
  system: '#fbbf24',
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getInitial(user?: string): string {
  if (!user) return '?';
  return user.charAt(0).toUpperCase();
}

export default function ActivityFeed({ title, items }: ActivityFeedProps) {
  return (
    <div
      className="animate-card-appear"
      style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
        {items.length > 0 && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.30)',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            {items.length}
          </span>
        )}
      </div>

      {/* Feed */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              gap: '12px',
            }}
          >
            <Inbox size={32} color="rgba(255,255,255,0.15)" strokeWidth={1.5} />
            <span
              style={{
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                color: 'rgba(255,255,255,0.30)',
              }}
            >
              No activity yet
            </span>
          </div>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className="animate-card-appear"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 24px',
                animationDelay: `${i * 50}ms`,
                animationFillMode: 'backwards',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Type dot */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: TYPE_COLORS[item.type] || 'rgba(255,255,255,0.30)',
                  flexShrink: 0,
                  marginTop: '8px',
                  boxShadow: `0 0 6px ${TYPE_COLORS[item.type] || 'transparent'}40`,
                }}
              />

              {/* Avatar initial */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.60)',
                  fontFamily: "'Inter', sans-serif",
                  flexShrink: 0,
                }}
              >
                {getInitial(item.user)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontFamily: "'Inter', sans-serif",
                    color: 'rgba(255,255,255,0.70)',
                    lineHeight: 1.5,
                  }}
                >
                  {item.user && (
                    <span
                      style={{
                        fontWeight: 600,
                        color: '#ffffff',
                        marginRight: '4px',
                      }}
                    >
                      {item.user}
                    </span>
                  )}
                  {item.message}
                </div>
                {item.detail && (
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: "'Inter', sans-serif",
                      color: 'rgba(255,255,255,0.30)',
                      marginTop: '2px',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.detail}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: "'Inter', sans-serif",
                  color: 'rgba(255,255,255,0.25)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {timeAgo(item.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
