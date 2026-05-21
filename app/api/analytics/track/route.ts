import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureAuthTables } from '@/lib/ensure-tables';

const ALLOWED_EVENTS = [
  'login', 'logout', 'page_view', 'extraction_started', 'extraction_completed',
  'extraction_failed', 'letter_generated', 'portal_created', 'portal_fill',
  'portal_updated', 'portal_deleted', 'error', 'session_start', 'session_end'
];

export async function POST(req: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { event_type, user_email, user_name, metadata = {} } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    if (!ALLOWED_EVENTS.includes(event_type)) {
      return NextResponse.json({ error: `Invalid event_type. Allowed: ${ALLOWED_EVENTS.join(', ')}` }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || '';

    await sql`
      INSERT INTO analytics_events (event_type, user_email, user_name, metadata, ip_address, user_agent)
      VALUES (${event_type}, ${user_email || null}, ${user_name || null}, ${JSON.stringify(metadata)}, ${ip}, ${ua})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}
