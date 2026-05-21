// routes/portals.js — Portal CRUD API
import { query } from '../lib/db.js';

/**
 * GET /api/portals — List all portals with field counts
 */
export async function handleGetPortals(req, res, body) {
  try {
    const result = await query(`
      SELECT p.id, p.name, p.url_pattern, p.status, p.portal_type, p.document_config, p.created_at, p.updated_at,
        (SELECT count(*) FROM portal_fields WHERE portal_id = p.id) AS field_count,
        (SELECT count(*) FROM portal_fields WHERE portal_id = p.id AND fill_method = 'manual') AS manual_count
      FROM portals p ORDER BY p.updated_at DESC
    `);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ portals: result.rows }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * GET /api/portals/:id — Full portal with all fields (the mapping recipe)
 */
export async function handleGetPortalById(req, res, body, portalId) {
  try {
    const portalResult = await query('SELECT * FROM portals WHERE id = $1', [portalId]);
    if (portalResult.rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Portal not found' }));
      return;
    }

    const portal = portalResult.rows[0];
    const fieldsResult = await query(
      'SELECT * FROM portal_fields WHERE portal_id = $1 ORDER BY sort_order, id',
      [portalId]
    );

    // Build the mapping recipe JSON the extension needs
    const mapping = {
      id: portal.id,
      name: portal.name,
      url_pattern: portal.url_pattern,
      status: portal.status,
      portal_type: portal.portal_type || 'visa',
      document_config: portal.document_config || [],
      pre_actions: portal.pre_actions || [],
      post_actions: portal.post_actions || [],
      phase_groups: portal.phase_groups || [],
      created_at: portal.created_at,
      updated_at: portal.updated_at,
      fields: fieldsResult.rows.map(f => ({
        id: f.id,
        portal_selector: f.portal_selector,
        portal_label: f.portal_label,
        type: f.field_type,
        source_key: f.source_key,
        fill_method: f.fill_method,
        default_value: f.default_value,
        option_map: f.option_map,
        transform: f.transform,
        required: f.required,
        sort_order: f.sort_order,
        review_status: f.review_status,
        confidence: f.confidence,
      })),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ portal: mapping }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * POST /api/portals — Create portal from wizard scan data
 *
 * Body: { id, name, url_pattern, fields: [...], pre_actions?, phase_groups? }
 */
export async function handleCreatePortal(req, res, body) {
  try {
    const data = JSON.parse(body);
    const id = data.id || slugify(data.name);
    const { name, url_pattern, portal_type = 'visa', document_config = [], fields = [], pre_actions = [], post_actions = [], phase_groups = [] } = data;

    if (!name || !url_pattern) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'name and url_pattern are required' }));
      return;
    }

    // Insert portal
    await query(
      `INSERT INTO portals (id, name, url_pattern, status, portal_type, document_config, pre_actions, post_actions, phase_groups, created_by)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET name = $2, url_pattern = $3, portal_type = $4, document_config = $5, pre_actions = $6, post_actions = $7, phase_groups = $8, updated_at = NOW()`,
      [id, name, url_pattern, portal_type, JSON.stringify(document_config), JSON.stringify(pre_actions), JSON.stringify(post_actions), JSON.stringify(phase_groups), data.created_by || 'wizard']
    );

    // Delete existing fields and re-insert
    await query('DELETE FROM portal_fields WHERE portal_id = $1', [id]);

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      await query(
        `INSERT INTO portal_fields (portal_id, portal_selector, portal_label, field_type, source_key, fill_method, default_value, option_map, transform, required, sort_order, review_status, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          f.portal_selector || f.selector || '',
          f.portal_label || f.label || '',
          f.type || f.field_type || 'text',
          f.source_key || null,
          f.fill_method || 'value',
          f.default_value || null,
          f.option_map ? JSON.stringify(f.option_map) : null,
          f.transform || null,
          f.required || false,
          f.sort_order ?? i,
          f.review_status || 'pending',
          f.confidence ?? 0,
        ]
      );
    }

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', id, field_count: fields.length }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * PUT /api/portals/:id — Update portal metadata
 */
export async function handleUpdatePortal(req, res, body, portalId) {
  try {
    const data = JSON.parse(body);
    const sets = [];
    const vals = [];
    let idx = 1;

    if (data.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(data.name); }
    if (data.url_pattern !== undefined) { sets.push(`url_pattern = $${idx++}`); vals.push(data.url_pattern); }
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(data.status); }
    if (data.portal_type !== undefined) { sets.push(`portal_type = $${idx++}`); vals.push(data.portal_type); }
    if (data.document_config !== undefined) { sets.push(`document_config = $${idx++}`); vals.push(JSON.stringify(data.document_config)); }
    if (data.pre_actions !== undefined) { sets.push(`pre_actions = $${idx++}`); vals.push(JSON.stringify(data.pre_actions)); }
    if (data.post_actions !== undefined) { sets.push(`post_actions = $${idx++}`); vals.push(JSON.stringify(data.post_actions)); }
    if (data.phase_groups !== undefined) { sets.push(`phase_groups = $${idx++}`); vals.push(JSON.stringify(data.phase_groups)); }

    sets.push(`updated_at = NOW()`);
    vals.push(portalId);

    await query(`UPDATE portals SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * PUT /api/portals/:id/fields — Bulk update all field mappings
 */
export async function handleUpdatePortalFields(req, res, body, portalId) {
  try {
    const data = JSON.parse(body);
    const fields = data.fields || [];

    // Re-create all fields
    await query('DELETE FROM portal_fields WHERE portal_id = $1', [portalId]);

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      await query(
        `INSERT INTO portal_fields (portal_id, portal_selector, portal_label, field_type, source_key, fill_method, default_value, option_map, transform, required, sort_order, review_status, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          portalId,
          f.portal_selector || '',
          f.portal_label || '',
          f.type || f.field_type || 'text',
          f.source_key || null,
          f.fill_method || 'value',
          f.default_value || null,
          f.option_map ? JSON.stringify(f.option_map) : null,
          f.transform || null,
          f.required || false,
          f.sort_order ?? i,
          f.review_status || 'approved',
          f.confidence ?? 0,
        ]
      );
    }

    // Mark portal updated
    await query('UPDATE portals SET updated_at = NOW() WHERE id = $1', [portalId]);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', field_count: fields.length }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * DELETE /api/portals/:id — Delete portal and cascade fields
 */
export async function handleDeletePortal(req, res, body, portalId) {
  try {
    await query('DELETE FROM portals WHERE id = $1', [portalId]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// Helper: slugify name into ID
function slugify(str) {
  return (str || 'portal')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
    + '-' + Date.now().toString(36);
}
