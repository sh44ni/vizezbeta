'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarChartWidgetProps {
  title: string;
  subtitle?: string;
  data: Array<{ name: string; value: number }>;
  color?: string;
  height?: number;
  horizontal?: boolean;
}

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
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '16px',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          color: '#ffffff',
        }}
      >
        {typeof payload[0].value === 'number'
          ? payload[0].value.toLocaleString()
          : payload[0].value}
      </div>
    </div>
  );
}

export default function BarChartWidget({
  title,
  subtitle,
  data,
  color = '#7c5cfc',
  height = 300,
  horizontal = false,
}: BarChartWidgetProps) {
  const layout = horizontal ? 'vertical' : 'horizontal';

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
        <BarChart
          data={data}
          layout={layout}
          margin={{
            top: 8,
            right: 8,
            left: horizontal ? 60 : -12,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            horizontal={!horizontal}
            vertical={horizontal}
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'rgba(255,255,255,0.45)',
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'rgba(255,255,255,0.45)',
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                }}
                width={56}
              />
            </>
          ) : (
            <>
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
            </>
          )}
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar
            dataKey="value"
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            animationDuration={1200}
            animationEasing="ease-out"
            maxBarSize={40}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
