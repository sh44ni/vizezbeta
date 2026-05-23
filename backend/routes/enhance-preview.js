import { enhancePassportImage } from '../lib/passport-enhance.js';
import { logToLens } from '../lib/lens-integration.js';
import { randomUUID } from 'crypto';

/**
 * POST /api/enhance-preview
 *
 * Enhancement-only endpoint: runs the passport/document through the
 * Vizez Document Expert pipeline (crop → classify → enhance) and returns
 * the enhanced image + metrics WITHOUT sending it to the LLM.
 */
export async function handleEnhancePreview(req, res, { files }) {
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();

  try {
    const file = files?.file?.[0];
    if (!file) {
      return json(res, 400, { error: 'No file provided.' });
    }

    const { default: fs } = await import('fs');
    const buffer = fs.readFileSync(file.filepath);
    const enhancement = await enhancePassportImage(
      buffer,
      file.originalFilename || 'document',
      file.mimetype || 'image/jpeg',
    );

    const processingTimeMs = Date.now() - startTime;

    // Log to Lens (non-blocking)
    logToLens({
      requestId,
      filename: file.originalFilename || 'document',
      fileSizeBytes: buffer.length,
      sourceFormat: file.mimetype?.includes('pdf') ? 'pdf' : 'image',
      documentType: enhancement.metrics?.document_type || 'unknown',
      classificationConfidence: enhancement.metrics?.classification?.confidence || 0,
      cropApplied: enhancement.metrics?.crop_applied || false,
      cropMethod: enhancement.metrics?.crop_metadata?.crop_method || null,
      cropConfidence: enhancement.metrics?.crop_metadata?.crop_confidence || 0,
      originalQualityScore: enhancement.metrics?.original_quality?.overall_score || 0,
      enhancedQualityScore: enhancement.metrics?.enhanced_quality?.overall_score || 0,
      qualityImprovement: (enhancement.metrics?.enhanced_quality?.overall_score || 0) - (enhancement.metrics?.original_quality?.overall_score || 0),
      readyForExtraction: enhancement.metrics?.ready_for_extraction || false,
      processingTimeMs,
      processedBy: 'enhance-preview',
      status: 'success',
    });

    return json(res, 200, {
      enhancedImageUrl: enhancement.dataUrl,
      wasEnhanced: enhancement.wasEnhanced,
      metrics: enhancement.metrics,
    });
  } catch (err) {
    const processingTimeMs = Date.now() - startTime;

    // Log error to Lens (non-blocking)
    logToLens({
      requestId,
      filename: files?.file?.[0]?.originalFilename || 'unknown',
      fileSizeBytes: 0,
      sourceFormat: 'unknown',
      documentType: 'unknown',
      processingTimeMs,
      processedBy: 'enhance-preview',
      status: 'error',
      errorMessage: err.message,
    });

    console.error('[enhance-preview] Error:', err.message);
    return json(res, 500, { error: err.message || 'Enhancement failed.' });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

