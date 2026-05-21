import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureAuthTables } from '@/lib/ensure-tables';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    await ensureAuthTables();
    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    
    const normalized = email.toLowerCase().trim();
    
    // Check if email is authorized
    const authorized = await sql`SELECT id FROM authorized_emails WHERE email = ${normalized} LIMIT 1`;
    if (authorized.length === 0) {
      return NextResponse.json({ error: 'Email not authorized. Request early access first.' }, { status: 403 });
    }
    
    // Rate limit: check if OTP was sent in last 60 seconds
    const recent = await sql`
      SELECT id FROM otp_codes 
      WHERE email = ${normalized} AND created_at > NOW() - INTERVAL '60 seconds'
      LIMIT 1
    `;
    if (recent.length > 0) {
      return NextResponse.json({ error: 'Please wait 60 seconds before requesting another code' }, { status: 429 });
    }
    
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Invalidate old codes
    await sql`UPDATE otp_codes SET used = TRUE WHERE email = ${normalized} AND used = FALSE`;
    
    // Store new code (5 min expiry)
    await sql`
      INSERT INTO otp_codes (email, code, expires_at)
      VALUES (${normalized}, ${code}, NOW() + INTERVAL '5 minutes')
    `;
    
    // Send email via Resend
    await resend.emails.send({
      from: 'VizEz <access@vizez.cloud>',
      to: normalized,
      subject: `${code} — Your VizEz Access Code`,
      html: `
        <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0;">VizEz</h1>
            <p style="font-size: 12px; color: #888; margin: 4px 0 0;">Early Access Portal</p>
          </div>
          <div style="background: #0a0a0a; border: 1px solid #222; border-radius: 12px; padding: 32px; text-align: center;">
            <p style="font-size: 14px; color: #aaa; margin: 0 0 20px;">Your access code is:</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #7c5cfc; font-family: monospace; margin: 0 0 20px;">${code}</div>
            <p style="font-size: 12px; color: #666; margin: 0;">This code expires in 5 minutes.</p>
          </div>
          <p style="font-size: 11px; color: #444; text-align: center; margin: 24px 0 0;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
    
    return NextResponse.json({ status: 'ok', message: 'Access code sent to your email' });
  } catch (error) {
    console.error('OTP request error:', error);
    return NextResponse.json({ error: 'Failed to send access code' }, { status: 500 });
  }
}
