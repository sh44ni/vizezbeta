import { NextRequest, NextResponse } from 'next/server';
import { cropAndEnhancePhotoSharp } from '@/lib/passport-enhance-sharp';

/**
 * POST /api/process-photo
 *
 * Server-side fallback for photo crop + enhance.
 * The preferred path is client-side (photo-processor-browser.ts).
 * This route handles cases where the client calls the API directly.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo');

    if (!photo || !(photo instanceof File)) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await photo.arrayBuffer());
    const result = await cropAndEnhancePhotoSharp(fileBuffer, photo.type || 'image/jpeg');

    return NextResponse.json(result);
  } catch (error) {
    console.error('[process-photo] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
