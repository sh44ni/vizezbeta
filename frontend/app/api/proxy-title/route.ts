import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeout);

    const html = await resp.text();

    // Extract <title> tag
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = match?.[1]?.trim() || '';

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: '' });
  }
}
