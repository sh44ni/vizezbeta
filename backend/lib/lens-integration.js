import { query } from './db.js';

/**
 * VizEz Lens Integration — Push processing logs to lens_processing_logs table.
 * 
 * This module is imported by enhance-preview.js and extract-manual.js
 * to log every document processing event for the Lens dashboard.
 */

/**
 * Log a processing event to the Lens processing logs table.
 * Non-blocking — errors are caught and logged, never thrown to the caller.
 */
export async function logToLens({
  requestId,
  filename,
  fileSizeBytes,
  sourceFormat,
  documentType,
  classificationConfidence,
  cropApplied,
  cropMethod,
  cropConfidence,
  originalQualityScore,
  enhancedQualityScore,
  qualityImprovement,
  readyForExtraction,
  processingTimeMs,
  processedBy = 'system',
  status = 'success',
  errorMessage = null,
}) {
  try {
    // Ensure the table exists (idempotent)
    await query(`
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
      )
    `);

    await query(
      `INSERT INTO lens_processing_logs 
       (request_id, filename, file_size_bytes, source_format, document_type, 
        classification_confidence, crop_applied, crop_method, crop_confidence,
        original_quality_score, enhanced_quality_score, quality_improvement,
        ready_for_extraction, processing_time_ms, processed_by, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (request_id) DO NOTHING`,
      [
        requestId,
        filename || 'unknown',
        fileSizeBytes || 0,
        sourceFormat || 'unknown',
        documentType || 'unknown',
        classificationConfidence || 0,
        cropApplied || false,
        cropMethod || null,
        cropConfidence || 0,
        originalQualityScore || 0,
        enhancedQualityScore || 0,
        qualityImprovement || 0,
        readyForExtraction || false,
        processingTimeMs || 0,
        processedBy,
        status,
        errorMessage,
      ]
    );

    // Update daily stats (upsert)
    await query(`
      INSERT INTO lens_daily_stats (stat_date, total_processed, total_successful, total_failed, avg_processing_time_ms, avg_quality_improvement, documents_by_type)
      VALUES (CURRENT_DATE, 1, $1, $2, $3, $4, $5::jsonb)
      ON CONFLICT (stat_date) DO UPDATE SET
        total_processed = lens_daily_stats.total_processed + 1,
        total_successful = lens_daily_stats.total_successful + $1,
        total_failed = lens_daily_stats.total_failed + $2,
        avg_processing_time_ms = (lens_daily_stats.avg_processing_time_ms * lens_daily_stats.total_processed + $3) / (lens_daily_stats.total_processed + 1),
        avg_quality_improvement = (lens_daily_stats.avg_quality_improvement * lens_daily_stats.total_processed + $4) / (lens_daily_stats.total_processed + 1),
        documents_by_type = (
          SELECT jsonb_object_agg(key, COALESCE((lens_daily_stats.documents_by_type->>key)::int, 0) + (vals->>key)::int)
          FROM jsonb_each_text($5::jsonb) AS vals(key, value)
        ),
        updated_at = NOW()
    `, [
      status === 'success' ? 1 : 0,
      status !== 'success' ? 1 : 0,
      processingTimeMs || 0,
      qualityImprovement || 0,
      JSON.stringify({ [documentType || 'unknown']: 1 }),
    ]);

    console.log(`[lens] Logged processing: ${requestId} (${documentType}, ${processingTimeMs}ms, ${status})`);
  } catch (err) {
    // Non-blocking — just log the error
    console.error(`[lens] Failed to log processing event:`, err.message);
  }
}

/**
 * Ensure Lens-specific tables exist.
 * Called once on backend startup.
 */
export async function ensureLensTables() {
  try {
    await query(`
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
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS lens_api_keys (
        id SERIAL PRIMARY KEY,
        key_hash TEXT UNIQUE NOT NULL,
        key_prefix TEXT NOT NULL,
        name TEXT DEFAULT 'Default',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS lens_daily_stats (
        id SERIAL PRIMARY KEY,
        stat_date DATE NOT NULL UNIQUE,
        total_processed INTEGER DEFAULT 0,
        total_successful INTEGER DEFAULT 0,
        total_failed INTEGER DEFAULT 0,
        avg_processing_time_ms REAL DEFAULT 0,
        avg_quality_improvement REAL DEFAULT 0,
        documents_by_type JSONB DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_lens_logs_processed_at ON lens_processing_logs(processed_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_lens_logs_status ON lens_processing_logs(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_lens_logs_doc_type ON lens_processing_logs(document_type)`);

    console.log('[lens] Lens tables ensured');
  } catch (err) {
    console.error('[lens] Failed to ensure tables:', err.message);
  }
}
