// popup.js — VizEz Portal Brain Popup v3

// Production API base — change to localhost:4000 for development
const API_BASE = 'https://earlyaccess.vizez.cloud';
const DEV_API_BASE = 'http://localhost:4000';

// Auto-detect: use dev if extension is loaded unpacked (has no update_url)
const isDev = !chrome.runtime.getManifest().update_url;
const ACTIVE_API_BASE = isDev ? DEV_API_BASE : API_BASE;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const statusDot = $('#status-dot');
const statusText = $('#status-text');
const btnRefresh = $('#btn-refresh');
const portalsLoading = $('#portals-loading');
const portalsEmpty = $('#portals-empty');
const portalsList = $('#portals-list');
const dataLoading = $('#data-loading');
const dataEmpty = $('#data-empty');
const dataList = $('#data-list');
const dataLoaded = $('#data-loaded');
const loadedName = $('#loaded-name');
const loadedDetail = $('#loaded-detail');
const btnClearData = $('#btn-clear-data');
const btnScan = $('#btn-scan');
const scanResult = $('#scan-result');
const scanTotal = $('#scan-total');
const scanRequired = $('#scan-required');
const scanSelects = $('#scan-selects');

// Fill queue refs
const fillEmpty = $('#fill-empty');
const fillQueueEl = $('#fill-queue');
const fillProgressText = $('#fill-progress-text');
const fillProgressFill = $('#fill-progress-fill');
const fillAvatar = $('#fill-avatar');
const fillNameEl = $('#fill-name');
const fillDetailEl = $('#fill-detail');
const fillStatusBadge = $('#fill-status-badge');
const btnFill = $('#btn-fill');
const btnRefill = $('#btn-refill');
const btnPrev = $('#btn-prev');
const btnSkip = $('#btn-skip');
const btnNext = $('#btn-next');

// ═══════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════

$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    $(`#tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'fill') renderFillQueue();
  });
});

// ═══════════════════════════════════════════════
// BACKEND STATUS
// ═══════════════════════════════════════════════

async function checkStatus() {
  try {
    await fetch(`${ACTIVE_API_BASE}/api/health`);
    statusDot.className = 'status-dot online';
    statusText.textContent = 'Connected to VizEz backend';
    return true;
  } catch {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Backend offline — start server';
    return false;
  }
}

// ═══════════════════════════════════════════════
// FILL QUEUE
// ═══════════════════════════════════════════════

let fillQueueData = [];
let fillIdx = 0;
let fillQueueLoaded = false;

// Load queue from backend (only on init / tab switch)
function loadFillQueue() {
  fetch(`${ACTIVE_API_BASE}/api/fill-queue`)
    .then(r => r.ok ? r.json() : Promise.reject('no queue'))
    .then(data => {
      fillQueueData = data.queue || [];
      // Restore local idx if we already have one
      chrome.storage.local.get(['vizezFillIdx'], (result) => {
        fillIdx = result.vizezFillIdx || 0;
        if (fillIdx >= fillQueueData.length) fillIdx = 0;
        chrome.storage.local.set({ vizezFillQueue: fillQueueData });
        fillQueueLoaded = true;
        _renderQueue();
      });
    })
    .catch(() => {
      chrome.storage.local.get(['vizezFillQueue', 'vizezFillIdx'], (result) => {
        fillQueueData = result.vizezFillQueue || [];
        fillIdx = result.vizezFillIdx || 0;
        fillQueueLoaded = true;
        _renderQueue();
      });
    });
}

// Just re-render from local state (no fetch)
function renderFillQueue() {
  if (!fillQueueLoaded) return loadFillQueue();
  _renderQueue();
}

function _renderQueue() {
    if (fillQueueData.length === 0) {
      fillEmpty.style.display = '';
      fillQueueEl.style.display = 'none';
      return;
    }

    fillEmpty.style.display = 'none';
    fillQueueEl.style.display = '';

    const app = fillQueueData[fillIdx] || fillQueueData[0];
    const total = fillQueueData.length;
    const isFilled = app.status === 'filled';
    const isSkipped = app.status === 'skipped';

    fillProgressText.textContent = `${fillIdx + 1} of ${total}`;
    fillProgressFill.style.width = `${((fillIdx + 1) / total) * 100}%`;

    fillAvatar.textContent = isFilled ? '✓' : isSkipped ? '—' : '👤';
    fillAvatar.style.background = isFilled ? '#059669' : isSkipped ? '#4b5563' : '';
    fillAvatar.style.color = (isFilled || isSkipped) ? '#fff' : '';
    fillNameEl.textContent = app.name || '—';
    fillDetailEl.textContent = `${app.nationality || ''} · ${app.passport_number || ''}`;

    if (isFilled) {
      fillStatusBadge.style.display = '';
      fillStatusBadge.textContent = '✓ Filled';
      fillStatusBadge.style.background = 'rgba(5,150,105,0.15)';
      fillStatusBadge.style.color = '#34d399';
    } else if (isSkipped) {
      fillStatusBadge.style.display = '';
      fillStatusBadge.textContent = '— Skipped';
      fillStatusBadge.style.background = 'rgba(107,114,128,0.15)';
      fillStatusBadge.style.color = '#9ca3af';
    } else {
      fillStatusBadge.style.display = 'none';
    }

    btnFill.style.display = isFilled ? 'none' : '';
    btnFill.textContent = `▶  Fill ${fillIdx + 1}. ${app.name}`;
    btnRefill.style.display = isFilled ? '' : 'none';
    btnPrev.disabled = fillIdx === 0;
    btnSkip.style.display = '';
    btnNext.style.display = '';
    btnNext.disabled = fillIdx >= total - 1;
    btnSkip.disabled = fillIdx >= total - 1;
}

function saveQueueState() {
  chrome.storage.local.set({ vizezFillQueue: fillQueueData, vizezFillIdx: fillIdx });
}

function doFill() {
  const app = fillQueueData[fillIdx];
  if (!app) return;
  chrome.storage.local.set({ vizezPassportData: app.payload }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'VIZEZ_AUTOFILL' });
      }
    });
    fillQueueData[fillIdx].status = 'filled';
    saveQueueState();
    _renderQueue();
  });
}

btnFill.addEventListener('click', doFill);

btnRefill.addEventListener('click', () => {
  fillQueueData[fillIdx].status = 'pending';
  saveQueueState();
  doFill();
});

btnSkip.addEventListener('click', () => {
  fillQueueData[fillIdx].status = 'skipped';
  fillIdx = Math.min(fillIdx + 1, fillQueueData.length - 1);
  saveQueueState();
  _renderQueue();
});

btnPrev.addEventListener('click', () => {
  fillIdx = Math.max(fillIdx - 1, 0);
  saveQueueState();
  _renderQueue();
});

btnNext.addEventListener('click', () => {
  fillIdx = Math.min(fillIdx + 1, fillQueueData.length - 1);
  saveQueueState();
  _renderQueue();
});

// Listen for queue from web app (via background.js relay)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'VIZEZ_SEND_QUEUE' && msg.queue) {
    fillQueueData = msg.queue.map(a => ({ ...a, status: 'pending' }));
    fillIdx = 0;
    saveQueueState();
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    $('[data-tab="fill"]').classList.add('active');
    $('#tab-fill').classList.add('active');
    renderFillQueue();
  }
});

// ═══════════════════════════════════════════════
// PORTALS TAB
// ═══════════════════════════════════════════════

async function loadPortals() {
  portalsLoading.style.display = '';
  portalsEmpty.style.display = 'none';
  portalsList.style.display = 'none';

  try {
    const resp = await fetch(`${ACTIVE_API_BASE}/api/portals`);
    const data = await resp.json();
    const portals = data.portals || [];

    chrome.storage.local.set({ vizezPortalList: portals });
    portalsLoading.style.display = 'none';

    if (portals.length === 0) { portalsEmpty.style.display = ''; return; }

    portalsList.style.display = '';
    portalsList.innerHTML = '';

    for (const p of portals) {
      const card = document.createElement('div');
      card.className = 'portal-card';
      const dotClass = p.status === 'active' ? 'active' : p.status === 'needs_remap' ? 'remap' : 'disabled';

      card.innerHTML = `
        <div class="card-dot ${dotClass}"></div>
        <div class="card-body">
          <div class="card-title">${esc(p.name)}</div>
          <div class="card-meta">
            <span>${esc(p.url_pattern)}</span>
            <span>${timeAgo(p.updated_at)}</span>
          </div>
        </div>
        <span class="card-badge fields">${p.field_count || 0} fields</span>
        ${(p.manual_count || 0) > 0 ? `<span class="card-badge" style="background:var(--warn-soft);color:var(--warn)">${p.manual_count} manual</span>` : ''}
        <svg class="card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      `;

      card.addEventListener('click', async () => {
        card.style.borderColor = 'var(--accent)';
        try {
          const resp = await fetch(`${ACTIVE_API_BASE}/api/portals/${p.id}`);
          const data = await resp.json();
          if (data.portal) {
            chrome.storage.local.get(['vizezMappings'], (result) => {
              const mappings = result.vizezMappings || {};
              mappings[p.id] = data.portal;
              chrome.storage.local.set({ vizezMappings: mappings }, () => {
                card.querySelector('.card-dot').className = 'card-dot active';
                setTimeout(() => { card.style.borderColor = ''; }, 1000);
              });
            });
          }
        } catch {
          card.style.borderColor = 'var(--error)';
          setTimeout(() => { card.style.borderColor = ''; }, 2000);
        }
      });

      portalsList.appendChild(card);
    }
  } catch {
    portalsLoading.style.display = 'none';
    portalsEmpty.style.display = '';
  }
}

// ═══════════════════════════════════════════════
// DATA TAB
// ═══════════════════════════════════════════════

async function loadApplicants() {
  dataLoading.style.display = '';
  dataEmpty.style.display = 'none';
  dataList.style.display = 'none';

  chrome.storage.local.get(['vizezPassportData'], (result) => {
    if (result.vizezPassportData && Object.keys(result.vizezPassportData).length > 0) {
      const d = result.vizezPassportData;
      dataLoaded.style.display = '';
      loadedName.textContent = d.full_name || d.fullName || d.given_names || '—';
      loadedDetail.textContent = `${d.passport_number || d.passportNumber || '—'} • Ready to fill`;
    }
  });

  try {
    const resp = await fetch(`${ACTIVE_API_BASE}/api/applicants?limit=10`);
    const data = await resp.json();
    const applicants = data.applicants || [];

    dataLoading.style.display = 'none';
    if (applicants.length === 0) { dataEmpty.style.display = ''; return; }

    dataList.style.display = '';
    dataList.innerHTML = '';

    for (const a of applicants) {
      const card = document.createElement('div');
      card.className = 'applicant-card';
      card.innerHTML = `
        <div class="card-dot ${a.mrz_quality === 'VERIFIED' ? 'active' : 'remap'}"></div>
        <div class="card-body">
          <div class="card-title">${esc(a.name)}</div>
          <div class="card-meta">
            <span>${esc(a.passport_number || '—')}</span>
            <span>${esc(a.nationality || '—')}</span>
            <span>${timeAgo(a.created_at)}</span>
          </div>
        </div>
        ${a.has_work_permit ? '<span class="card-badge wp">WP</span>' : ''}
        <span class="card-badge loaded" style="display:none">Loaded</span>
        <svg class="card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      `;

      card.addEventListener('click', async () => {
        try {
          const resp = await fetch(`${ACTIVE_API_BASE}/api/applicants/${a.id}`);
          const fillData = await resp.json();
          chrome.storage.local.set({ vizezPassportData: fillData.fill_data || fillData }, () => {
            dataLoaded.style.display = '';
            loadedName.textContent = a.name;
            loadedDetail.textContent = `${a.passport_number || '—'} • Ready to fill`;
            $$('.applicant-card .card-badge.loaded').forEach(b => b.style.display = 'none');
            card.querySelector('.card-badge.loaded').style.display = '';
            card.style.borderColor = 'var(--success)';
            setTimeout(() => { card.style.borderColor = ''; }, 1500);
          });
        } catch {
          card.style.borderColor = 'var(--error)';
          setTimeout(() => { card.style.borderColor = ''; }, 2000);
        }
      });

      dataList.appendChild(card);
    }
  } catch {
    dataLoading.style.display = 'none';
    dataEmpty.style.display = '';
  }
}

// ═══════════════════════════════════════════════
// SCAN TAB
// ═══════════════════════════════════════════════

btnScan.addEventListener('click', () => {
  btnScan.disabled = true;
  btnScan.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></div> Scanning...';
  chrome.runtime.sendMessage({ type: 'SCAN_TAB' }, (result) => {
    btnScan.disabled = false;
    btnScan.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> Scan Page Fields`;
    if (result?.error) { scanResult.style.display = 'none'; alert(result.error); return; }
    if (result?.fields) {
      scanResult.style.display = '';
      scanTotal.textContent = result.total_fields || result.fields.length;
      scanRequired.textContent = result.required_fields || result.fields.filter(f => f.required).length;
      scanSelects.textContent = result.fields.filter(f => f.type === 'select').length;
    }
  });
});

// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════

btnRefresh.addEventListener('click', () => {
  btnRefresh.classList.add('spinning');
  Promise.all([loadPortals(), loadApplicants()]).finally(() => {
    setTimeout(() => btnRefresh.classList.remove('spinning'), 500);
  });
});

btnClearData.addEventListener('click', () => {
  chrome.storage.local.remove(['vizezPassportData'], () => {
    dataLoaded.style.display = 'none';
    $$('.applicant-card .card-badge.loaded').forEach(b => b.style.display = 'none');
  });
});

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

async function init() {
  const online = await checkStatus();
  if (online) {
    await Promise.all([loadPortals(), loadApplicants()]);
  } else {
    portalsLoading.style.display = 'none';
    portalsEmpty.style.display = '';
    dataLoading.style.display = 'none';
    dataEmpty.style.display = '';
  }
  renderFillQueue();
}

init();
