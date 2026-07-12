import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sessions } from '../shared';
export const dynamic = 'force-dynamic';

const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
const ROP_BASE = 'https://www.rop.gov.om';

function fetchWithManualRedirect(url: string, options: any) {
  return fetch(url, { ...options, redirect: 'manual', cache: 'no-store' });
}

export async function GET(req: NextRequest) {
  try {
    const response = await fetchWithManualRedirect(ROP_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok && response.status !== 302) {
      throw new Error(`Failed to load ROP portal, status: ${response.status}`);
    }

    const html = await response.text();
    const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    
    // Extract hidden fields
    const viewStateMatch = html.match(/id="__VIEWSTATE"\s+value="([^"]*)"/);
    const viewStateGeneratorMatch = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
    const eventValidationMatch = html.match(/id="__EVENTVALIDATION"\s+value="([^"]*)"/);
    const captchaTokenMatch = html.match(/id="LBD_VCID_c_en_applyfornewvisa_samplecaptcha"\s+value="([^"]*)"/);
    const captchaImageSrcMatch = html.match(/<img[^>]+id="c_en_applyfornewvisa_samplecaptcha_CaptchaImage"[^>]+src="([^"]+)"/);

    if (!viewStateMatch || !captchaTokenMatch || !captchaImageSrcMatch) {
      throw new Error('Failed to extract necessary form fields from ROP portal. The portal might have changed.');
    }

    const viewState = viewStateMatch[1];
    const viewStateGenerator = viewStateGeneratorMatch ? viewStateGeneratorMatch[1] : '';
    const eventValidation = eventValidationMatch ? eventValidationMatch[1] : '';
    const captchaToken = captchaTokenMatch[1];
    const captchaUrl = captchaImageSrcMatch[1].replace(/&amp;/g, '&');

    // Fetch the captcha image
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const captchaResponse = await fetch(ROP_BASE + captchaUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': cookieHeader,
        'Referer': ROP_URL
      }
    });

    if (!captchaResponse.ok) {
      throw new Error('Failed to fetch CAPTCHA image');
    }

    const captchaBuffer = await captchaResponse.arrayBuffer();
    const captchaBase64 = Buffer.from(captchaBuffer).toString('base64');

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      viewState,
      viewStateGenerator,
      eventValidation,
      captchaToken,
      cookies: cookieHeader,
      timestamp: Date.now()
    });

    // Cleanup old sessions (older than 10 mins)
    for (const [key, val] of sessions.entries()) {
      if (Date.now() - val.timestamp > 10 * 60 * 1000) {
        sessions.delete(key);
      }
    }

    return NextResponse.json({
      sessionId,
      captchaBase64: `data:image/jpeg;base64,${captchaBase64}`
    });

  } catch (err: any) {
    console.error('[ROP Auto Submit Init Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
