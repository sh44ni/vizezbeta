import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vizez',
});

let tablesEnsured = false;

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  if (!tablesEnsured) {
    await ensureLensTables();
    tablesEnsured = true;
  }
  return pool.query(text, params);
}

export async function ensureLensTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS lens_processing_logs (
        id SERIAL PRIMARY KEY,
        request_id TEXT UNIQUE NOT NULL,
        filename TEXT,
        file_size_bytes INTEGER,
        source_format TEXT,
        document_type TEXT,
        classification_confidence REAL,
        crop_applied BOOLEAN DEFAULT false,
        crop_method TEXT,
        crop_confidence REAL,
        original_quality_score REAL,
        enhanced_quality_score REAL,
        quality_improvement REAL,
        ready_for_extraction BOOLEAN DEFAULT false,
        processing_time_ms INTEGER,
        processed_by TEXT DEFAULT 'api',
        status TEXT DEFAULT 'success',
        error_message TEXT,
        processed_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lens_api_keys (
        id SERIAL PRIMARY KEY,
        key_hash TEXT UNIQUE NOT NULL,
        key_prefix TEXT NOT NULL,
        name TEXT DEFAULT 'Default',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS lens_daily_stats (
        id SERIAL PRIMARY KEY,
        stat_date DATE NOT NULL UNIQUE,
        total_processed INTEGER DEFAULT 0,
        total_successful INTEGER DEFAULT 0,
        total_failed INTEGER DEFAULT 0,
        avg_processing_time_ms REAL,
        avg_quality_improvement REAL,
        documents_by_type JSONB DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_lens_logs_processed_at ON lens_processing_logs(processed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_lens_logs_status ON lens_processing_logs(status);
      CREATE INDEX IF NOT EXISTS idx_lens_logs_doc_type ON lens_processing_logs(document_type);
    `);
  } finally {
    client.release();
  }
}
