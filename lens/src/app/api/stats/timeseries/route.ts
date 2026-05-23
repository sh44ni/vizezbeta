import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const range = req.nextUrl.searchParams.get('range') || '7d';

  let interval: string;
  let bucket: string;

  switch (range) {
    case '24h':
      interval = "24 hours";
      bucket = "1 hour";
      break;
    case '30d':
      interval = "30 days";
      bucket = "1 day";
      break;
    case '7d':
    default:
      interval = "7 days";
      bucket = "1 day";
      break;
  }

  try {
    const result = await query(`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${bucket === '1 hour' ? "'hour'" : "'day'"}, NOW() - INTERVAL '${interval}'),
          date_trunc(${bucket === '1 hour' ? "'hour'" : "'day'"}, NOW()),
          INTERVAL '${bucket}'
        ) AS bucket_time
      )
      SELECT
        b.bucket_time AS timestamp,
        COALESCE(COUNT(l.id), 0) AS count,
        COALESCE(ROUND(AVG(l.processing_time_ms)::numeric, 2), 0) AS avg_time_ms,
        COALESCE(COUNT(l.id) FILTER (WHERE l.status = 'success'), 0) AS success_count,
        COALESCE(COUNT(l.id) FILTER (WHERE l.status != 'success'), 0) AS error_count
      FROM buckets b
      LEFT JOIN lens_processing_logs l ON
        date_trunc(${bucket === '1 hour' ? "'hour'" : "'day'"}, l.processed_at) = b.bucket_time
      GROUP BY b.bucket_time
      ORDER BY b.bucket_time ASC
    `);

    return NextResponse.json({
      range,
      data: result.rows.map((row) => ({
        timestamp: row.timestamp,
        count: parseInt(row.count, 10),
        avg_time_ms: parseFloat(row.avg_time_ms) || 0,
        success_count: parseInt(row.success_count, 10),
        error_count: parseInt(row.error_count, 10),
      })),
    });
  } catch (err) {
    console.error('Error fetching timeseries:', err);
    return NextResponse.json({ error: 'Failed to fetch timeseries' }, { status: 500 });
  }
}
