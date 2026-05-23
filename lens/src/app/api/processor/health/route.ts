import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const processorUrl = process.env.PASSPORT_PROCESSOR_URL || 'http://localhost:8000';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${processorUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    if (errorMessage.includes('abort') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return NextResponse.json({ status: 'offline', error: 'Connection refused' });
    }
    return NextResponse.json({ status: 'offline', error: errorMessage });
  }
}
