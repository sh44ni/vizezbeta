import sql from './db';

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureAuthTables() {
  if (initialized) return;
  
  // Prevent concurrent initialization race condition
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS authorized_emails (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          added_by TEXT DEFAULT 'super_admin',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
    } catch (e: unknown) {
      // Ignore duplicate key errors (race condition with concurrent requests)
      if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e;
    }
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS otp_codes (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e;
    }
    
    try {
      await sql`
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
      `;
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e;
    }
    
    // Add email column to users if not exists
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
    } catch {}

    // Add last_login_at column to users
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`;
    } catch {}

    // Analytics events table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id SERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          user_email TEXT,
          user_name TEXT,
          metadata JSONB DEFAULT '{}',
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_email)`;
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e;
    }

    // User sessions table for screen time tracking
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          user_email TEXT NOT NULL,
          user_name TEXT,
          session_token TEXT UNIQUE NOT NULL,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          last_active_at TIMESTAMPTZ DEFAULT NOW(),
          ended_at TIMESTAMPTZ,
          duration_seconds INTEGER,
          ip_address TEXT,
          user_agent TEXT,
          pages_visited JSONB DEFAULT '[]'
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_email)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_sessions_started ON user_sessions(started_at)`;
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message?.includes('already exists')) throw e;
    }

    initialized = true;
  })();
  
  return initPromise;
}
