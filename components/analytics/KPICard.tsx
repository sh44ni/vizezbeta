'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SparkLine from './SparkLine';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  sparkData?: number[];
  color?: string;
  /** Stagger index for animation delay (0, 1, 2, …) */
  animationIndex?: number;
}

export default function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  sparkData,
  color = '#7c5cfc',
  animationIndex = 0,
}: KPICardProps) {
  const [hovered, setHovered] = useState(false);

  const cardStyle: React.CSSProperties = {
    background: '#0a0a0a',
    border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    cursor: 'default',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: hovered
      ? '0 12px 48px rgba(0,0,0,0.80)'
      : '0 1px 2px rgba(0,0,0,0.60)',
    animationDelay: `${animationIndex * 80}ms`,
    animationFillMode: 'backwards',
  };

  const iconBadgeStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: `${color}1a`, // ~0.10 opacity hex
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const metricStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '32px',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.01em',
  };

  return (
    <div
      className="animate-card-appear"
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: icon badge + sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={iconBadgeStyle}>
          <Icon size={22} color={color} strokeWidth={2} />
        </div>
        {sparkData && sparkData.length > 1 && (
          <SparkLine data={sparkData} color={color} width={100} height={32} />
        )}
      </div>

      {/* Metric */}
      <div>
        <div style={metricStyle}>{value}</div>
        <div style={{ ...labelStyle, marginTop: '4px' }}>{label}</div>
      </div>

      {/* Trend */}
      {trend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            color: trend.isPositive ? '#4ade80' : '#f87171',
          }}
        >
          {trend.isPositive ? (
            <TrendingUp size={14} strokeWidth={2.5} />
          ) : (
            <TrendingDown size={14} strokeWidth={2.5} />
          )}
          <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '12px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.35)',
              marginLeft: '2px',
            }}
          >
            vs last period
          </span>
        </div>
      )}
    </div>
  );
}
