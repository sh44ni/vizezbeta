import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import formidable from 'formidable';
import { ensureTables } from './lib/db.js';

// Route handlers
import { handleGetUsers, handlePostUsers } from './routes/users.js';
import { handleExtract } from './routes/extract.js';
import { handleExtractManual } from './routes/extract-manual.js';
import { handleEnhancePreview } from './routes/enhance-preview.js';
import { handleGetPassportLogs, handlePostPassportLogs } from './routes/passport-logs.js';
import { handleDbInit } from './routes/db-init.js';
import { handleGetApplicants, handleGetApplicantById, handlePostApplicant } from './routes/applicants.js';
import { handleGetPortals, handleGetPortalById, handleCreatePortal, handleUpdatePortal, handleUpdatePortalFields, handleDeletePortal } from './routes/portals.js';
import { handleAnalyzeFields } from './routes/analyze-fields.js';
import { handleGetAddons, handleRequestAddon, handleGetAddonRequests, handleReviewAddonRequest, handleToggleAddonAccess, handleGetAddonAccess } from './routes/addons.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ─── In-memory fill queue (per session) ───
let activeFillQueue = null; // { portal_id, portal_name, queue: [...], created_at }

function handleGetFillQueue(req, res) {
  if (!activeFillQueue) return json(res, 404, { error: 'No active fill queue' });
  json(res, 200, activeFillQueue);
}

function handleSetFillQueue(req, res, body) {
  const { portal_id, portal_name, queue } = body;
  if (!queue || !Array.isArray(queue) || queue.length === 0) {
    return json(res, 400, { error: 'queue must be a non-empty array' });
  }
  activeFillQueue = {
    portal_id: portal_id || null,
    portal_name: portal_name || 'Unknown Portal',
    queue: queue.map(a => ({ ...a, status: 'pending' })),
    created_at: new Date().toISOString(),
  };
  console.log(`[fill-queue] Saved ${queue.length} applicants for portal: ${portal_name}`);
  json(res, 200, { status: 'ok', count: queue.length });
}

function handleClearFillQueue(req, res) {
  activeFillQueue = null;
  json(res, 200, { status: 'cleared' });
}

// ─── CORS Helper ───
function setCORS(res, req) {
  const origin = req?.headers?.origin || '*';
  // Allow both the frontend and the Chrome extension
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ─── JSON Body Parser ───
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

// ─── Multipart Parser (formidable) ───
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 50 * 1024 * 1024 }); // 50MB
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

// ─── JSON Response Helper ───
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ─── Main Server ───
const server = http.createServer(async (req, res) => {
  setCORS(res, req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  try {
    // ── /api/users ──
    if (path === '/api/users') {
      if (method === 'GET') return handleGetUsers(req, res);
      if (method === 'POST') {
        const body = await parseJSONBody(req);
        return handlePostUsers(req, res, body);
      }
    }

    // ── /api/extract ──
    if (path === '/api/extract' && method === 'POST') {
      const { fields, files } = await parseMultipart(req);
      return handleExtract(req, res, { fields, files });
    }

    // ── /api/extract-manual ──
    if (path === '/api/extract-manual' && method === 'POST') {
      const { fields, files } = await parseMultipart(req);
      return handleExtractManual(req, res, { fields, files });
    }

    // ── /api/enhance-preview ──
    if (path === '/api/enhance-preview' && method === 'POST') {
      const { fields, files } = await parseMultipart(req);
      return handleEnhancePreview(req, res, { fields, files });
    }

    // ── /api/passport-logs ──
    if (path === '/api/passport-logs') {
      if (method === 'GET') return handleGetPassportLogs(req, res, url);
      if (method === 'POST') {
        const body = await parseJSONBody(req);
        return handlePostPassportLogs(req, res, body);
      }
    }

    // ── /api/db-init ──
    if (path === '/api/db-init' && method === 'POST') {
      return handleDbInit(req, res);
    }

    // ── /api/applicants ──
    if (path === '/api/applicants') {
      if (method === 'GET') return handleGetApplicants(req, res, url);
      if (method === 'POST') {
        const body = await parseJSONBody(req);
        return handlePostApplicant(req, res, body);
      }
    }

    // ── /api/applicants/:id ──
    const applicantMatch = path.match(/^\/api\/applicants\/(\d+)$/);
    if (applicantMatch && method === 'GET') {
      return handleGetApplicantById(req, res, parseInt(applicantMatch[1], 10));
    }

    // ── /api/portals/analyze-fields ──
    if (path === '/api/portals/analyze-fields' && method === 'POST') {
      let body = ''; req.on('data', c => body += c); await new Promise(r => req.on('end', r));
      return handleAnalyzeFields(req, res, body);
    }

    // ── /api/portals ──
    if (path === '/api/portals') {
      if (method === 'GET') return handleGetPortals(req, res);
      if (method === 'POST') {
        let body = ''; req.on('data', c => body += c); await new Promise(r => req.on('end', r));
        return handleCreatePortal(req, res, body);
      }
    }

    // ── /api/portals/:id ──
    const portalMatch = path.match(/^\/api\/portals\/([\w-]+)$/);
    if (portalMatch) {
      const pid = portalMatch[1];
      if (method === 'GET') return handleGetPortalById(req, res, null, pid);
      if (method === 'PUT') {
        let body = ''; req.on('data', c => body += c); await new Promise(r => req.on('end', r));
        return handleUpdatePortal(req, res, body, pid);
      }
      if (method === 'DELETE') return handleDeletePortal(req, res, null, pid);
    }

    // ── /api/portals/:id/fields ──
    const portalFieldsMatch = path.match(/^\/api\/portals\/([\w-]+)\/fields$/);
    if (portalFieldsMatch && method === 'PUT') {
      const pid = portalFieldsMatch[1];
      let body = ''; req.on('data', c => body += c); await new Promise(r => req.on('end', r));
      return handleUpdatePortalFields(req, res, body, pid);
    }

    // ── /api/fill-queue ──
    if (path === '/api/fill-queue') {
      if (method === 'GET') return handleGetFillQueue(req, res);
      if (method === 'POST') {
        const body = await parseJSONBody(req);
        return handleSetFillQueue(req, res, body);
      }
      if (method === 'DELETE') return handleClearFillQueue(req, res);
    }

    // ── /api/addons ──
    if (path === '/api/addons') {
      if (method === 'GET') return handleGetAddons(req, res, url);
    }
    if (path === '/api/addons/request' && method === 'POST') {
      const body = await parseJSONBody(req);
      return handleRequestAddon(req, res, body);
    }
    if (path === '/api/addons/requests') {
      if (method === 'GET') return handleGetAddonRequests(req, res);
    }
    const addonRequestMatch = path.match(/^\/api\/addons\/requests\/(\d+)$/);
    if (addonRequestMatch && method === 'PUT') {
      const body = await parseJSONBody(req);
      return handleReviewAddonRequest(req, res, body, parseInt(addonRequestMatch[1], 10));
    }
    const addonAccessMatch = path.match(/^\/api\/addons\/access\/(\d+)$/);
    if (addonAccessMatch && method === 'PUT') {
      const body = await parseJSONBody(req);
      return handleToggleAddonAccess(req, res, body, parseInt(addonAccessMatch[1], 10));
    }
    if (path === '/api/addons/access' && method === 'GET') {
      return handleGetAddonAccess(req, res);
    }

    // ── Health check ──
    if (path === '/api/health' || path === '/') {
      return json(res, 200, { status: 'ok', service: 'vizez-backend', timestamp: new Date().toISOString() });
    }

    // ── 404 ──
    json(res, 404, { error: `Route not found: ${method} ${path}` });
  } catch (err) {
    console.error(`[server] Unhandled error on ${method} ${path}:`, err.message);
    json(res, 500, { error: err.message || 'Internal server error' });
  }
});

// ─── Start Server ───
async function start() {
  try {
    await ensureTables();
    server.listen(PORT, () => {
      console.log(`\n  ╔══════════════════════════════════════════╗`);
      console.log(`  ║  VizEz Backend — http://localhost:${PORT}   ║`);
      console.log(`  ║  CORS: ${CORS_ORIGIN.padEnd(33)}║`);
      console.log(`  ╚══════════════════════════════════════════╝\n`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
