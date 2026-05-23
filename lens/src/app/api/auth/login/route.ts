import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret_key } = body;

    if (!secret_key) {
      return NextResponse.json({ error: 'Secret key is required' }, { status: 400 });
    }

    const adminKey = process.env.ADMIN_SECRET_KEY;
    if (!adminKey) {
      return NextResponse.json({ error: 'Server misconfigured: no admin key set' }, { status: 500 });
    }

    if (secret_key !== adminKey) {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 401 });
    }

    const token = signToken({ role: 'super_admin' });

    const response = NextResponse.json({ success: true });
    response.cookies.set('lens-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
