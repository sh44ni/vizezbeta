import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      request_id,
      filename,
      file_size_bytes,
      source_format,
      document_type,
      classification_confidence,
      crop_applied,
      crop_method,
      crop_confidence,
      original_quality_score,
      enhanced_quality_score,
      quality_improvement,
      ready_for_extraction,
      processing_time_ms,
      processed_by,
      status,
      error_message,
    } = body;

    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 });
    }

    // Insert into processing logs
    await query(
      `INSERT INTO lens_processing_logs (
        request_id, filename, file_size_bytes, source_format, document_type,
        classification_confidence, crop_applied, crop_method, crop_confidence,
        original_quality_score, enhanced_quality_score, quality_improvement,
        ready_for_extraction, processing_time_ms, processed_by, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (request_id) DO UPDATE SET
        filename = EXCLUDED.filename,
        file_size_bytes = EXCLUDED.file_size_bytes,
        source_format = EXCLUDED.source_format,
        document_type = EXCLUDED.document_type,
        classification_confidence = EXCLUDED.classification_confidence,
        crop_applied = EXCLUDED.crop_applied,
        crop_method = EXCLUDED.crop_method,
        crop_confidence = EXCLUDED.crop_confidence,
        original_quality_score = EXCLUDED.original_quality_score,
        enhanced_quality_score = EXCLUDED.enhanced_quality_score,
        quality_improvement = EXCLUDED.quality_improvement,
        ready_for_extraction = EXCLUDED.ready_for_extraction,
        processing_time_ms = EXCLUDED.processing_time_ms,
        processed_by = EXCLUDED.processed_by,
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        processed_at = NOW()`,
      [
        request_id,
        filename || null,
        file_size_bytes || null,
        source_format || null,
        document_type || null,
        classification_confidence || null,
        crop_applied ?? false,
        crop_method || null,
        crop_confidence || null,
        original_quality_score || null,
        enhanced_quality_score || null,
        quality_improvement || null,
        ready_for_extraction ?? false,
        processing_time_ms || null,
        processed_by || 'backend',
        status || 'success',
        error_message || null,
      ]
    );

    // Upsert daily stats
    const logStatus = status || 'success';
    const isSuccess = logStatus === 'success';

    await query(
      `INSERT INTO lens_daily_stats (stat_date, total_processed, total_successful, total_failed, avg_processing_time_ms, avg_quality_improvement, documents_by_type)
       VALUES (
         CURRENT_DATE,
         1,
         $1,
         $2,
         $3,
         $4,
         $5::jsonb
       )
       ON CONFLICT (stat_date) DO UPDATE SET
         total_processed = lens_daily_stats.total_processed + 1,
         total_successful = lens_daily_stats.total_successful + $1,
         total_failed = lens_daily_stats.total_failed + $2,
         avg_processing_time_ms = (
           (lens_daily_stats.avg_processing_time_ms * (lens_daily_stats.total_processed - 1) + COALESCE($3, 0))
           / lens_daily_stats.total_processed
         ),
         avg_quality_improvement = (
           (lens_daily_stats.avg_quality_improvement * (lens_daily_stats.total_processed - 1) + COALESCE($4, 0))
           / lens_daily_stats.total_processed
         ),
         documents_by_type = (
           CASE
             WHEN $6::text IS NOT NULL THEN
               jsonb_set(
                 lens_daily_stats.documents_by_type,
                 ARRAY[$6::text],
                 to_jsonb(COALESCE((lens_daily_stats.documents_by_type->>$6::text)::int, 0) + 1)
               )
             ELSE lens_daily_stats.documents_by_type
           END
         ),
         updated_at = NOW()`,
      [
        isSuccess ? 1 : 0,
        isSuccess ? 0 : 1,
        processing_time_ms || null,
        quality_improvement || null,
        document_type ? JSON.stringify({ [document_type]: 1 }) : '{}',
        document_type || null,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error logging processing result:', err);
    return NextResponse.json({ error: 'Failed to log result' }, { status: 500 });
  }
}
