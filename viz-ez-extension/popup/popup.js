// popup.js — VizEz Brain v3.1 — Portal-Centric Flow
//
// Two views:
//   1. Portal List — shows all portals with queued applicant counts
//   2. Portal Detail — fill controls for selected portal

const API_BASE = 'https://earlyaccess.vizez.cloud';
const ACTIVE_API_BASE = API_BASE;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

let currentTabUrl = '';
let allPortals = [];       // From backend API
let addonData = {};        // From vizezAddonData storage
let activePortalId = null;
let fillIdx = 0;

const ADDON_ICONS = {
  'rop-evisa': '🇴🇲',
  'cnic-extractor': '🆔',
  'universal-doc': '📄',
  'batch-filler': '🔗',
};

// ═══════════════════════════════════════════════
// BACKEND STATUS
// ═══════════════════════════════════════════════

const statusDot = $('#status-dot');
const statusText = $('#status-text');

async function checkStatus() {
  try {
    await fetch(`${ACTIVE_API_BASE}/api/health`);
    statusDot.className = 'status-dot online';
    statusText.textContent = 'Connected';
    return true;
  } catch {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Backend offline';
    return false;
  }
}

// ═══════════════════════════════════════════════
// VIEW SWITCHING
// ═══════════════════════════════════════════════

function showView(viewId) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#${viewId}`).classList.add('active');
}

// ═══════════════════════════════════════════════
// PORTAL LIST VIEW
// ═══════════════════════════════════════════════

async function loadPortalList() {
  const loading = $('#portals-loading');
  const empty = $('#portals-empty');
  const list = $('#portals-list');

  loading.style.display = '';
  empty.style.display = 'none';
  list.style.display = 'none';

  // Get current tab URL for portal detection
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabUrl = tab?.url || '';
  } catch { currentTabUrl = ''; }

  // Load addon data from storage
  const stored = await chrome.storage.local.get(['vizezAddonData', 'vizezFillQueue', 'vizezFillPortalId']);
  addonData = stored.vizezAddonData || {};

  // Load portals from backend
  try {
    const resp = await fetch(`${ACTIVE_API_BASE}/api/portals`);
    const data = await resp.json();
    allPortals = data.portals || [];
    chrome.storage.local.set({ vizezPortalList: allPortals });
  } catch {
    // Use cached
    const cached = await chrome.storage.local.get(['vizezPortalList']);
    allPortals = cached.vizezPortalList || [];
  }

  // Build unified portal list: addons first, then mapped portals
  const portalEntries = [];

  // Addon portals
  for (const [addonId, addon] of Object.entries(addonData)) {
    const count = addon.applicants?.length || 0;
    portalEntries.push({
      id: addonId,
      type: 'addon',
      name: addon.name || addonId,
      icon: ADDON_ICONS[addonId] || '📋',
      count: count,
      urlPattern: null,
      onPage: false,
    });
  }

  // Mapped portals from backend
  for (const p of allPortals) {
    // Skip if already listed as addon
    if (portalEntries.some(e => e.id === p.addon_id)) continue;
    const onPage = p.url_pattern && urlMatchesPattern(currentTabUrl, p.url_pattern);
    portalEntries.push({
      id: `portal-${p.id}`,
      backendId: p.id,
      type: 'mapped',
      name: p.name,
      icon: '🌐',
      count: p.field_count || 0,
      urlPattern: p.url_pattern,
      onPage: onPage,
      fieldCount: p.field_count || 0,
    });
  }

  // Also add addon entries that have no data yet but are known
  for (const [id, icon] of Object.entries(ADDON_ICONS)) {
    if (!portalEntries.some(e => e.id === id)) {
      // Check if there's a fill queue for this addon
      if (stored.vizezFillPortalId === id && stored.vizezFillQueue?.length > 0) {
        portalEntries.push({
          id: id,
          type: 'addon',
          name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          icon: icon,
          count: stored.vizezFillQueue.length,
          urlPattern: null,
          onPage: false,
        });
      }
    }
  }

  loading.style.display = 'none';

  if (portalEntries.length === 0) {
    empty.style.display = '';
    return;
  }

  list.style.display = '';
  list.innerHTML = '';

  // Check on-page for addon portals too
  // ROP eVisa URL pattern
  const addonUrlPatterns = {
    'rop-evisa': '*rop.gov.om*',
  };
  for (const entry of portalEntries) {
    if (entry.type === 'addon' && addonUrlPatterns[entry.id]) {
      entry.onPage = urlMatchesPattern(currentTabUrl, addonUrlPatterns[entry.id]);
    }
  }

  // Sort: on-page first, then by count descending
  portalEntries.sort((a, b) => {
    if (a.onPage && !b.onPage) return -1;
    if (!a.onPage && b.onPage) return 1;
    return b.count - a.count;
  });

  for (const entry of portalEntries) {
    const card = document.createElement('div');
    card.className = `portal-card${entry.onPage ? ' on-page' : ''}`;
    card.innerHTML = `
      <div class="portal-icon">${entry.icon}</div>
      <div class="portal-body">
        <div class="portal-name">${esc(entry.name)}</div>
        <div class="portal-meta">
          ${entry.onPage ? '<span class="portal-on-page"><span class="pulse-dot"></span> On this page</span>' : ''}
          ${entry.type === 'addon' && entry.count > 0 ? `<span>${entry.count} applicant${entry.count !== 1 ? 's' : ''} queued</span>` : ''}
          ${entry.type === 'mapped' ? `<span>${entry.fieldCount} fields mapped</span>` : ''}
        </div>
      </div>
      ${entry.type === 'addon' && entry.count > 0 ? `<span class="portal-count">${entry.count}</span>` : ''}
      ${entry.type === 'addon' && entry.count === 0 ? '<span class="portal-count empty">0</span>' : ''}
      <svg class="portal-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
    `;

    card.addEventListener('click', () => openPortalDetail(entry));
    list.appendChild(card);
  }
}

// ═══════════════════════════════════════════════
// PORTAL DETAIL VIEW
// ═══════════════════════════════════════════════

function openPortalDetail(entry) {
  activePortalId = entry.id;
  fillIdx = 0;

  showView('view-detail');

  // Header
  $('#detail-icon').textContent = entry.icon;
  $('#detail-name').textContent = entry.name;

  const statusEl = $('#detail-status');
  if (entry.onPage) {
    statusEl.className = 'detail-status on-page';
    statusEl.innerHTML = '<span class="pulse-dot" style="width:5px;height:5px;border-radius:50%;background:var(--accent);animation:pulse 1.5s ease infinite"></span> You\'re on this portal';
  } else {
    statusEl.className = 'detail-status off-page';
    statusEl.textContent = 'Navigate to the portal page to fill';
  }

  renderDetail();
}

function getApplicants() {
  // Get applicants for the active portal
  if (addonData[activePortalId]) {
    return addonData[activePortalId].applicants || [];
  }
  return [];
}

function renderDetail() {
  const applicants = getApplicants();
  const emptyEl = $('#detail-empty');
  const fillEl = $('#detail-fill');

  if (applicants.length === 0) {
    emptyEl.style.display = '';
    fillEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  fillEl.style.display = '';

  if (fillIdx >= applicants.length) fillIdx = applicants.length - 1;
  if (fillIdx < 0) fillIdx = 0;

  const app = applicants[fillIdx];
  const total = applicants.length;
  const isFilled = app.status === 'filled';
  const isSkipped = app.status === 'skipped';

  // Progress
  $('#detail-progress-text').textContent = `${fillIdx + 1} of ${total}`;
  $('#detail-progress-fill').style.width = `${((fillIdx + 1) / total) * 100}%`;

  // Current applicant
  const avatar = $('#detail-avatar');
  avatar.textContent = isFilled ? '✓' : isSkipped ? '—' : '👤';
  avatar.style.background = isFilled ? 'rgba(5,150,105,0.15)' : isSkipped ? 'rgba(107,114,128,0.15)' : '';
  avatar.style.color = isFilled ? '#34d399' : isSkipped ? '#9ca3af' : '';

  $('#detail-applicant-name').textContent = app.name || '—';
  $('#detail-applicant-meta').textContent = `${app.passport_number || '—'} · ${app.nationality || '—'}`;

  // Badge
  const badge = $('#detail-badge');
  if (isFilled) {
    badge.style.display = '';
    badge.textContent = '✓ Filled';
    badge.style.background = 'rgba(5,150,105,0.15)';
    badge.style.color = '#34d399';
  } else if (isSkipped) {
    badge.style.display = '';
    badge.textContent = '— Skipped';
    badge.style.background = 'rgba(107,114,128,0.15)';
    badge.style.color = '#9ca3af';
  } else {
    badge.style.display = 'none';
  }

  // Fill buttons
  $('#btn-detail-fill').style.display = isFilled ? 'none' : '';
  $('#btn-detail-fill').textContent = `▶  Fill ${app.name || 'Applicant'}`;
  $('#btn-detail-refill').style.display = isFilled ? '' : 'none';

  // Nav
  $('#btn-detail-prev').disabled = fillIdx === 0;
  $('#btn-detail-next').disabled = fillIdx >= total - 1;
  $('#btn-detail-skip').disabled = fillIdx >= total - 1;

  // Queue list
  const queueEl = $('#detail-queue');
  queueEl.innerHTML = '';
  applicants.forEach((a, i) => {
    const isCurrent = i === fillIdx;
    const statusClass = a.status === 'filled' ? 'filled' : a.status === 'skipped' ? 'skipped' : isCurrent ? 'current' : '';
    const dotClass = a.status === 'filled' ? 'filled' : a.status === 'skipped' ? 'skipped' : isCurrent ? 'current' : 'pending';
    const statusLabel = a.status === 'filled' ? '✓' : a.status === 'skipped' ? '—' : isCurrent ? '→' : '';

    const item = document.createElement('div');
    item.className = `queue-item ${statusClass}`;
    item.innerHTML = `
      <span class="queue-dot ${dotClass}"></span>
      <span class="queue-name">${esc(a.name || 'Unknown')}</span>
      <span class="queue-status">${statusLabel}</span>
      <button class="queue-remove" title="Remove">✕</button>
    `;

    // Click to jump to this applicant
    item.addEventListener('click', (e) => {
      if (e.target.closest('.queue-remove')) return;
      fillIdx = i;
      renderDetail();
    });

    // Remove button
    item.querySelector('.queue-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      const applicants = getApplicants();
      applicants.splice(i, 1);
      if (applicants.length === 0) {
        delete addonData[activePortalId];
      }
      chrome.storage.local.set({ vizezAddonData: addonData });
      if (fillIdx >= applicants.length) fillIdx = Math.max(0, applicants.length - 1);
      renderDetail();
    });

    queueEl.appendChild(item);
  });
}

// ═══════════════════════════════════════════════
// FILL ACTIONS
// ═══════════════════════════════════════════════

function doFill() {
  const applicants = getApplicants();
  const app = applicants[fillIdx];
  if (!app) return;

  const fillBtn = $('#btn-detail-fill');
  fillBtn.disabled = true;
  fillBtn.textContent = '⏳ Filling...';
  fillBtn.style.background = 'var(--warn)';
  fillBtn.style.color = '#000';

  // Load data into legacy storage for content scripts
  chrome.storage.local.set({ vizezPassportData: app.data }, () => {
    // Trigger fill on active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        showToast('❌ No active tab found', 'error');
        resetFillBtn();
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'VIZEZ_AUTOFILL' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded — probably not on the right page
          showToast('❌ Not on portal page. Navigate to the portal first.', 'error');
          resetFillBtn();
          return;
        }

        if (!response) {
          showToast('❌ No response from page. Refresh and try again.', 'error');
          resetFillBtn();
          return;
        }

        if (response.status === 'error') {
          showToast(`❌ ${response.error || 'Fill failed'}`, 'error');
          resetFillBtn();
          return;
        }

        if (response.status === 'filling') {
          // Phase 1 success — mark as filled, show progress
          const msg = response.filled
            ? `✅ ${response.filled} fields filled! Sponsor section loading...`
            : '✅ Filling in progress...';
          showToast(msg, 'success');
          app.status = 'filled';
          chrome.storage.local.set({ vizezAddonData: addonData });
          resetFillBtn();
          renderDetail();
          return;
        }

        // Generic success
        showToast('✅ Fill complete!', 'success');
        app.status = 'filled';
        chrome.storage.local.set({ vizezAddonData: addonData });
        resetFillBtn();
        renderDetail();
      });
    });
  });
}

function resetFillBtn() {
  const fillBtn = $('#btn-detail-fill');
  fillBtn.disabled = false;
  fillBtn.style.background = '';
  fillBtn.style.color = '';
  const applicants = getApplicants();
  const app = applicants[fillIdx];
  fillBtn.textContent = `▶  Fill ${app?.name || 'Applicant'}`;
}

// ── Toast notification ──
function showToast(message, type = 'info') {
  // Remove existing toast
  const old = $('#vizez-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'vizez-toast';
  const bgColor = type === 'success' ? 'rgba(5,150,105,0.95)'
                : type === 'error'   ? 'rgba(220,38,38,0.95)'
                : 'rgba(124,92,252,0.95)';
  toast.style.cssText = `
    position: fixed; bottom: 12px; left: 12px; right: 12px;
    padding: 10px 14px; border-radius: 10px;
    background: ${bgColor}; color: #fff;
    font-size: 11px; font-weight: 600;
    z-index: 999; text-align: center;
    animation: toast-in 0.2s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  `;
  toast.textContent = message;

  // Add animation
  const style = document.createElement('style');
  style.textContent = '@keyframes toast-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }';
  toast.appendChild(style);

  document.body.appendChild(toast);

  // Auto remove after 4s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

$('#btn-detail-fill').addEventListener('click', doFill);

$('#btn-detail-refill').addEventListener('click', () => {
  const applicants = getApplicants();
  if (applicants[fillIdx]) {
    applicants[fillIdx].status = 'pending';
    chrome.storage.local.set({ vizezAddonData: addonData });
  }
  doFill();
});

$('#btn-detail-skip').addEventListener('click', () => {
  const applicants = getApplicants();
  if (applicants[fillIdx]) applicants[fillIdx].status = 'skipped';
  fillIdx = Math.min(fillIdx + 1, applicants.length - 1);
  chrome.storage.local.set({ vizezAddonData: addonData });
  renderDetail();
});

$('#btn-detail-prev').addEventListener('click', () => {
  fillIdx = Math.max(fillIdx - 1, 0);
  renderDetail();
});

$('#btn-detail-next').addEventListener('click', () => {
  const applicants = getApplicants();
  fillIdx = Math.min(fillIdx + 1, applicants.length - 1);
  renderDetail();
});

$('#btn-back').addEventListener('click', () => {
  showView('view-portals');
  loadPortalList(); // Refresh counts
});

$('#btn-clear-queue').addEventListener('click', () => {
  const applicants = getApplicants();
  if (!applicants.length) return;
  if (!confirm(`Clear all ${applicants.length} applicants?`)) return;
  delete addonData[activePortalId];
  chrome.storage.local.set({ vizezAddonData: addonData });
  renderDetail();
});

// ═══════════════════════════════════════════════
// URL MATCHING
// ═══════════════════════════════════════════════

function urlMatchesPattern(url, pattern) {
  if (!url || !pattern) return false;
  const regex = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  try {
    return new RegExp(regex, 'i').test(url);
  } catch {
    return url.includes(pattern.replace(/\*/g, ''));
  }
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════

$('#btn-refresh').addEventListener('click', () => {
  $('#btn-refresh').classList.add('spinning');
  loadPortalList().finally(() => {
    setTimeout(() => $('#btn-refresh').classList.remove('spinning'), 500);
  });
});

// Listen for new data from web app
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'VIZEZ_ADDON_DATA_UPDATED') {
    // Refresh portal list if we're on it
    chrome.storage.local.get(['vizezAddonData'], (result) => {
      addonData = result.vizezAddonData || {};
      if ($('#view-portals').classList.contains('active')) {
        loadPortalList();
      } else if (activePortalId) {
        renderDetail();
      }
    });
  }
});

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

async function init() {
  await checkStatus();
  await loadPortalList();
}

init();
