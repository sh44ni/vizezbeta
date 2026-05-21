import { NextRequest, NextResponse } from 'next/server';
import { enhancePassportImage } from '@/lib/passport-enhance';

/**
 * POST /api/enhance-preview
 *
 * Enhancement-only endpoint: runs the passport/document through the
 * Vizez Document Expert pipeline (crop → classify → enhance) and returns
 * the enhanced image + metrics WITHOUT sending it to the LLM.
 *
 * Used by the "Preview Enhanced" flow in the Manual Visa module so users
 * can inspect the enhanced image before committing to extraction.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const enhancement = await enhancePassportImage(
      buffer,
      file.name,
      file.type || 'image/jpeg',
    );

    return NextResponse.json({
      enhancedImageUrl: enhancement.dataUrl,
      wasEnhanced: enhancement.wasEnhanced,
      metrics: enhancement.metrics,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[enhance-preview] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Enhancement failed.' }, { status: 500 });
  }
}
