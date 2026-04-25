import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// POST: Log a processed passport
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, passport_number, nationality, processed_by } = body;

    if (!full_name) {
      return NextResponse.json({ error: 'full_name is required.' }, { status: 400 });
    }

    await sql`
      INSERT INTO passport_logs (full_name, passport_number, nationality, processed_by)
      VALUES (${full_name}, ${passport_number || null}, ${nationality || null}, ${processed_by || 'unknown'})
    `;

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const err = error as Error;
    // If table doesn't exist yet, auto-create it
    if (err.message?.includes('does not exist')) {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS passport_logs (
            id SERIAL PRIMARY KEY,
            full_name TEXT NOT NULL,
            passport_number TEXT,
            nationality TEXT,
            processed_by TEXT,
            processed_at TIMESTAMPTZ DEFAULT NOW()
          )
        `;
        // Retry the insert
        const body2 = await req.clone().json().catch(() => ({}));
        const { full_name: fn, passport_number: pn, nationality: nat, processed_by: pb } = body2 as Record<string, string>;
        if (fn) {
          await sql`
            INSERT INTO passport_logs (full_name, passport_number, nationality, processed_by)
            VALUES (${fn}, ${pn || null}, ${nat || null}, ${pb || 'unknown'})
          `;
        }
        return NextResponse.json({ status: 'ok', note: 'Table was auto-created.' });
      } catch (initErr) {
        return NextResponse.json({ error: (initErr as Error).message }, { status: 500 });
      }
    }
    console.error('Passport log error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Fetch all passport logs (for admin panel)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const rows = await sql`
      SELECT id, full_name, passport_number, nationality, processed_by, processed_at
      FROM passport_logs
      ORDER BY processed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`SELECT COUNT(*) as total FROM passport_logs`;
    const total = Number(countResult[0]?.total || 0);

    return NextResponse.json({ rows, total });
  } catch (error) {
    const err = error as Error;
    // If table doesn't exist, return empty
    if (err.message?.includes('does not exist')) {
      return NextResponse.json({ rows: [], total: 0 });
    }
    console.error('Passport logs fetch error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
