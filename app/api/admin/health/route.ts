import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || '#7294879348uwi83hsndnsdbe';
const PP_URL = process.env.PASSPORT_PROCESSOR_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const key = req.headers.get('X-Admin-Key');
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run DB ping + Passport Processor ping in parallel (server-side, no CORS)
  const [dbResult, ppResult] = await Promise.allSettled([
    (async () => {
      const t = Date.now();
      await sql`SELECT 1`;
      return Date.now() - t;
    })(),
    (async () => {
      const t = Date.now();
      const res = await fetch(`${PP_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const latency = Date.now() - t;
      return { ok: res.ok, latency };
    })(),
  ]);

  const dbPing = dbResult.status === 'fulfilled' ? dbResult.value : null;
  const dbOk = dbResult.status === 'fulfilled';
  const dbError = dbResult.status === 'rejected' ? 'DB unreachable' : undefined;

  const ppOk = ppResult.status === 'fulfilled' && ppResult.value.ok;
  const ppLatency = ppResult.status === 'fulfilled' ? ppResult.value.latency : null;
  const ppError = ppResult.status === 'rejected' ? 'Passport processor unreachable' : 
                  (ppResult.status === 'fulfilled' && !ppResult.value.ok) ? 'Passport processor error' : undefined;

  return NextResponse.json({
    status: dbOk ? 'ok' : 'error',
    dbPing,
    dbOk,
    dbError,
    ppOk,
    ppLatency,
    ppError,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
