import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl;
  const status = url.searchParams.get('status');
  const documentType = url.searchParams.get('document_type');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');
  const search = url.searchParams.get('search');
  const processedBy = url.searchParams.get('processed_by');

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  if (documentType) {
    conditions.push(`document_type = $${paramIndex++}`);
    params.push(documentType);
  }
  if (dateFrom) {
    conditions.push(`processed_at >= $${paramIndex++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`processed_at <= $${paramIndex++}`);
    params.push(dateTo);
  }
  if (search) {
    conditions.push(`(filename ILIKE $${paramIndex} OR request_id ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (processedBy) {
    conditions.push(`processed_by = $${paramIndex++}`);
    params.push(processedBy);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await query(
      `SELECT * FROM lens_processing_logs ${whereClause} ORDER BY processed_at DESC`,
      params
    );

    const rows = result.rows;
    if (rows.length === 0) {
      return new NextResponse('No data found', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    const columns = Object.keys(rows[0]);
    const csvHeader = columns.join(',');
    const csvRows = rows.map((row: Record<string, unknown>) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape CSV values that contain commas, quotes, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );

    const csv = [csvHeader, ...csvRows].join('\n');
    const today = new Date().toISOString().split('T')[0];

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=lens-logs-${today}.csv`,
      },
    });
  } catch (err) {
    console.error('Error exporting logs:', err);
    return NextResponse.json({ error: 'Failed to export logs' }, { status: 500 });
  }
}
