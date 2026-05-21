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
    const rows = await sql`SELECT * FROM early_access_requests ORDER BY created_at DESC`;
    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error('Early access list error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAuthTables();
    const { id, action } = await req.json();

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Valid id and action (approve/reject) required' }, { status: 400 });
    }

    if (action === 'approve') {
      // Get request details
      const rows = await sql`SELECT email, name FROM early_access_requests WHERE id = ${id} LIMIT 1`;
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      const { email, name } = rows[0];

      // Update status
      await sql`UPDATE early_access_requests SET status = 'approved', reviewed_at = NOW() WHERE id = ${id}`;

      // Add to authorized emails
      await sql`
        INSERT INTO authorized_emails (email, name, added_by)
        VALUES (${email}, ${name}, 'super_admin')
        ON CONFLICT (email) DO NOTHING
      `;

      return NextResponse.json({ status: 'ok', message: 'Request approved and email authorized' });
    } else {
      // Reject
      await sql`UPDATE early_access_requests SET status = 'rejected', reviewed_at = NOW() WHERE id = ${id}`;
      return NextResponse.json({ status: 'ok', message: 'Request rejected' });
    }
  } catch (error) {
    console.error('Early access action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
