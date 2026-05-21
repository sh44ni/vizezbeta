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
    
    initialized = true;
  })();
  
  return initPromise;
}
