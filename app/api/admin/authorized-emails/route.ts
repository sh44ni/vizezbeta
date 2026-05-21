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
    const rows = await sql`SELECT * FROM authorized_emails ORDER BY created_at DESC`;
    return NextResponse.json({ emails: rows });
  } catch (error) {
    console.error('Authorized emails list error:', error);
    return NextResponse.json({ error: 'Failed to fetch authorized emails' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAuthTables();
    const { email, name } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    await sql`
      INSERT INTO authorized_emails (email, name, added_by)
      VALUES (${normalized}, ${name || null}, 'super_admin')
      ON CONFLICT (email) DO NOTHING
    `;

    return NextResponse.json({ status: 'ok', message: 'Email authorized' });
  } catch (error) {
    console.error('Add authorized email error:', error);
    return NextResponse.json({ error: 'Failed to add email' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!validateAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAuthTables();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await sql`DELETE FROM authorized_emails WHERE id = ${id}`;
    return NextResponse.json({ status: 'ok', message: 'Email removed' });
  } catch (error) {
    console.error('Remove authorized email error:', error);
    return NextResponse.json({ error: 'Failed to remove email' }, { status: 500 });
  }
}
