import { query } from '../lib/db.js';

// ─── JSON Response Helper ───
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ─── Addon Registry ───
const ADDON_REGISTRY = [
  {
    id: 'rop-evisa',
    name: 'ROP eVisa Manual Filler',
    description: 'Upload passports & work permits, AI-extract data, and fill the Royal Oman Police eVisa portal',
    icon: '🇴🇲',
    route: '/addons/rop-evisa',
    status: 'available',
  },
  {
    id: 'cnic-extractor',
    name: 'CNIC Extractor',
    description: 'Extract data from Pakistani national ID cards (CNIC/NICOP)',
    icon: '🆔',
    route: '/addons/cnic-extractor',
    status: 'coming_soon',
  },
  {
    id: 'universal-doc',
    name: 'Universal Document Agent',
    description: 'Auto-detect and extract any document type with specialized AI agents',
    icon: '📄',
    route: '/addons/universal-doc',
    status: 'coming_soon',
  },
  {
    id: 'batch-filler',
    name: 'Batch Portal Filler',
    description: 'Queue and fill multiple portals sequentially with automated data entry',
    icon: '🔗',
    route: '/addons/batch-filler',
    status: 'coming_soon',
  },
];

// ─── GET /api/addons?user_email=xxx ───
export async function handleGetAddons(req, res, url) {
  const userEmail = url.searchParams.get('user_email');

  let accessRows = [];
  let pendingRows = [];

  if (userEmail) {
    const accessResult = await query(
      'SELECT addon_id, enabled FROM addon_access WHERE user_email = $1',
      [userEmail]
    );
    accessRows = accessResult.rows;

    const pendingResult = await query(
      "SELECT addon_id FROM addon_requests WHERE user_email = $1 AND status = 'pending'",
      [userEmail]
    );
    pendingRows = pendingResult.rows;
  }

  const accessMap = {};
  for (const row of accessRows) {
    accessMap[row.addon_id] = row.enabled;
  }

  const pendingSet = new Set(pendingRows.map(r => r.addon_id));

  const addons = ADDON_REGISTRY.map(addon => {
    let user_status = addon.status; // 'available' or 'coming_soon'

    if (addon.status === 'coming_soon') {
      user_status = 'coming_soon';
    } else if (accessMap[addon.id] === true) {
      user_status = 'active';
    } else if (pendingSet.has(addon.id)) {
      user_status = 'pending';
    }

    return { ...addon, user_status };
  });

  json(res, 200, addons);
}

// ─── POST /api/addons/request ───
export async function handleRequestAddon(req, res, body) {
  const { user_email, user_name, addon_id } = body;

  if (!user_email || !addon_id) {
    return json(res, 400, { error: 'user_email and addon_id are required' });
  }

  const addon = ADDON_REGISTRY.find(a => a.id === addon_id);
  if (!addon) {
    return json(res, 404, { error: 'Addon not found in registry' });
  }
  if (addon.status !== 'available') {
    return json(res, 400, { error: 'Addon is not available for request' });
  }

  // Check for duplicate pending request
  const existing = await query(
    "SELECT id FROM addon_requests WHERE user_email = $1 AND addon_id = $2 AND status = 'pending'",
    [user_email, addon_id]
  );
  if (existing.rows.length > 0) {
    return json(res, 409, { error: 'A pending request already exists for this addon' });
  }

  const result = await query(
    'INSERT INTO addon_requests (user_email, user_name, addon_id, addon_name) VALUES ($1, $2, $3, $4) RETURNING *',
    [user_email, user_name || null, addon_id, addon.name]
  );

  json(res, 201, result.rows[0]);
}

// ─── GET /api/addons/requests ───
export async function handleGetAddonRequests(req, res) {
  const result = await query('SELECT * FROM addon_requests ORDER BY created_at DESC');
  json(res, 200, result.rows);
}

// ─── PUT /api/addons/requests/:id ───
export async function handleReviewAddonRequest(req, res, body, requestId) {
  const { status, reviewed_by } = body;

  if (!status || !['approved', 'denied'].includes(status)) {
    return json(res, 400, { error: "status must be 'approved' or 'denied'" });
  }

  const result = await query(
    'UPDATE addon_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
    [status, reviewed_by || null, requestId]
  );

  if (result.rows.length === 0) {
    return json(res, 404, { error: 'Request not found' });
  }

  const request = result.rows[0];

  // If approved, upsert into addon_access
  if (status === 'approved') {
    await query(
      `INSERT INTO addon_access (user_email, addon_id, enabled, granted_by)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (user_email, addon_id) DO UPDATE SET enabled = true, granted_by = $3`,
      [request.user_email, request.addon_id, reviewed_by || null]
    );
  }

  json(res, 200, request);
}

// ─── PUT /api/addons/access/:id ───
export async function handleToggleAddonAccess(req, res, body, accessId) {
  const { enabled } = body;

  if (typeof enabled !== 'boolean') {
    return json(res, 400, { error: 'enabled must be a boolean' });
  }

  const result = await query(
    'UPDATE addon_access SET enabled = $1 WHERE id = $2 RETURNING *',
    [enabled, accessId]
  );

  if (result.rows.length === 0) {
    return json(res, 404, { error: 'Access record not found' });
  }

  json(res, 200, result.rows[0]);
}

// ─── GET /api/addons/access ───
export async function handleGetAddonAccess(req, res) {
  const result = await query('SELECT * FROM addon_access ORDER BY created_at DESC');
  json(res, 200, result.rows);
}
