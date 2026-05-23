import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { query } from '@/lib/db';

const ALLOWED_SORT_COLUMNS = [
  'processed_at',
  'processing_time_ms',
  'filename',
  'document_type',
  'status',
  'quality_improvement',
  'file_size_bytes',
];

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
  const offset = (page - 1) * limit;

  let sortBy = url.searchParams.get('sort_by') || 'processed_at';
  if (!ALLOWED_SORT_COLUMNS.includes(sortBy)) sortBy = 'processed_at';
  const sortDir = url.searchParams.get('sort_dir')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

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
    const countResult = await query(
      `SELECT COUNT(*) as total FROM lens_processing_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    const dataResult = await query(
      `SELECT * FROM lens_processing_logs ${whereClause} ORDER BY ${sortBy} ${sortDir} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      rows: dataResult.rows,
      total,
      page,
      limit,
      total_pages: totalPages,
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
