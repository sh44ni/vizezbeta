'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AreaChartWidgetProps {
  title: string;
  subtitle?: string;
  data: Array<{ name: string; value: number; [key: string]: any }>;
  dataKeys?: string[];
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = ['#7c5cfc', '#4ade80', '#60a5fa', '#fbbf24', '#f87171'];

/* ─── Custom Tooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.80)',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.45)',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      {payload.map((entry: any, i: number) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: i < payload.length - 1 ? '4px' : 0,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.50)', fontWeight: 400, fontSize: '11px', fontFamily: "'Inter', sans-serif" }}>
            {entry.name}
          </span>
          <span style={{ marginLeft: 'auto' }}>
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AreaChartWidget({
  title,
  subtitle,
  data,
  dataKeys,
  colors = DEFAULT_COLORS,
  height = 300,
}: AreaChartWidgetProps) {
  const keys = dataKeys ?? ['value'];

  return (
    <div
      className="animate-card-appear"
      style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
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
        {subtitle && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              color: 'rgba(255,255,255,0.45)',
              margin: '4px 0 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {keys.map((key, i) => {
              const c = colors[i % colors.length];
              return (
                <linearGradient key={key} id={`area-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: 'rgba(255,255,255,0.45)',
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
            }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: 'rgba(255,255,255,0.45)',
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
            }}
            dx={-4}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{
              stroke: 'rgba(255,255,255,0.10)',
              strokeWidth: 1,
            }}
          />
          {keys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              fill={`url(#area-grad-${key})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: colors[i % colors.length],
                stroke: '#0a0a0a',
                strokeWidth: 2,
              }}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
