/**
 * VizEz Manpower — Server-side passport image enhancement using sharp.
 *
 * Replaces the Python /api/v1/enhance endpoint.
 * Runs in Next.js API routes (Node.js runtime).
 */

import sharp from 'sharp';

/** Resize enhanced output to this width max (preserves aspect ratio) */
const ENHANCE_WIDTH = 2480; // ~A4 at 300 dpi
/** JPEG output quality */
const JPEG_QUALITY = 92;

export interface SharpEnhanceResult {
  /** Enhanced image as a base64 data URL (data:image/jpeg;base64,...) */
  dataUrl: string;
  /** True if enhancement succeeded; false means original was returned */
  wasEnhanced: boolean;
}

/**
 * Enhance a passport image using sharp:
 * - Auto-rotate from EXIF metadata
 * - Convert to sRGB colour space
 * - Resize to standard width (without upscaling)
 * - Boost brightness + contrast via linear correction
 * - Sharpen via Gaussian unsharp mask
 * - Output as high-quality JPEG
 *
 * Falls back gracefully to the original if any step fails.
 */
export async function enhancePassportImageSharp(
  fileBuffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<SharpEnhanceResult> {
  const fallbackDataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

  try {
    const enhanced = await sharp(fileBuffer)
      .rotate()                                   // auto-rotate from EXIF
      .toColorspace('srgb')
      .resize({ width: ENHANCE_WIDTH, withoutEnlargement: true })
      .linear(1.08, 8)                            // contrast × 1.08, brightness +8
      .sharpen({ sigma: 1.2, m1: 0.5, m2: 0.5 }) // unsharp mask
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    console.log('[sharp-enhance] ✓ Enhanced passport image');

    return {
      dataUrl: `data:image/jpeg;base64,${enhanced.toString('base64')}`,
      wasEnhanced: true,
    };
  } catch (err) {
    console.warn(
      '[sharp-enhance] Enhancement failed, returning original:',
      (err as Error).message,
    );
    return { dataUrl: fallbackDataUrl, wasEnhanced: false };
  }
}

/**
 * Crop and enhance a user-supplied photo (server-side fallback).
 * Client-side processing in photo-processor-browser.ts is preferred.
 * This is used only when the browser route hits the API endpoint directly.
 */
export async function cropAndEnhancePhotoSharp(
  fileBuffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<SharpEnhanceResult> {
  const fallbackDataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

  try {
    // Get image metadata to calculate passport crop
    const meta = await sharp(fileBuffer).rotate().metadata();
    const imgW = meta.width  ?? 0;
    const imgH = meta.height ?? 0;

    if (!imgW || !imgH) throw new Error('Could not read image dimensions');

    // Heuristic crop: centre 65% width, upper 72% height (face region)
    const cropW = Math.floor(imgW * 0.65);
    const cropH = Math.floor(imgH * 0.72);
    const cropX = Math.floor((imgW - cropW) / 2);
    const cropY = Math.floor(imgH * 0.01);

    // Passport aspect 35:45 — adjust crop dimensions
    const ASPECT = 35 / 45;
    let finalW = cropW;
    let finalH = cropH;

    if (cropW / cropH > ASPECT) {
      finalH = Math.floor(cropW / ASPECT);
    } else {
      finalW = Math.floor(cropH * ASPECT);
    }

    // Clamp to image bounds
    const safeW = Math.min(finalW, imgW - cropX);
    const safeH = Math.min(finalH, imgH - cropY);

    const enhanced = await sharp(fileBuffer)
      .rotate()
      .toColorspace('srgb')
      .extract({ left: cropX, top: cropY, width: safeW, height: safeH })
      .resize({ width: 413, height: 531, fit: 'cover' }) // 35×45mm @ 300dpi
      .linear(1.10, 8)
      .sharpen({ sigma: 1.2, m1: 0.5, m2: 0.5 })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    console.log('[sharp-crop] ✓ Cropped + enhanced photo');

    return {
      dataUrl: `data:image/jpeg;base64,${enhanced.toString('base64')}`,
      wasEnhanced: true,
    };
  } catch (err) {
    console.warn(
      '[sharp-crop] Failed, returning original:',
      (err as Error).message,
    );
    return { dataUrl: fallbackDataUrl, wasEnhanced: false };
  }
}
