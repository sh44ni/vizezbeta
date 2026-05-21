'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FunnelChartProps {
  title: string;
  data: Array<{ label: string; value: number; color: string }>;
}

export default function FunnelChart({ title, data }: FunnelChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const maxVal = Math.max(...data.map((d) => d.value), 1);

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
          margin: '0 0 24px 0',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>

      {/* Funnel stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {data.map((stage, i) => {
          const widthPct = (stage.value / maxVal) * 100;
          const prevVal = i > 0 ? data[i - 1].value : null;
          const conversionRate =
            prevVal && prevVal > 0
              ? ((stage.value / prevVal) * 100).toFixed(1)
              : null;

          return (
            <React.Fragment key={i}>
              {/* Conversion indicator between stages */}
              {conversionRate !== null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 0',
                    color: 'rgba(255,255,255,0.30)',
                  }}
                >
                  <ChevronDown size={12} />
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {conversionRate}%
                  </span>
                </div>
              )}

              {/* Stage bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Bar container */}
                <div
                  style={{
                    flex: 1,
                    height: '40px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Filled bar with animation */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: mounted ? `${widthPct}%` : '0%',
                      background: stage.color,
                      borderRadius: '8px',
                      opacity: 0.85,
                      transition: `width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 150}ms`,
                    }}
                  />

                  {/* Label inside bar */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '100%',
                      padding: '0 14px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        color: '#ffffff',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }}
                    >
                      {stage.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#ffffff',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }}
                    >
                      {stage.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
