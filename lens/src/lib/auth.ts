import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'vizez-lens-default-secret';

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const cookie = req.cookies.get('lens-token');
  return cookie?.value ?? null;
}

export function isAuthenticated(req: NextRequest): boolean {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return verifyToken(token) !== null;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): string {
  const random = randomBytes(20).toString('hex'); // 40 hex chars
  return `lens_sk_${random}`;
}
