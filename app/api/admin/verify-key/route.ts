import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || '#7294879348uwi83hsndnsdbe';

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (key === ADMIN_KEY) {
      return NextResponse.json({ valid: true });
    }
    return NextResponse.json({ valid: false }, { status: 401 });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
