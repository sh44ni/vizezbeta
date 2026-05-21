'use client';

import React, { useState } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  availableUsers?: Array<{ email: string; name: string }>;
  selectedUser?: string;
  onUserChange?: (email: string) => void;
  onRefresh: () => void;
  lastUpdated?: Date;
  isLoading?: boolean;
}

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All Time', value: 'all' },
];

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FilterBar({
  dateRange,
  onDateRangeChange,
  availableUsers,
  selectedUser,
  onUserChange,
  onRefresh,
  lastUpdated,
  isLoading = false,
}: FilterBarProps) {
  const [refreshHovered, setRefreshHovered] = useState(false);

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    background: active ? '#7c5cfc' : 'transparent',
    color: active ? '#ffffff' : 'rgba(255,255,255,0.50)',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  });

  const selectStyle: React.CSSProperties = {
    appearance: 'none' as const,
    padding: '7px 32px 7px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: '#111111',
    color: 'rgba(255,255,255,0.70)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
    minWidth: '140px',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Date range pills */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          padding: '3px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        {DATE_RANGES.map((r) => (
          <button
            key={r.value}
            style={pillStyle(dateRange === r.value)}
            onClick={() => onDateRangeChange(r.value)}
            onMouseEnter={(e) => {
              if (dateRange !== r.value) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.70)';
              }
            }}
            onMouseLeave={(e) => {
              if (dateRange !== r.value) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.50)';
              }
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* User dropdown */}
      {availableUsers && onUserChange && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            value={selectedUser || ''}
            onChange={(e) => onUserChange(e.target.value)}
            style={selectStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#7c5cfc';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <option value="">All Users</option>
            {availableUsers.map((u) => (
              <option key={u.email} value={u.email}>
                {u.name || u.email}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            style={{
              position: 'absolute',
              right: '10px',
              pointerEvents: 'none',
              color: 'rgba(255,255,255,0.35)',
            }}
          />
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Last updated */}
      {lastUpdated && (
        <span
          style={{
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            color: 'rgba(255,255,255,0.30)',
            whiteSpace: 'nowrap',
          }}
        >
          Updated {timeAgo(lastUpdated)}
        </span>
      )}

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          border: `1px solid ${refreshHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
          background: refreshHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          color: isLoading ? '#7c5cfc' : 'rgba(255,255,255,0.50)',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={() => setRefreshHovered(true)}
        onMouseLeave={() => setRefreshHovered(false)}
      >
        <RefreshCw
          size={15}
          style={{
            animation: isLoading ? 'spin 1s linear infinite' : 'none',
          }}
        />
      </button>
    </div>
  );
}
