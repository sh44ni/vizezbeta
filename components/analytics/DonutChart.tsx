'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DonutChartProps {
  title: string;
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
}

/* ─── Custom Tooltip ─── */
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
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
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#ffffff',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: item.payload?.color || item.color,
            flexShrink: 0,
          }}
        />
        {item.name}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '16px',
          fontWeight: 700,
          color: '#ffffff',
          marginTop: '4px',
        }}
      >
        {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
      </div>
    </div>
  );
}

export default function DonutChart({
  title,
  data,
  centerLabel,
  centerValue,
  height = 300,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

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
      <h3
        style={{
          fontFamily: "'Outfit', 'Inter', sans-serif",
          fontSize: '16px',
          fontWeight: 600,
          color: '#ffffff',
          margin: '0 0 20px 0',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>

      {/* Chart with center label */}
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              stroke="none"
              paddingAngle={2}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center metric overlay */}
        {(centerValue !== undefined || centerLabel) && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {centerValue !== undefined && (
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.1,
                }}
              >
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: '4px',
                }}
              >
                {centerLabel}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '16px',
        }}
      >
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 8px',
                borderRadius: '8px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: '13px',
                  fontFamily: "'Inter', sans-serif",
                  color: 'rgba(255,255,255,0.70)',
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  minWidth: '48px',
                  textAlign: 'right',
                }}
              >
                {item.value.toLocaleString()}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.35)',
                  minWidth: '42px',
                  textAlign: 'right',
                }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
