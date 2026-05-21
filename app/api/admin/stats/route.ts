import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || '#7294879348uwi83hsndnsdbe';

function validateAdmin(req: NextRequest) {
  const key = req.headers.get('X-Admin-Key');
  return key === ADMIN_KEY;
}

export async function GET(req: NextRequest) {
  if (!validateAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Single query instead of 6 sequential round trips
    const rows = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM early_access_requests) AS total,
        (SELECT COUNT(*)::int FROM early_access_requests WHERE status = 'pending') AS pending,
        (SELECT COUNT(*)::int FROM early_access_requests WHERE status = 'approved') AS approved,
        (SELECT COUNT(*)::int FROM early_access_requests WHERE status = 'rejected') AS rejected,
        (SELECT COUNT(*)::int FROM authorized_emails) AS emails,
        (SELECT COUNT(*)::int FROM users) AS users
    `;

    const r = rows[0];
    return NextResponse.json({
      totalRequests: r.total,
      pending: r.pending,
      approved: r.approved,
      rejected: r.rejected,
      authorizedEmails: r.emails,
      activeUsers: r.users,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
