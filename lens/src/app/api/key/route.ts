import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, generateApiKey, hashApiKey } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await query(
      `SELECT id, key_prefix, name, created_at, last_used_at, is_active
       FROM lens_api_keys
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ keys: result.rows });
  } catch (err) {
    console.error('Error fetching API keys:', err);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = body.name || 'Default';

    const fullKey = generateApiKey();
    const keyHash = hashApiKey(fullKey);
    const keyPrefix = fullKey.slice(0, 16) + '...';

    await query(
      `INSERT INTO lens_api_keys (key_hash, key_prefix, name) VALUES ($1, $2, $3)`,
      [keyHash, keyPrefix, name]
    );

    return NextResponse.json({
      success: true,
      key: fullKey,
      key_prefix: keyPrefix,
      name,
      message: 'Store this key securely. It cannot be retrieved again.',
    });
  } catch (err) {
    console.error('Error creating API key:', err);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Valid key id is required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE lens_api_keys SET is_active = false WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'API key deactivated' });
  } catch (err) {
    console.error('Error deactivating API key:', err);
    return NextResponse.json({ error: 'Failed to deactivate API key' }, { status: 500 });
  }
}
