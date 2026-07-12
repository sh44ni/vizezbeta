import { NextRequest, NextResponse } from 'next/server';
import { cropApplicantPhoto } from '@/lib/passport-enhance';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo');

    if (!photo || !(photo instanceof File)) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await photo.arrayBuffer());
    const fileName = photo.name;
    const mimeType = photo.type;

    const result = await cropApplicantPhoto(fileBuffer, fileName, mimeType);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing photo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
