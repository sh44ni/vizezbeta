'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, RefreshCw, ChevronLeft, ChevronRight, Search,
  FileText, Globe, User, Clock, X, Fingerprint,
} from 'lucide-react';

interface PassportLog {
  id: number;
  full_name: string;
  passport_number: string | null;
  nationality: string | null;
  processed_by: string | null;
  processed_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 20;

export default function PassportLogsPanel({ isOpen, onClose }: Props) {
  const [logs, setLogs] = useState<PassportLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/passport-logs?limit=${PAGE_SIZE}&offset=${pageNum * PAGE_SIZE}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLogs(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
      setLogs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchLogs(page);
  }, [isOpen, page, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = search
    ? logs.filter((l) =>
        l.full_name.toLowerCase().includes(search.toLowerCase()) ||
        l.passport_number?.toLowerCase().includes(search.toLowerCase()) ||
        l.nationality?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', zIndex: 998,
        }}
      />

      {/* Panel */}
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '520px', maxWidth: '100vw', zIndex: 999,
          background: 'var(--surface-solid)',
          borderLeft: '1px solid var(--glass-border)',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-lg), 0 0 80px rgba(124,92,252,0.08)',
        }}
      >
        {/* Gradient bar */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Database style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div>
              <div style={{
                fontSize: '16px', fontWeight: 700,
                fontFamily: "'Outfit','Inter',sans-serif",
                color: 'var(--text-primary)',
              }}>
                Passport Logs
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 1 }}>
                {total} total record{total !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => fetchLogs(page)}
              title="Refresh"
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1px solid var(--border)',
                background: 'var(--glass-bg)',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                (e.currentTarget as HTMLElement).style.transform = 'rotate(90deg)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
                (e.currentTarget as HTMLElement).style.transform = 'rotate(0)';
              }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1px solid var(--border)',
                background: 'var(--glass-bg)',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--error-bg)';
                (e.currentTarget as HTMLElement).style.color = 'var(--error)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: '12px 24px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <Search style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by name, passport no., nationality…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: 'var(--text-primary)',
                fontSize: '13px', fontFamily: 'inherit',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 0,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {error && (
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--radius-sm)',
              background: 'var(--error-bg)', border: '1px solid rgba(251,113,133,0.2)',
              color: 'var(--error)', fontSize: '12.5px', marginBottom: '12px',
            }}>
              {error}
            </div>
          )}

          {loading && logs.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 20px', gap: '12px',
            }}>
              <div className="animate-spin" style={{
                width: 28, height: 28, border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
              }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading records…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 20px', gap: '12px',
            }}>
              <Database style={{ width: 32, height: 32, color: 'var(--text-muted)', opacity: 0.3 }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {search ? 'No matching records' : 'No passports processed yet'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
              {filtered.map((log, i) => (
                <div
                  key={log.id}
                  className="animate-fade-in"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    transition: 'all 0.25s ease',
                    animationDelay: `${Math.min(i * 30, 300)}ms`,
                    animationFillMode: 'both',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                  }}
                >
                  {/* Name + ID */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'var(--accent-subtle)',
                        border: '1px solid var(--border-bright)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <FileText style={{ width: 13, height: 13, color: 'var(--accent)' }} />
                      </div>
                      <div style={{
                        fontSize: '13.5px', fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: "'Outfit','Inter',sans-serif",
                      }}>
                        {log.full_name}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px', color: 'var(--text-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      #{log.id}
                    </span>
                  </div>

                  {/* Details row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    flexWrap: 'wrap',
                  }}>
                    {log.passport_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Fingerprint style={{ width: 11, height: 11, color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {log.passport_number}
                        </span>
                      </div>
                    )}
                    {log.nationality && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Globe style={{ width: 11, height: 11, color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {log.nationality}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock style={{ width: 11, height: 11, color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {formatDate(log.processed_at)}
                      </span>
                    </div>
                    {log.processed_by && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
                        <User style={{ width: 11, height: 11, color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {log.processed_by}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {total > PAGE_SIZE && (
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-ghost"
              style={{ padding: '7px 14px', fontSize: '12px', opacity: page === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft style={{ width: 13, height: 13 }} /> Prev
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-ghost"
              style={{ padding: '7px 14px', fontSize: '12px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            >
              Next <ChevronRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
