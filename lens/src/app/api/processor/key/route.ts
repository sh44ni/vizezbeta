import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.PROCESSOR_SECRET || '';

  return NextResponse.json({
    key,
    configured: !!key,
  });
}
