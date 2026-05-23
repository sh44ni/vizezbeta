import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // All-time totals
    const totalsResult = await query(`
      SELECT
        COUNT(*) as total_processed,
        COUNT(*) FILTER (WHERE status = 'success') as total_successful,
        COUNT(*) FILTER (WHERE status != 'success') as total_failed,
        ROUND(AVG(processing_time_ms)::numeric, 2) as avg_processing_time_ms,
        ROUND(AVG(quality_improvement)::numeric, 4) as avg_quality_improvement
      FROM lens_processing_logs
    `);

    const totals = totalsResult.rows[0];
    const totalProcessed = parseInt(totals.total_processed, 10);
    const totalSuccessful = parseInt(totals.total_successful, 10);

    // Today's count
    const todayResult = await query(`
      SELECT COUNT(*) as total_today
      FROM lens_processing_logs
      WHERE processed_at >= CURRENT_DATE
    `);

    // This week count
    const weekResult = await query(`
      SELECT COUNT(*) as total_this_week
      FROM lens_processing_logs
      WHERE processed_at >= date_trunc('week', CURRENT_DATE)
    `);

    // This month count
    const monthResult = await query(`
      SELECT COUNT(*) as total_this_month
      FROM lens_processing_logs
      WHERE processed_at >= date_trunc('month', CURRENT_DATE)
    `);

    // Documents by type
    const typeResult = await query(`
      SELECT document_type, COUNT(*) as count
      FROM lens_processing_logs
      WHERE document_type IS NOT NULL
      GROUP BY document_type
    `);

    const documentsByType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      documentsByType[row.document_type] = parseInt(row.count, 10);
    }

    // Recent errors
    const errorsResult = await query(`
      SELECT id, request_id, filename, error_message, processed_at
      FROM lens_processing_logs
      WHERE status != 'success'
      ORDER BY processed_at DESC
      LIMIT 5
    `);

    const successRate = totalProcessed > 0
      ? parseFloat(((totalSuccessful / totalProcessed) * 100).toFixed(2))
      : 100;

    return NextResponse.json({
      total_processed: totalProcessed,
      total_today: parseInt(todayResult.rows[0].total_today, 10),
      total_this_week: parseInt(weekResult.rows[0].total_this_week, 10),
      total_this_month: parseInt(monthResult.rows[0].total_this_month, 10),
      success_rate: successRate,
      avg_processing_time_ms: parseFloat(totals.avg_processing_time_ms) || 0,
      avg_quality_improvement: parseFloat(totals.avg_quality_improvement) || 0,
      documents_by_type: documentsByType,
      recent_errors: errorsResult.rows,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
