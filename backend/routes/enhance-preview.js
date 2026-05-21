import { enhancePassportImage } from '../lib/passport-enhance.js';

/**
 * POST /api/enhance-preview
 *
 * Enhancement-only endpoint: runs the passport/document through the
 * Vizez Document Expert pipeline (crop → classify → enhance) and returns
 * the enhanced image + metrics WITHOUT sending it to the LLM.
 */
export async function handleEnhancePreview(req, res, { files }) {
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

    return json(res, 200, {
      enhancedImageUrl: enhancement.dataUrl,
      wasEnhanced: enhancement.wasEnhanced,
      metrics: enhancement.metrics,
    });
  } catch (err) {
    console.error('[enhance-preview] Error:', err.message);
    return json(res, 500, { error: err.message || 'Enhancement failed.' });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
