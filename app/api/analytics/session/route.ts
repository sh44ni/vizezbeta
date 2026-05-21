import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureAuthTables } from '@/lib/ensure-tables';

// POST — Start a new session
export async function POST(req: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { user_email, user_name, session_token } = body;

    if (!user_email || !session_token) {
      return NextResponse.json({ error: 'user_email and session_token are required' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || '';

    await sql`
      INSERT INTO user_sessions (user_email, user_name, session_token, ip_address, user_agent)
      VALUES (${user_email}, ${user_name || null}, ${session_token}, ${ip}, ${ua})
      ON CONFLICT (session_token) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}

// PUT — Heartbeat (update last_active_at and optionally add page)
export async function PUT(req: NextRequest) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { session_token, page } = body;

    if (!session_token) {
      return NextResponse.json({ error: 'session_token is required' }, { status: 400 });
    }

    if (page) {
      await sql`
        UPDATE user_sessions
        SET last_active_at = NOW(),
            pages_visited = COALESCE(pages_visited, '[]'::jsonb) || ${JSON.stringify([{ page, at: new Date().toISOString() }])}::jsonb
        WHERE session_token = ${session_token} AND ended_at IS NULL
      `;
    } else {
      await sql`
        UPDATE user_sessions
        SET last_active_at = NOW()
        WHERE session_token = ${session_token} AND ended_at IS NULL
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session heartbeat error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// DELETE — End session
export async function DELETE(req: NextRequest) {
  try {
    await ensureAuthTables();
    const { searchParams } = new URL(req.url);
    const session_token = searchParams.get('token');

    if (!session_token) {
      return NextResponse.json({ error: 'token query param is required' }, { status: 400 });
    }

    await sql`
      UPDATE user_sessions
      SET ended_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
      WHERE session_token = ${session_token} AND ended_at IS NULL
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session end error:', error);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
