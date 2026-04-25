import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// POST: Initialize the passport_logs table
export async function POST() {
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
    return NextResponse.json({ status: 'ok', message: 'Table created successfully.' });
  } catch (error) {
    const err = error as Error;
    console.error('DB init error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
