import { query } from '../lib/db.js';

/**
 * POST /api/passport-logs — Log a processed passport
 */
export async function handlePostPassportLogs(req, res, body) {
  try {
    const { full_name, passport_number, nationality, processed_by } = body;

    if (!full_name) {
      return json(res, 400, { error: 'full_name is required.' });
    }

    await query(
      'INSERT INTO passport_logs (full_name, passport_number, nationality, processed_by) VALUES ($1, $2, $3, $4)',
      [full_name, passport_number || null, nationality || null, processed_by || 'unknown']
    );

    return json(res, 200, { status: 'ok' });
  } catch (err) {
    // If table doesn't exist yet, auto-create it
    if (err.message?.includes('does not exist')) {
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
        // Retry the insert
        const { full_name: fn, passport_number: pn, nationality: nat, processed_by: pb } = body;
        if (fn) {
          await query(
            'INSERT INTO passport_logs (full_name, passport_number, nationality, processed_by) VALUES ($1, $2, $3, $4)',
            [fn, pn || null, nat || null, pb || 'unknown']
          );
        }
        return json(res, 200, { status: 'ok', note: 'Table was auto-created.' });
      } catch (initErr) {
        return json(res, 500, { error: initErr.message });
      }
    }
    console.error('Passport log error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

/**
 * GET /api/passport-logs — Fetch all passport logs (for admin panel)
 */
export async function handleGetPassportLogs(req, res, url) {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const result = await query(
      'SELECT id, full_name, passport_number, nationality, processed_by, processed_at FROM passport_logs ORDER BY processed_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as total FROM passport_logs');
    const total = Number(countResult.rows[0]?.total || 0);

    return json(res, 200, { rows: result.rows, total });
  } catch (err) {
    // If table doesn't exist, return empty
    if (err.message?.includes('does not exist')) {
      return json(res, 200, { rows: [], total: 0 });
    }
    console.error('Passport logs fetch error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
