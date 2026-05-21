import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureAuthTables } from '@/lib/ensure-tables';

export async function POST(req: NextRequest) {
  try {
    await ensureAuthTables();
    const { email, name, company, message } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    // Check for duplicate pending request
    const existing = await sql`
      SELECT id FROM early_access_requests 
      WHERE email = ${normalized} AND status = 'pending'
      LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'You already have a pending request' }, { status: 409 });
    }

    await sql`
      INSERT INTO early_access_requests (email, name, company, message)
      VALUES (${normalized}, ${name || null}, ${company || null}, ${message || null})
    `;

    return NextResponse.json({ status: 'ok', message: 'Request submitted successfully' });
  } catch (error) {
    console.error('Early access request error:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
