import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, hashApiKey, getTokenFromRequest, verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

async function authenticateRequest(req: NextRequest): Promise<boolean> {
  // Check cookie-based auth first
  const token = getTokenFromRequest(req);
  if (token && verifyToken(token)) {
    return true;
  }

  // Check API key auth
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const apiKey = authHeader.slice(7);
  const keyHash = hashApiKey(apiKey);

  try {
    const result = await query(
      `SELECT id, is_active FROM lens_api_keys WHERE key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return false;
    }

    // Update last_used_at
    await query(
      `UPDATE lens_api_keys SET last_used_at = NOW() WHERE id = $1`,
      [result.rows[0].id]
    );

    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const authed = await authenticateRequest(req);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const processorUrl = process.env.PASSPORT_PROCESSOR_URL || 'http://localhost:8000';

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Forward to processor
    const proxyForm = new FormData();
    proxyForm.append('file', file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    const processorSecret = process.env.PROCESSOR_SECRET || '';

    const response = await fetch(`${processorUrl}/api/v1/enhance`, {
      method: 'POST',
      headers: processorSecret ? { 'X-Processor-Key': processorSecret } : {},
      body: proxyForm,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    // Log the processing result
    try {
      await query(
        `INSERT INTO lens_processing_logs (
          request_id, filename, file_size_bytes, source_format, document_type,
          classification_confidence, crop_applied, crop_method, crop_confidence,
          original_quality_score, enhanced_quality_score, quality_improvement,
          ready_for_extraction, processing_time_ms, processed_by, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          data.request_id || `req_${Date.now()}`,
          data.filename || (file instanceof File ? file.name : 'unknown'),
          data.file_size_bytes || (file instanceof File ? file.size : null),
          data.source_format || null,
          data.document_type || null,
          data.classification_confidence || null,
          data.crop_applied ?? false,
          data.crop_method || null,
          data.crop_confidence || null,
          data.original_quality_score || null,
          data.enhanced_quality_score || null,
          data.quality_improvement || null,
          data.ready_for_extraction ?? false,
          data.processing_time_ms || null,
          'api',
          data.status || (response.ok ? 'success' : 'error'),
          data.error_message || null,
        ]
      );
    } catch (logErr) {
      console.error('Failed to log processing result:', logErr);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    if (errorMessage.includes('abort')) {
      return NextResponse.json(
        { error: 'Processor request timed out', status: 'timeout' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to connect to processor', details: errorMessage },
      { status: 502 }
    );
  }
}
