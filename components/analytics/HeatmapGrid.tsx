'use client';

import React, { useState, useMemo } from 'react';

interface HeatmapGridProps {
  title: string;
  data: Array<{ day: number; hour: number; value: number }>;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HeatmapGrid({ title, data }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    day: string;
    hour: number;
    value: number;
  } | null>(null);

  const { grid, maxVal } = useMemo(() => {
    // Build a 24 × 7 lookup
    const g: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
    let mv = 0;
    data.forEach(({ day, hour, value }) => {
      if (hour >= 0 && hour < 24 && day >= 0 && day < 7) {
        g[hour][day] = value;
        if (value > mv) mv = value;
      }
    });
    return { grid: g, maxVal: mv };
  }, [data]);

  const getCellColor = (value: number) => {
    if (maxVal === 0 || value === 0) return 'rgba(124,92,252,0.03)';
    const opacity = 0.08 + (value / maxVal) * 0.82; // 0.08 → 0.90
    return `rgba(124,92,252,${opacity.toFixed(2)})`;
  };

  const cellSize = 18;
  const gap = 3;

  return (
    <div
      className="animate-card-appear"
      style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
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

      {/* Day labels row */}
      <div
        style={{
          display: 'flex',
          marginLeft: '38px',
          gap: `${gap}px`,
          marginBottom: `${gap}px`,
        }}
      >
        {DAYS.map((day) => (
          <div
            key={day}
            style={{
              width: `${cellSize}px`,
              textAlign: 'center',
              fontSize: '10px',
              fontFamily: "'Inter', sans-serif",
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
            }}
          >
            {day.charAt(0)}
          </div>
        ))}
      </div>

      {/* Grid rows (hours) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {grid.map((row, hour) => (
          <div key={hour} style={{ display: 'flex', alignItems: 'center', gap: `${gap}px` }}>
            {/* Hour label (every 3rd) */}
            <div
              style={{
                width: '34px',
                fontSize: '10px',
                fontFamily: "'JetBrains Mono', monospace",
                color: hour % 3 === 0 ? 'rgba(255,255,255,0.45)' : 'transparent',
                textAlign: 'right',
                paddingRight: '4px',
                userSelect: 'none',
              }}
            >
              {hour.toString().padStart(2, '0')}:00
            </div>

            {/* Day cells */}
            {row.map((value, day) => (
              <div
                key={`${hour}-${day}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  borderRadius: '3px',
                  background: getCellColor(value),
                  cursor: 'default',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = e.currentTarget
                    .closest('[class*="animate"]')
                    ?.getBoundingClientRect();
                  setTooltip({
                    x: rect.left - (parentRect?.left || 0) + cellSize / 2,
                    y: rect.top - (parentRect?.top || 0) - 8,
                    day: DAYS[day],
                    hour,
                    value,
                  });
                  e.currentTarget.style.transform = 'scale(1.3)';
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(124,92,252,0.4)';
                }}
                onMouseLeave={(e) => {
                  setTooltip(null);
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Color legend bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '16px',
          paddingLeft: '38px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontFamily: "'Inter', sans-serif",
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Less
        </span>
        <div
          style={{
            display: 'flex',
            gap: '2px',
          }}
        >
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t, i) => (
            <div
              key={i}
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '2px',
                background: `rgba(124,92,252,${(0.05 + t * 0.85).toFixed(2)})`,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: '10px',
            fontFamily: "'Inter', sans-serif",
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          More
        </span>
      </div>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.80)',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontFamily: "'Inter', sans-serif",
              color: 'rgba(255,255,255,0.50)',
            }}
          >
            {tooltip.day} · {tooltip.hour.toString().padStart(2, '0')}:00
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              marginTop: '2px',
            }}
          >
            {tooltip.value.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
