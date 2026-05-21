import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureAuthTables } from '@/lib/ensure-tables';

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
    await ensureAuthTables();

    const totalRows = await sql`SELECT COUNT(*)::int AS count FROM early_access_requests`;
    const pendingRows = await sql`SELECT COUNT(*)::int AS count FROM early_access_requests WHERE status = 'pending'`;
    const approvedRows = await sql`SELECT COUNT(*)::int AS count FROM early_access_requests WHERE status = 'approved'`;
    const rejectedRows = await sql`SELECT COUNT(*)::int AS count FROM early_access_requests WHERE status = 'rejected'`;
    const emailsRows = await sql`SELECT COUNT(*)::int AS count FROM authorized_emails`;
    const usersRows = await sql`SELECT COUNT(*)::int AS count FROM users`;

    return NextResponse.json({
      totalRequests: totalRows[0].count,
      pending: pendingRows[0].count,
      approved: approvedRows[0].count,
      rejected: rejectedRows[0].count,
      authorizedEmails: emailsRows[0].count,
      activeUsers: usersRows[0].count,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
