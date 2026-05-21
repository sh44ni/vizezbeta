'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  pageSize?: number;
}

export default function DataTable({
  title,
  columns,
  data,
  pageSize = 10,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'rgba(255,255,255,0.70)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  };

  const paginationBtnStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'transparent',
    color: disabled ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.70)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
  });

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
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...thStyle,
                    cursor: col.sortable !== false ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (col.sortable !== false) handleSort(col.key);
                  }}
                  onMouseEnter={(e) => {
                    if (col.sortable !== false) {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.70)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (col.sortable !== false) {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      sortDir === 'asc' ? (
                        <ChevronUp size={12} strokeWidth={2.5} />
                      ) : (
                        <ChevronDown size={12} strokeWidth={2.5} />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    ...tdStyle,
                    textAlign: 'center',
                    padding: '40px 16px',
                    color: 'rgba(255,255,255,0.30)',
                    fontStyle: 'italic',
                  }}
                >
                  No data available
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIdx) => {
                const globalIdx = safePage * pageSize + rowIdx;
                const isEven = rowIdx % 2 === 0;
                const isHovered = hoveredRow === globalIdx;
                return (
                  <tr
                    key={globalIdx}
                    style={{
                      background: isHovered
                        ? 'rgba(255,255,255,0.04)'
                        : isEven
                        ? 'transparent'
                        : 'rgba(255,255,255,0.015)',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={() => setHoveredRow(globalIdx)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} style={tdStyle}>
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontFamily: "'Inter', sans-serif",
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            Page {safePage + 1} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={paginationBtnStyle(safePage === 0)}
              onMouseEnter={(e) => {
                if (safePage > 0) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={paginationBtnStyle(safePage >= totalPages - 1)}
              onMouseEnter={(e) => {
                if (safePage < totalPages - 1) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
