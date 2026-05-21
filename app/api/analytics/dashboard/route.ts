import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureAuthTables } from '@/lib/ensure-tables';

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || '#7294879348uwi83hsndnsdbe';

function getDateRange(range: string, from?: string, to?: string): { start: string; end: string } {
  const now = new Date();
  const end = to || now.toISOString();
  let start: string;

  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'all':
      start = '2020-01-01T00:00:00Z';
      break;
    case 'custom':
      start = from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureAuthTables();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const userFilter = searchParams.get('user') || undefined;
    const section = searchParams.get('section') || 'all';

    const { start, end } = getDateRange(range, from, to);

    const result: Record<string, unknown> = {};

    // ─── OVERVIEW KPIs ───
    if (section === 'all' || section === 'overview') {
      const [totalUsersResult] = await sql`SELECT COUNT(*)::int as count FROM authorized_emails`;
      const totalUsers = (totalUsersResult as Record<string, unknown>)?.count || 0;

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const [activeTodayResult] = await sql`
        SELECT COUNT(DISTINCT user_email)::int as count FROM user_sessions 
        WHERE started_at >= ${todayStart}
      `;
      const activeToday = (activeTodayResult as Record<string, unknown>)?.count || 0;

      const extractionRows = await sql`
        SELECT COUNT(*)::int as count FROM analytics_events 
        WHERE event_type = 'extraction_completed' AND created_at >= ${start} AND created_at <= ${end}
        ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
      `;
      const totalExtractions = (extractionRows[0] as Record<string, unknown>)?.count || 0;

      // Previous period comparison for trends
      const periodMs = new Date(end).getTime() - new Date(start).getTime();
      const prevStart = new Date(new Date(start).getTime() - periodMs).toISOString();

      const prevExtRows = await sql`
        SELECT COUNT(*)::int as count FROM analytics_events 
        WHERE event_type = 'extraction_completed' AND created_at >= ${prevStart} AND created_at < ${start}
      `;
      const prevExtractions = (prevExtRows[0] as Record<string, unknown>)?.count || 0;

      const [portalsResult] = await sql`SELECT COUNT(*)::int as count FROM portals WHERE status = 'active'`;
      const activePortals = (portalsResult as Record<string, unknown>)?.count || 0;

      const [fieldsResult] = await sql`SELECT COUNT(*)::int as count FROM portal_fields`;
      const totalFields = (fieldsResult as Record<string, unknown>)?.count || 0;

      // Sparkline data: daily active users for last 7 days
      const sparkRows = await sql`
        SELECT DATE(started_at) as day, COUNT(DISTINCT user_email)::int as count
        FROM user_sessions
        WHERE started_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(started_at)
        ORDER BY day
      `;

      result.overview = {
        totalUsers,
        activeToday,
        totalExtractions,
        extractionsTrend: Number(prevExtractions) > 0 
          ? Math.round(((Number(totalExtractions) - Number(prevExtractions)) / Number(prevExtractions)) * 100) 
          : 0,
        activePortals,
        totalFields,
        dauSparkline: sparkRows.map((r: Record<string, unknown>) => Number(r.count)),
      };
    }

    // ─── USER ACTIVITY ───
    if (section === 'all' || section === 'users') {
      // Daily active users over time
      const dauRows = await sql`
        SELECT DATE(started_at) as day, COUNT(DISTINCT user_email)::int as count
        FROM user_sessions
        WHERE started_at >= ${start} AND started_at <= ${end}
        GROUP BY DATE(started_at)
        ORDER BY day
      `;

      // Session duration distribution
      const durationRows = await sql`
        SELECT 
          CASE 
            WHEN duration_seconds < 300 THEN '< 5 min'
            WHEN duration_seconds < 900 THEN '5-15 min'
            WHEN duration_seconds < 1800 THEN '15-30 min'
            WHEN duration_seconds < 3600 THEN '30-60 min'
            ELSE '60+ min'
          END as bucket,
          COUNT(*)::int as count
        FROM user_sessions
        WHERE started_at >= ${start} AND started_at <= ${end}
          AND duration_seconds IS NOT NULL
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
        GROUP BY bucket
        ORDER BY MIN(duration_seconds)
      `;

      // Top users by activity
      const topUsersRows = await sql`
        SELECT user_email, user_name,
          COUNT(*)::int as session_count,
          COALESCE(SUM(duration_seconds), 0)::int as total_seconds,
          COALESCE(AVG(duration_seconds), 0)::int as avg_seconds,
          MAX(last_active_at) as last_active
        FROM user_sessions
        WHERE started_at >= ${start} AND started_at <= ${end}
          AND user_email IS NOT NULL
        GROUP BY user_email, user_name
        ORDER BY total_seconds DESC
        LIMIT 20
      `;

      result.users = {
        dailyActiveUsers: dauRows.map((r: Record<string, unknown>) => ({
          day: r.day,
          count: Number(r.count),
        })),
        sessionDuration: durationRows.map((r: Record<string, unknown>) => ({
          bucket: r.bucket,
          count: Number(r.count),
        })),
        topUsers: topUsersRows,
      };
    }

    // ─── SCREEN TIME / SESSIONS ───
    if (section === 'all' || section === 'screentime') {
      // Peak usage hours heatmap (hour × day-of-week)
      const heatmapRows = await sql`
        SELECT 
          EXTRACT(DOW FROM started_at)::int as day,
          EXTRACT(HOUR FROM started_at)::int as hour,
          COUNT(*)::int as count
        FROM user_sessions
        WHERE started_at >= ${start} AND started_at <= ${end}
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
        GROUP BY day, hour
        ORDER BY day, hour
      `;

      // Per-user screen time detail
      const screenTimeRows = await sql`
        SELECT user_email, user_name,
          COALESCE(SUM(duration_seconds), 0)::int as total_seconds,
          COALESCE(AVG(duration_seconds), 0)::int as avg_session,
          COUNT(*)::int as session_count,
          MAX(last_active_at) as last_active
        FROM user_sessions
        WHERE started_at >= ${start} AND started_at <= ${end}
          AND user_email IS NOT NULL
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
        GROUP BY user_email, user_name
        ORDER BY total_seconds DESC
      `;

      // Overall session stats
      const [sessionStats] = await sql`
        SELECT 
          COALESCE(AVG(duration_seconds), 0)::int as avg_duration,
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds), 0)::int as median_duration,
          COUNT(*)::int as total_sessions
        FROM user_sessions
        WHERE started_at >= ${start} AND started_at <= ${end}
          AND duration_seconds IS NOT NULL
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
      `;

      result.screentime = {
        heatmap: heatmapRows.map((r: Record<string, unknown>) => ({
          day: Number(r.day),
          hour: Number(r.hour),
          value: Number(r.count),
        })),
        perUser: screenTimeRows,
        stats: sessionStats || { avg_duration: 0, median_duration: 0, total_sessions: 0 },
      };
    }

    // ─── EXTRACTION ANALYTICS ───
    if (section === 'all' || section === 'extractions') {
      // Extractions per day (success vs fail)
      const extractionsByDay = await sql`
        SELECT DATE(created_at) as day,
          COUNT(*) FILTER (WHERE event_type = 'extraction_completed')::int as success,
          COUNT(*) FILTER (WHERE event_type = 'extraction_failed')::int as failed
        FROM analytics_events
        WHERE event_type IN ('extraction_completed', 'extraction_failed')
          AND created_at >= ${start} AND created_at <= ${end}
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
        GROUP BY DATE(created_at)
        ORDER BY day
      `;

      // MRZ quality distribution from applicants
      const mrzRows = await sql`
        SELECT COALESCE(mrz_quality, 'UNKNOWN') as quality, COUNT(*)::int as count
        FROM applicants
        WHERE created_at >= ${start} AND created_at <= ${end}
          ${userFilter ? sql`AND processed_by = ${userFilter}` : sql``}
        GROUP BY quality
        ORDER BY count DESC
      `;

      // Avg processing time (from metadata)
      const avgTimeRows = await sql`
        SELECT 
          COALESCE(AVG((metadata->>'processing_time_ms')::numeric), 0)::int as avg_time,
          COUNT(*)::int as total
        FROM analytics_events
        WHERE event_type = 'extraction_completed'
          AND created_at >= ${start} AND created_at <= ${end}
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
      `;

      // Success rate
      const [successRate] = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE event_type = 'extraction_completed')::int as success,
          COUNT(*) FILTER (WHERE event_type = 'extraction_failed')::int as failed
        FROM analytics_events
        WHERE event_type IN ('extraction_completed', 'extraction_failed')
          AND created_at >= ${start} AND created_at <= ${end}
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
      `;

      const successCount = Number((successRate as Record<string, unknown>)?.success || 0);
      const failedCount = Number((successRate as Record<string, unknown>)?.failed || 0);
      const total = successCount + failedCount;

      result.extractions = {
        byDay: extractionsByDay.map((r: Record<string, unknown>) => ({
          day: r.day,
          success: Number(r.success),
          failed: Number(r.failed),
        })),
        mrzQuality: mrzRows.map((r: Record<string, unknown>) => ({
          quality: r.quality,
          count: Number(r.count),
        })),
        avgProcessingTime: (avgTimeRows[0] as Record<string, unknown>)?.avg_time || 0,
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 100,
        totalExtractions: total,
      };
    }

    // ─── PORTAL ANALYTICS ───
    if (section === 'all' || section === 'portals') {
      // Portal usage (from analytics events)
      const portalUsage = await sql`
        SELECT metadata->>'portal_name' as portal_name,
          COUNT(*)::int as fill_count
        FROM analytics_events
        WHERE event_type = 'portal_fill'
          AND created_at >= ${start} AND created_at <= ${end}
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
        GROUP BY portal_name
        ORDER BY fill_count DESC
        LIMIT 10
      `;

      // Field confidence distribution
      const confidenceRows = await sql`
        SELECT 
          CASE 
            WHEN confidence >= 0.9 THEN 'High (90%+)'
            WHEN confidence >= 0.7 THEN 'Medium (70-90%)'
            WHEN confidence >= 0.5 THEN 'Low (50-70%)'
            ELSE 'Very Low (<50%)'
          END as level,
          COUNT(*)::int as count
        FROM portal_fields
        GROUP BY level
        ORDER BY MIN(confidence) DESC
      `;

      // Portal list with stats
      const portalList = await sql`
        SELECT p.id, p.name, p.url_pattern, p.status, p.created_at, p.updated_at,
          COUNT(pf.id)::int as field_count
        FROM portals p
        LEFT JOIN portal_fields pf ON pf.portal_id = p.id
        GROUP BY p.id, p.name, p.url_pattern, p.status, p.created_at, p.updated_at
        ORDER BY p.updated_at DESC
      `;

      result.portals = {
        usage: portalUsage.map((r: Record<string, unknown>) => ({
          name: r.portal_name || 'Unknown',
          count: Number(r.fill_count),
        })),
        confidence: confidenceRows.map((r: Record<string, unknown>) => ({
          level: r.level,
          count: Number(r.count),
        })),
        list: portalList,
      };
    }

    // ─── GROWTH & FUNNEL ───
    if (section === 'all' || section === 'growth') {
      // New users over time
      const userGrowth = await sql`
        SELECT DATE(created_at) as day, COUNT(*)::int as count
        FROM authorized_emails
        WHERE created_at >= ${start} AND created_at <= ${end}
        GROUP BY DATE(created_at)
        ORDER BY day
      `;

      // Early access funnel
      const [funnelStats] = await sql`
        SELECT 
          COUNT(*)::int as total_requests,
          COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending
        FROM early_access_requests
      `;

      const [activatedCount] = await sql`
        SELECT COUNT(DISTINCT u.email)::int as count
        FROM users u
        INNER JOIN authorized_emails ae ON u.email = ae.email
        WHERE u.last_login_at IS NOT NULL
      `;

      result.growth = {
        userGrowth: userGrowth.map((r: Record<string, unknown>) => ({
          day: r.day,
          count: Number(r.count),
        })),
        funnel: {
          requests: Number((funnelStats as Record<string, unknown>)?.total_requests || 0),
          approved: Number((funnelStats as Record<string, unknown>)?.approved || 0),
          rejected: Number((funnelStats as Record<string, unknown>)?.rejected || 0),
          pending: Number((funnelStats as Record<string, unknown>)?.pending || 0),
          activated: Number((activatedCount as Record<string, unknown>)?.count || 0),
        },
      };
    }

    // ─── RECENT ACTIVITY ───
    if (section === 'all' || section === 'activity') {
      const recentEvents = await sql`
        SELECT id, event_type, user_email, user_name, metadata, created_at
        FROM analytics_events
        WHERE created_at >= ${start} AND created_at <= ${end}
          ${userFilter ? sql`AND user_email = ${userFilter}` : sql``}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      result.activity = {
        recent: recentEvents.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          type: r.event_type,
          user: r.user_name || r.user_email || 'System',
          message: formatEventMessage(String(r.event_type), r.metadata as Record<string, unknown>),
          detail: r.user_email,
          timestamp: r.created_at,
        })),
      };
    }

    // ─── LIST OF USERS (for filter dropdown) ───
    const allUsers = await sql`
      SELECT DISTINCT user_email as email, user_name as name
      FROM user_sessions
      WHERE user_email IS NOT NULL
      ORDER BY user_name
    `;
    result.availableUsers = allUsers;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics', details: String(error) }, { status: 500 });
  }
}

function formatEventMessage(eventType: string, metadata: Record<string, unknown> | null): string {
  switch (eventType) {
    case 'login': return 'Logged in';
    case 'logout': return 'Logged out';
    case 'page_view': return `Viewed ${metadata?.page || 'page'}`;
    case 'extraction_completed': return `Extracted passport data${metadata?.passport_name ? ` for ${metadata.passport_name}` : ''}`;
    case 'extraction_failed': return `Extraction failed${metadata?.error ? `: ${metadata.error}` : ''}`;
    case 'extraction_started': return 'Started extraction';
    case 'letter_generated': return `Generated letter${metadata?.batch_size ? ` (${metadata.batch_size} entries)` : ''}`;
    case 'portal_created': return `Created portal "${metadata?.portal_name || ''}"`;
    case 'portal_fill': return `Filled portal "${metadata?.portal_name || ''}"`;
    case 'portal_updated': return `Updated portal "${metadata?.portal_name || ''}"`;
    case 'error': return `Error: ${metadata?.message || 'Unknown error'}`;
    default: return eventType.replace(/_/g, ' ');
  }
}
