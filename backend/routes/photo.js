import { cropApplicantPhoto } from '../lib/passport-enhance.js';

/**
 * POST /api/process-photo
 * Upload a photo, proxy it to the Python processor for intelligent face cropping,
 * and return the base64 JPEG to the frontend.
 */
export async function handleProcessPhoto(req, res, { files }) {
  try {
    if (!files || !files.photo) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No photo provided' }));
    }

    const file = files.photo;
    const fileBuffer = file.buffer;
    const fileName = file.filename;
    const mimeType = file.mimeType;

    // Send to Python Document Expert for face cropping
    const result = await cropApplicantPhoto(fileBuffer, fileName, mimeType);

    if (!result.wasCropped) {
      console.warn(`[photo-process] Failed to intelligently crop "${fileName}". Using fallback.`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      dataUrl: result.dataUrl,
      metrics: result.metrics,
    }));
  } catch (error) {
    console.error('Photo processing error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
}
