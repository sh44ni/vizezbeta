import { NextRequest, NextResponse } from 'next/server';
import sql, { rawQuery } from '@/lib/db';

/* ── Ensure portal tables exist ─────────────────────────── */
let tablesReady = false;

async function ensurePortalTables() {
  if (tablesReady) return;
  try {
    // Create tables if they don't exist
    await rawQuery(`
      CREATE TABLE IF NOT EXISTS portals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url_pattern TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add columns that might be missing from an older schema
    const columnsToAdd = [
      { name: 'document_config', type: "JSONB DEFAULT '[]'" },
      { name: 'total_fields', type: 'INTEGER DEFAULT 0' },
      { name: 'mapped_fields', type: 'INTEGER DEFAULT 0' },
      { name: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT true' },
    ];

    for (const col of columnsToAdd) {
      try {
        await rawQuery(`ALTER TABLE portals ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch { /* column already exists */ }
    }

    await rawQuery(`
      CREATE TABLE IF NOT EXISTS portal_fields (
        id SERIAL PRIMARY KEY,
        portal_id TEXT NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
        portal_selector TEXT NOT NULL,
        portal_label TEXT DEFAULT '',
        field_type TEXT DEFAULT 'text',
        source_key TEXT DEFAULT '',
        fill_method TEXT DEFAULT 'value',
        required BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        review_status TEXT DEFAULT 'auto',
        confidence REAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_portal_fields_portal_id ON portal_fields(portal_id);
    `);
    tablesReady = true;
    console.log('[portals] Tables ready');
  } catch (err) {
    console.error('[portals] Table setup error:', err);
    tablesReady = true;
  }
}


/* ── GET /api/portals — List all portals ─────────────────── */
export async function GET() {
  try {
    await ensurePortalTables();
    const portals = await sql`
      SELECT id, name, url_pattern, document_config, total_fields, mapped_fields,
             created_at, updated_at, is_active
      FROM portals
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ portals });
  } catch (err) {
    console.error('[portals] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch portals' }, { status: 500 });
  }
}

/* ── POST /api/portals — Save a new portal with field mappings ── */
export async function POST(req: NextRequest) {
  try {
    await ensurePortalTables();

    const body = await req.json();
    const { name, url_pattern, document_config, fields } = body;

    if (!name || !url_pattern) {
      return NextResponse.json({ error: 'name and url_pattern are required' }, { status: 400 });
    }

    const fieldsList = fields || [];
    const mappedCount = fieldsList.filter((f: { source_key?: string }) => f.source_key).length;

    // Generate a portal ID
    const portalId = `portal_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    // Insert portal
    await rawQuery(
      `INSERT INTO portals (id, name, url_pattern, document_config, total_fields, mapped_fields)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [portalId, name, url_pattern, JSON.stringify(document_config || []), fieldsList.length, mappedCount]
    );

    // Insert field mappings
    for (const field of fieldsList) {
      await rawQuery(
        `INSERT INTO portal_fields (portal_id, portal_selector, portal_label, field_type, source_key, fill_method, required, sort_order, review_status, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          portalId,
          field.portal_selector || '',
          field.portal_label || '',
          field.field_type || 'text',
          field.source_key || '',
          field.fill_method || 'value',
          field.required || false,
          field.sort_order || 0,
          field.review_status || 'auto',
          field.confidence || 0,
        ]
      );
    }

    console.log(`[portals] Saved "${name}" (${portalId}) with ${fieldsList.length} fields (${mappedCount} mapped)`);

    return NextResponse.json({
      id: portalId,
      name,
      total_fields: fieldsList.length,
      mapped_fields: mappedCount,
    }, { status: 201 });

  } catch (err) {
    console.error('[portals] POST error:', err);
    return NextResponse.json({ error: 'Failed to save portal' }, { status: 500 });
  }
}
