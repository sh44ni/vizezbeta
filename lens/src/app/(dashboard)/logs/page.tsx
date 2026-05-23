'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

/* ── Types ── */
interface LogRow {
  id: number;
  request_id: string;
  filename: string;
  document_type: string;
  status: string;
  processing_time_ms: number;
  original_quality_score: number;
  enhanced_quality_score: number;
  quality_improvement: number;
  processed_by: string;
  processed_at: string;
  file_size_bytes: number;
  error_message: string;
}

interface Filters {
  search: string;
  date_from: string;
  date_to: string;
  document_type: string;
  status: string;
  sort_by: string;
  sort_dir: string;
  page: number;
  limit: number;
}

/* ── Helpers ── */
function formatDocType(t: string): string {
  return t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const defaultFilters: Filters = {
  search: '',
  date_from: '',
  date_to: '',
  document_type: '',
  status: '',
  sort_by: 'processed_at',
  sort_dir: 'desc',
  page: 1,
  limit: 25,
};

/* ── Component ── */
function LogsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Init filters from URL
  const [filters, setFilters] = useState<Filters>(() => ({
    search: searchParams.get('search') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    document_type: searchParams.get('document_type') || '',
    status: searchParams.get('status') || '',
    sort_by: searchParams.get('sort_by') || 'processed_at',
    sort_dir: searchParams.get('sort_dir') || 'desc',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '25', 10),
  }));

  const [draft, setDraft] = useState<Filters>({ ...filters });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.document_type) params.set('document_type', filters.document_type);
    if (filters.status) params.set('status', filters.status);
    params.set('sort_by', filters.sort_by);
    params.set('sort_dir', filters.sort_dir);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    try {
      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 0);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== defaultFilters[k as keyof Filters]) {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    router.replace(`/logs${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [filters, router]);

  function applyFilters() {
    setFilters({ ...draft, page: 1 });
  }

  function resetFilters() {
    setDraft({ ...defaultFilters });
    setFilters({ ...defaultFilters });
  }

  function handleSort(col: string) {
    setFilters((f) => ({
      ...f,
      sort_by: col,
      sort_dir: f.sort_by === col && f.sort_dir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  }

  function handlePageChange(newPage: number) {
    setFilters((f) => ({ ...f, page: newPage }));
  }

  function handleLimitChange(newLimit: number) {
    setFilters((f) => ({ ...f, limit: newLimit, page: 1 }));
  }

  async function handleExport() {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.document_type) params.set('document_type', filters.document_type);
    if (filters.status) params.set('status', filters.status);

    window.open(`/api/logs/export?${params.toString()}`, '_blank');
  }

  function sortArrow(col: string) {
    if (filters.sort_by !== col) return '↕';
    return filters.sort_dir === 'asc' ? '↑' : '↓';
  }

  /* ── Render ── */
  const sortableCols = [
    { key: 'request_id', label: 'Request ID' },
    { key: 'filename', label: 'Filename' },
    { key: 'document_type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'quality_improvement', label: 'Quality' },
    { key: 'processing_time_ms', label: 'Time' },
    { key: 'processed_at', label: 'Date/Time' },
  ];

  return (
    <>
      <div className="lens-page-header">
        <h1>Processing Logs</h1>
        <p>Complete history of document processing</p>
      </div>

      {/* ── Filters ── */}
      <motion.div
        className="lens-filters-bar"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="lens-filter-group">
          <label htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            className="lens-filter-input"
            type="text"
            placeholder="Filename or Request ID…"
            value={draft.search}
            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <div className="lens-filter-group">
          <label htmlFor="filter-date-from">From</label>
          <input
            id="filter-date-from"
            className="lens-filter-input"
            type="date"
            value={draft.date_from}
            onChange={(e) => setDraft((d) => ({ ...d, date_from: e.target.value }))}
          />
        </div>
        <div className="lens-filter-group">
          <label htmlFor="filter-date-to">To</label>
          <input
            id="filter-date-to"
            className="lens-filter-input"
            type="date"
            value={draft.date_to}
            onChange={(e) => setDraft((d) => ({ ...d, date_to: e.target.value }))}
          />
        </div>
        <div className="lens-filter-group">
          <label htmlFor="filter-doc-type">Document Type</label>
          <select
            id="filter-doc-type"
            className="lens-filter-select"
            value={draft.document_type}
            onChange={(e) => setDraft((d) => ({ ...d, document_type: e.target.value }))}
          >
            <option value="">All</option>
            <option value="passport">Passport</option>
            <option value="visa">Visa</option>
            <option value="work_permit">Work Permit</option>
            <option value="id_card">ID Card</option>
          </select>
        </div>
        <div className="lens-filter-group">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            className="lens-filter-select"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="timeout">Timeout</option>
          </select>
        </div>
        <div className="lens-filter-actions">
          <button id="filter-apply-btn" className="lens-filter-btn primary" onClick={applyFilters}>
            Apply
          </button>
          <button id="filter-reset-btn" className="lens-filter-btn secondary" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </motion.div>

      {/* ── Table Toolbar ── */}
      <div className="lens-table-toolbar">
        <div className="lens-search-input-wrapper">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4 4" />
          </svg>
          <input
            id="table-search"
            className="lens-search-input"
            type="text"
            placeholder="Quick search…"
            value={draft.search}
            onChange={(e) => {
              setDraft((d) => ({ ...d, search: e.target.value }));
            }}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
        <button id="export-csv-btn" className="lens-export-btn" onClick={handleExport}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2v12M6 10l4 4 4-4M3 16h14" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Table ── */}
      <motion.div
        className="lens-table-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <table className="lens-table">
          <thead>
            <tr>
              {sortableCols.map((col) => (
                <th
                  key={col.key}
                  className={filters.sort_by === col.key ? 'sorted' : ''}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <span className="lens-sort-arrow">{sortArrow(col.key)}</span>
                </th>
              ))}
              <th>Processed By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}>
                      <div className="lens-skeleton" style={{ height: 14, width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="lens-empty-state">
                    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="6" y="6" width="36" height="36" rx="4" />
                      <path d="M16 20h16M16 28h8" />
                    </svg>
                    <p className="lens-empty-state-title">No logs found</p>
                    <p className="lens-empty-state-text">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="lens-mono lens-tooltip" data-tooltip={row.request_id}>
                      {row.request_id?.substring(0, 12)}…
                    </span>
                  </td>
                  <td>{row.filename || '—'}</td>
                  <td>
                    {row.document_type ? (
                      <span className={`lens-badge-doc ${row.document_type}`}>
                        {formatDocType(row.document_type)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`lens-badge ${row.status}`}>{row.status}</span>
                  </td>
                  <td>
                    <span className="lens-quality-cell">
                      {row.original_quality_score != null ? (
                        <>
                          {(row.original_quality_score * 100).toFixed(0)}%
                          <span className="lens-quality-arrow">→</span>
                          {(row.enhanced_quality_score * 100).toFixed(0)}%
                          {row.quality_improvement != null && (
                            <span className="lens-quality-improvement">
                              +{(row.quality_improvement * 100).toFixed(1)}%
                            </span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                  </td>
                  <td>{row.processing_time_ms != null ? `${row.processing_time_ms}ms` : '—'}</td>
                  <td>{formatDate(row.processed_at)}</td>
                  <td>{row.processed_by || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ── Pagination ── */}
      {totalPages > 0 && (
        <div className="lens-pagination">
          <span className="lens-pagination-info">
            Showing {(filters.page - 1) * filters.limit + 1}–
            {Math.min(filters.page * filters.limit, total)} of {total} logs
          </span>
          <div className="lens-pagination-controls">
            <button
              id="page-prev"
              className="lens-pagination-btn"
              disabled={filters.page <= 1}
              onClick={() => handlePageChange(filters.page - 1)}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 4l-4 4 4 4" />
              </svg>
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (filters.page <= 3) {
                pageNum = i + 1;
              } else if (filters.page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = filters.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  id={`page-${pageNum}`}
                  className={`lens-pagination-btn${filters.page === pageNum ? ' active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              id="page-next"
              className="lens-pagination-btn"
              disabled={filters.page >= totalPages}
              onClick={() => handlePageChange(filters.page + 1)}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>

            <select
              id="rows-per-page"
              className="lens-rows-select"
              value={filters.limit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value, 10))}
            >
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={
      <div className="lens-page-header">
        <h1>Processing Logs</h1>
        <p>Loading...</p>
      </div>
    }>
      <LogsInner />
    </Suspense>
  );
}
