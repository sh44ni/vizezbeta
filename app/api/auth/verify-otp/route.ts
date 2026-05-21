import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureAuthTables } from '@/lib/ensure-tables';

export async function POST(req: NextRequest) {
  try {
    await ensureAuthTables();
    const { email, code } = await req.json();
    
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code required' }, { status: 400 });
    }
    
    const normalized = email.toLowerCase().trim();
    
    // Find valid OTP
    const rows = await sql`
      SELECT id FROM otp_codes
      WHERE email = ${normalized} AND code = ${code} AND used = FALSE AND expires_at > NOW()
      LIMIT 1
    `;
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }
    
    // Mark as used
    await sql`UPDATE otp_codes SET used = TRUE WHERE id = ${rows[0].id}`;
    
    // Get or create user
    let userRows = await sql`SELECT id, name, email, role FROM users WHERE email = ${normalized} LIMIT 1`;
    
    if (userRows.length === 0) {
      // Get name from authorized_emails
      const authEmail = await sql`SELECT name FROM authorized_emails WHERE email = ${normalized} LIMIT 1`;
      const name = authEmail[0]?.name || normalized.split('@')[0];
      const username = normalized.split('@')[0] + '_' + Date.now().toString(36);
      
      await sql`
        INSERT INTO users (name, username, password, role, email)
        VALUES (${name}, ${username}, ${'otp_auth'}, 'user', ${normalized})
      `;
      userRows = await sql`SELECT id, name, email, role FROM users WHERE email = ${normalized} LIMIT 1`;
    }
    
    return NextResponse.json({
      user: {
        name: userRows[0].name,
        email: userRows[0].email,
        role: userRows[0].role,
      }
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
