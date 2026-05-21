import { query } from '../lib/db.js';

/**
 * GET /api/users — List all users (no passwords)
 */
export async function handleGetUsers(req, res) {
  try {
    const result = await query(
      'SELECT id, name, username, role, created_at FROM users ORDER BY id ASC'
    );
    return json(res, 200, { users: result.rows });
  } catch (err) {
    console.error('Users fetch error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

/**
 * POST /api/users — Login, create, or delete user
 */
export async function handlePostUsers(req, res, body) {
  try {
    const { action } = body;

    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return json(res, 400, { error: 'Username and password required.' });
      }
      const result = await query(
        'SELECT id, name, username, role FROM users WHERE username = $1 AND password = $2 LIMIT 1',
        [username, password]
      );
      if (result.rows.length === 0) {
        return json(res, 401, { error: 'Invalid credentials.' });
      }
      return json(res, 200, { user: result.rows[0] });
    }

    if (action === 'create') {
      const { name, username, password } = body;
      if (!name || !username || !password) {
        return json(res, 400, { error: 'All fields are required.' });
      }
      // Check if username already exists
      const existing = await query(
        'SELECT id FROM users WHERE username = $1 LIMIT 1',
        [username]
      );
      if (existing.rows.length > 0) {
        return json(res, 409, { error: 'Username already exists.' });
      }
      await query(
        "INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, 'user')",
        [name, username, password]
      );
      return json(res, 200, { status: 'ok' });
    }

    if (action === 'delete') {
      const { username } = body;
      if (!username || username === 'zee') {
        return json(res, 400, { error: 'Cannot delete this user.' });
      }
      await query(
        "DELETE FROM users WHERE username = $1 AND role != 'admin'",
        [username]
      );
      return json(res, 200, { status: 'ok' });
    }

    return json(res, 400, { error: 'Unknown action.' });
  } catch (err) {
    console.error('Users API error:', err.message);
    return json(res, 500, { error: err.message });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
