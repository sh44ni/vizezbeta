import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vizez',
});

// Log connection status
pool.on('connect', () => {
  console.log('[db] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

/**
 * Run a parameterized query.
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {any[]} params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Auto-create required tables if they don't exist.
 */
export async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS passport_logs (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      passport_number TEXT,
      nationality TEXT,
      processed_by TEXT,
      processed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applicants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      passport_number TEXT,
      nationality TEXT,
      passport_data JSONB,
      work_permit_data JSONB,
      field_verification JSONB,
      mrz_quality TEXT,
      processed_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url_pattern TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      portal_type TEXT DEFAULT 'visa',
      pre_actions JSONB DEFAULT '[]',
      post_actions JSONB DEFAULT '[]',
      phase_groups JSONB DEFAULT '[]',
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migration: add portal_type column to existing portals tables
  await pool.query(`ALTER TABLE portals ADD COLUMN IF NOT EXISTS portal_type TEXT DEFAULT 'visa'`);
  await pool.query(`ALTER TABLE portals ADD COLUMN IF NOT EXISTS document_config JSONB DEFAULT '[]'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_fields (
      id SERIAL PRIMARY KEY,
      portal_id TEXT REFERENCES portals(id) ON DELETE CASCADE,
      portal_selector TEXT NOT NULL,
      portal_label TEXT,
      field_type TEXT DEFAULT 'text',
      source_key TEXT,
      fill_method TEXT DEFAULT 'value',
      default_value TEXT,
      option_map JSONB,
      transform TEXT,
      required BOOLEAN DEFAULT false,
      sort_order INT DEFAULT 0,
      review_status TEXT DEFAULT 'pending',
      confidence REAL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS authorized_emails (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      added_by TEXT DEFAULT 'super_admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS early_access_requests (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      company TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS addon_access (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      addon_id TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      granted_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_email, addon_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS addon_requests (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      user_name TEXT,
      addon_id TEXT NOT NULL,
      addon_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT');

  console.log('[db] Tables ensured (users, passport_logs, applicants, portals, portal_fields, authorized_emails, otp_codes, early_access_requests, addon_access, addon_requests)');
}

export default pool;
