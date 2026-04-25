import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Auto-create users table + seed admin if needed
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Seed admin if not exists
  const existing = await sql`SELECT id FROM users WHERE username = 'zee' LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO users (name, username, password, role)
      VALUES ('Zeeshan', 'zee', 'zee431#', 'admin')
    `;
  }
}

// GET: Fetch all users (no passwords returned)
export async function GET() {
  try {
    await ensureTable();
    const rows = await sql`
      SELECT id, name, username, role, created_at FROM users ORDER BY id ASC
    `;
    return NextResponse.json({ users: rows });
  } catch (error) {
    const err = error as Error;
    console.error('Users fetch error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Login or create user
export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password required.' }, { status: 400 });
      }
      const rows = await sql`
        SELECT id, name, username, role FROM users
        WHERE username = ${username} AND password = ${password}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
      }
      return NextResponse.json({ user: rows[0] });
    }

    if (action === 'create') {
      const { name, username, password } = body;
      if (!name || !username || !password) {
        return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
      }
      // Check if username already exists
      const existing = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
      }
      await sql`
        INSERT INTO users (name, username, password, role)
        VALUES (${name}, ${username}, ${password}, 'user')
      `;
      return NextResponse.json({ status: 'ok' });
    }

    if (action === 'delete') {
      const { username } = body;
      if (!username || username === 'zee') {
        return NextResponse.json({ error: 'Cannot delete this user.' }, { status: 400 });
      }
      await sql`DELETE FROM users WHERE username = ${username} AND role != 'admin'`;
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    console.error('Users API error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
