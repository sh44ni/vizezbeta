import { query } from '../lib/db.js';

/**
 * POST /api/db-init — Initialize database tables
 */
export async function handleDbInit(req, res) {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS passport_logs (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        passport_number TEXT,
        nationality TEXT,
        processed_by TEXT,
        processed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    return json(res, 200, { status: 'ok', message: 'Tables created successfully.' });
  } catch (err) {
    console.error('DB init error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
