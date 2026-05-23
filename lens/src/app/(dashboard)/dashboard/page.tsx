'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

/* ── Types ── */
interface Stats {
  total_processed: number;
  total_today: number;
  total_this_week: number;
  total_this_month: number;
  success_rate: number;
  avg_processing_time_ms: number;
  avg_quality_improvement: number;
  documents_by_type: Record<string, number>;
}

interface TimeseriesPoint {
  timestamp: string;
  count: number;
  avg_time_ms: number;
  success_count: number;
  error_count: number;
}

interface LogRow {
  id: number;
  request_id: string;
  filename: string;
  document_type: string;
  status: string;
  processing_time_ms: number;
  quality_improvement: number;
  processed_at: string;
  original_quality_score: number;
  enhanced_quality_score: number;
}

/* ── Helpers ── */
const DOC_COLORS: Record<string, string> = {
  passport: '#00e5c8',
  visa: '#818cf8',
  work_permit: '#3b82f6',
  id_card: '#f59e0b',
};

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatDocType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatBarLabel(ts: string, range: string): string {
  const d = new Date(ts);
  if (range === '24h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ── Stagger Variants ── */
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

/* ── Component ── */
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [activity, setActivity] = useState<LogRow[]>([]);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tsRes, logsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch(`/api/stats/timeseries?range=${range}`),
        fetch('/api/logs?limit=10'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (tsRes.ok) {
        const tsData = await tsRes.json();
        setTimeseries(tsData.data || []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setActivity(logsData.rows || []);
      }
    } catch {
      /* silently fail — data stays stale */
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* Chart max value */
  const maxCount = Math.max(...timeseries.map((p) => p.count), 1);

  /* Donut chart */
  const docTypes = stats?.documents_by_type || {};
  const totalDocs = Object.values(docTypes).reduce((a, b) => a + b, 0);
  const donutSegments: { type: string; count: number; pct: number; color: string }[] = [];
  let cumPct = 0;
  for (const [type, count] of Object.entries(docTypes)) {
    const pct = totalDocs > 0 ? (count / totalDocs) * 100 : 0;
    donutSegments.push({ type, count, pct, color: DOC_COLORS[type] || '#55556a' });
  }

  return (
    <>
      <div className="lens-page-header">
        <h1>Dashboard</h1>
        <p>Real-time processing intelligence</p>
      </div>

      {/* ── Stats Grid ── */}
      {loading ? (
        <div className="lens-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="lens-skeleton lens-skeleton-card" />
          ))}
        </div>
      ) : (
        <motion.div
          className="lens-stats-grid"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Total Processed */}
          <motion.div className="lens-stat-card" variants={fadeUp}>
            <div className="lens-stat-header">
              <div className="lens-stat-icon">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="2" width="16" height="18" rx="2" />
                  <path d="M7 7h8M7 11h8M7 15h4" />
                </svg>
              </div>
              <span className="lens-stat-trend up">
                <svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 2l4 5H2z" /></svg>
                {stats?.total_today ?? 0} today
              </span>
            </div>
            <div className="lens-stat-value">{formatNum(stats?.total_processed ?? 0)}</div>
            <div className="lens-stat-label">Total Processed</div>
          </motion.div>

          {/* Avg Processing Time */}
          <motion.div className="lens-stat-card" variants={fadeUp}>
            <div className="lens-stat-header">
              <div className="lens-stat-icon violet">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="9" />
                  <path d="M11 6v5l3 3" />
                </svg>
              </div>
            </div>
            <div className="lens-stat-value">{Math.round(stats?.avg_processing_time_ms ?? 0)}ms</div>
            <div className="lens-stat-label">Avg Processing Time</div>
          </motion.div>

          {/* Success Rate */}
          <motion.div className="lens-stat-card" variants={fadeUp}>
            <div className="lens-stat-header">
              <div className="lens-stat-icon">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 11l4 4 8-8" />
                </svg>
              </div>
              <span className={`lens-stat-trend ${(stats?.success_rate ?? 0) >= 95 ? 'up' : 'down'}`}>
                {(stats?.success_rate ?? 0) >= 95 ? '✓ Healthy' : '⚠ Low'}
              </span>
            </div>
            <div className="lens-stat-value">{stats?.success_rate ?? 0}%</div>
            <div className="lens-stat-label">Success Rate</div>
          </motion.div>

          {/* Quality Improvement */}
          <motion.div className="lens-stat-card" variants={fadeUp}>
            <div className="lens-stat-header">
              <div className="lens-stat-icon violet">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2l2.5 5 5.5.8-4 3.9 1 5.5L11 14.7 5.9 17.2l1-5.5-4-3.9 5.5-.8z" />
                </svg>
              </div>
            </div>
            <div className="lens-stat-value">
              +{((stats?.avg_quality_improvement ?? 0) * 100).toFixed(1)}%
            </div>
            <div className="lens-stat-label">Avg Quality Improvement</div>
          </motion.div>
        </motion.div>
      )}

      {/* ── Charts Grid ── */}
      <motion.div
        className="lens-charts-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {/* Bar Chart — Processing Volume */}
        <div className="lens-chart-card">
          <div className="lens-chart-header">
            <span className="lens-chart-title">Processing Volume</span>
            <div className="lens-chart-range">
              {['24h', '7d', '30d'].map((r) => (
                <button
                  key={r}
                  id={`chart-range-${r}`}
                  className={`lens-chart-range-btn${range === r ? ' active' : ''}`}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="lens-chart-body">
            {loading ? (
              <div className="lens-skeleton lens-skeleton-bar" />
            ) : timeseries.length === 0 ? (
              <div className="lens-empty-state">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="24" width="6" height="16" rx="1" /><rect x="16" y="16" width="6" height="24" rx="1" /><rect x="26" y="20" width="6" height="20" rx="1" /><rect x="36" y="10" width="6" height="30" rx="1" /></svg>
                <p className="lens-empty-state-title">No data yet</p>
                <p className="lens-empty-state-text">Processing data will appear here</p>
              </div>
            ) : (
              <div className="lens-bar-chart">
                {timeseries.map((point, i) => (
                  <div className="lens-bar-col" key={i}>
                    <div
                      className="lens-bar"
                      style={{
                        height: `${Math.max((point.count / maxCount) * 100, 2)}%`,
                        animationDelay: `${i * 0.03}s`,
                      }}
                    >
                      <span className="lens-bar-tooltip">
                        {point.count} docs
                      </span>
                    </div>
                    <span className="lens-bar-label">
                      {formatBarLabel(point.timestamp, range)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart — Document Types */}
        <div className="lens-chart-card">
          <div className="lens-chart-header">
            <span className="lens-chart-title">Document Types</span>
          </div>
          <div className="lens-chart-body">
            {loading ? (
              <div className="lens-skeleton lens-skeleton-bar" />
            ) : totalDocs === 0 ? (
              <div className="lens-empty-state">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="24" cy="24" r="18" /></svg>
                <p className="lens-empty-state-title">No documents yet</p>
                <p className="lens-empty-state-text">Document type breakdown will appear here</p>
              </div>
            ) : (
              <div className="lens-donut-chart">
                <svg className="lens-donut-svg" viewBox="0 0 42 42">
                  {(() => {
                    let offset = 0;
                    return donutSegments.map((seg) => {
                      const circumference = 2 * Math.PI * 15.915;
                      const dashLen = (seg.pct / 100) * circumference;
                      const dashOffset = -offset * (circumference / 100);
                      const el = (
                        <circle
                          key={seg.type}
                          className="lens-donut-segment"
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="4"
                          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                        />
                      );
                      offset += seg.pct;
                      return el;
                    });
                  })()}
                  <text className="lens-donut-center" x="21" y="21" transform="rotate(90 21 21)">
                    {totalDocs}
                  </text>
                </svg>
                <div className="lens-donut-legend">
                  {donutSegments.map((seg) => (
                    <div className="lens-donut-legend-item" key={seg.type}>
                      <span className="lens-donut-legend-dot" style={{ background: seg.color }} />
                      <span>{formatDocType(seg.type)}</span>
                      <span className="lens-donut-legend-value">{seg.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Activity Feed ── */}
      <motion.div
        className="lens-activity-feed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <div className="lens-activity-feed-header">Recent Activity</div>
        {loading ? (
          <div style={{ padding: '20px 24px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="lens-skeleton" style={{ height: 16, marginBottom: 14, width: `${80 - i * 8}%` }} />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="lens-empty-state">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="24" cy="24" r="18" /><path d="M24 14v10l6 4" /></svg>
            <p className="lens-empty-state-title">No recent activity</p>
            <p className="lens-empty-state-text">Processed documents will show up here</p>
          </div>
        ) : (
          activity.map((row) => (
            <div className="lens-activity-item" key={row.id}>
              <span className={`lens-activity-dot ${row.status}`} />
              <div className="lens-activity-info">
                <div className="lens-activity-name">
                  {row.filename || 'Document'}
                </div>
                <div className="lens-activity-meta">
                  {row.document_type && (
                    <span className={`lens-badge-doc ${row.document_type}`}>
                      {formatDocType(row.document_type)}
                    </span>
                  )}
                  <span className={`lens-badge ${row.status}`}>{row.status}</span>
                  <span>{row.processing_time_ms}ms</span>
                </div>
              </div>
              <span className="lens-activity-time">{timeAgo(row.processed_at)}</span>
            </div>
          ))
        )}
      </motion.div>
    </>
  );
}
