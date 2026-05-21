// background.js — VizEz Portal Brain v2
//
// Dual-mode data bridge:
//   MODE 1 (Legacy): VizEz web app → postMessage → content_vizez.js → SAVE_VIZEZ_DATA → chrome.storage
//   MODE 2 (API):    Popup → FETCH_APPLICANTS → backend API → select → fill
//
// Storage strategy:
//   - Field data (text)   → chrome.storage.local   (persists across browser restarts)
//   - Image data (base64) → chrome.storage.session  (session only, no per-item size limit)
//   - API cache            → chrome.storage.session  (transient)

// Always use production API — extension is sideloaded so update_url detection won't work
const API_BASE = 'https://earlyaccess.vizez.cloud';
const ACTIVE_API_BASE = API_BASE;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ═══════════════════════════════════════════════════════════════
  // LEGACY MODE — Direct postMessage from VizEz web app
  // ═══════════════════════════════════════════════════════════════

  // ── SAVE (from content_vizez.js) ──
  if (message.type === 'SAVE_VIZEZ_DATA') {
    const payload = message.payload || {};
    const addon = message.addon || null;
    const { _passportImageUrl, _workPermitImageUrl, ...fieldData } = payload;

    const hasPassportImg = !!_passportImageUrl;
    const hasWpImg       = !!_workPermitImageUrl;

    console.log('VizEz: Saving data. Fields:', Object.keys(fieldData).length,
                '| Passport image:', hasPassportImg, '| WP image:', hasWpImg,
                '| Addon:', addon?.id || 'default');

    // Save to legacy key (backward compat)
    chrome.storage.local.set({ vizezPassportData: fieldData }, () => {
      if (chrome.runtime.lastError) {
        console.error('VizEz: Failed to save field data —', chrome.runtime.lastError.message);
        sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
        return;
      }

      // Also save to addon-scoped storage
      const addonId = addon?.id || 'default';
      chrome.storage.local.get(['vizezAddonData'], (addonResult) => {
        const addonData = addonResult.vizezAddonData || {};
        if (!addonData[addonId]) {
          addonData[addonId] = { name: addon?.name || 'Portal', applicants: [] };
        }

        // Add applicant to this addon's list
        addonData[addonId].applicants.push({
          name: `${fieldData.surname || ''} ${fieldData.first_name || ''}`.trim() || 'Unknown',
          nationality: fieldData.nationality || '',
          passport_number: fieldData.passport_number || '',
          data: fieldData,
          timestamp: Date.now(),
        });

        chrome.storage.local.set({ vizezAddonData: addonData }, () => {
          console.log('VizEz: Addon data saved. Addon:', addonId,
                      '| Total applicants:', addonData[addonId].applicants.length);
        });
      });

      // Save images to session storage
      const imageData = {};
      if (_passportImageUrl)  imageData.vizezPassportImg  = _passportImageUrl;
      if (_workPermitImageUrl) imageData.vizezWorkPermitImg = _workPermitImageUrl;

      if (Object.keys(imageData).length === 0) {
        console.log('VizEz: No images to save. Field data saved successfully.');
        sendResponse({ status: 'success' });
        return;
      }

      chrome.storage.session.set(imageData, () => {
        if (chrome.runtime.lastError) {
          console.warn('VizEz: Image save failed (session storage) —', chrome.runtime.lastError.message);
          sendResponse({ status: 'success', warning: 'Images could not be saved: ' + chrome.runtime.lastError.message });
        } else {
          console.log('VizEz: All data saved. Fields → local, Images → session.');
          sendResponse({ status: 'success' });
        }
      });
    });

    return true;
  }

  // ── GET (from content_rop.js) ──
  if (message.type === 'GET_VIZEZ_DATA') {
    chrome.storage.local.get(['vizezPassportData'], (localResult) => {
      if (chrome.runtime.lastError) {
        console.error('VizEz: Failed to retrieve field data —', chrome.runtime.lastError.message);
        sendResponse({ payload: null });
        return;
      }

      const fieldData = localResult.vizezPassportData || null;

      if (!fieldData) {
        console.log('VizEz: No data found in local storage.');
        sendResponse({ payload: null });
        return;
      }

      chrome.storage.session.get(['vizezPassportImg', 'vizezWorkPermitImg'], (sessionResult) => {
        if (chrome.runtime.lastError) {
          console.warn('VizEz: Could not retrieve session images —', chrome.runtime.lastError.message);
          sendResponse({ payload: fieldData });
          return;
        }

        const merged = {
          ...fieldData,
          _passportImageUrl:   sessionResult.vizezPassportImg   || '',
          _workPermitImageUrl: sessionResult.vizezWorkPermitImg || '',
        };

        console.log('VizEz: Retrieved data. Fields:', Object.keys(fieldData).length,
                    '| Has passport image:', !!sessionResult.vizezPassportImg,
                    '| Has WP image:', !!sessionResult.vizezWorkPermitImg);

        sendResponse({ payload: merged });
      });
    });

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // API MODE — Popup communicates with backend
  // ═══════════════════════════════════════════════════════════════

  // ── Fetch applicant list from backend ──
  if (message.type === 'FETCH_APPLICANTS') {
    fetch(`${ACTIVE_API_BASE}/api/applicants?limit=50`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── Fetch single applicant details ──
  if (message.type === 'FETCH_APPLICANT') {
    fetch(`${ACTIVE_API_BASE}/api/applicants/${message.id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── Load applicant data into storage (for content_rop.js to use) ──
  if (message.type === 'LOAD_APPLICANT_TO_STORAGE') {
    const appData = message.applicantData;
    if (!appData) { sendResponse({ status: 'error', error: 'No data' }); return true; }

    // Convert API format → legacy format that content_rop.js expects
    const pp = appData.passport_data || {};
    const wp = appData.work_permit_data || {};

    const legacyData = {
      // Passport fields (content_rop.js format)
      passport_number: pp.passport_number || '',
      passportNumber: pp.passport_number || '',
      surname: pp.surname || '',
      first_name: pp.first_name || '',
      firstName: pp.first_name || '',
      second_name: pp.second_name || '',
      secondName: pp.second_name || '',
      third_name: pp.third_name || '',
      thirdName: pp.third_name || '',
      nationality: pp.nationality || pp.passport_country || '',
      country: pp.passport_country || pp.nationality || '',
      passport_country: pp.passport_country || '',
      date_of_birth: pp.date_of_birth || '',
      dob: pp.date_of_birth || '',
      dateOfBirth: pp.date_of_birth || '',
      gender: pp.gender || '',
      city_of_birth: pp.city_of_birth || '',
      cityOfBirth: pp.city_of_birth || '',
      country_of_birth: pp.country_of_birth || '',
      countryOfBirth: pp.country_of_birth || '',
      issue_date: pp.issue_date || '',
      issueDate: pp.issue_date || '',
      expiry_date: pp.expiry_date || '',
      expiryDate: pp.expiry_date || '',
      place_of_issue: pp.place_of_issue || '',
      placeOfIssue: pp.place_of_issue || '',

      // Work permit fields
      sponsor_name: wp.sponsor_name || '',
      sponsorName: wp.sponsor_name || '',
      civil_id: wp.civil_id || '',
      civilId: wp.civil_id || '',
      phone_number: wp.phone_number || '',
      phoneNumber: wp.phone_number || '',
      mobile_number: wp.mobile_number || '',
      mobileNumber: wp.mobile_number || '',
      address: wp.address || '',
      relationship: wp.relationship || '',
      occupation_code: wp.occupation_code || '',
      occupationCode: wp.occupation_code || '',
      occupation_description: wp.occupation_description || '',
      occupationDescription: wp.occupation_description || '',
      pa_number: wp.pa_number || '',
      paNumber: wp.pa_number || '',
      wfpa_number: wp.wfpa_number || '',
    };

    chrome.storage.local.set({ vizezPassportData: legacyData }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
      } else {
        console.log('VizEz: Applicant data loaded into storage for portal fill.');
        sendResponse({ status: 'success' });
      }
    });

    return true;
  }

  // ── Fill result badge update ──
  if (message.type === 'FILL_RESULT') {
    const { filled, total } = message;
    chrome.action.setBadgeText({ text: `${filled}`, tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: filled === total ? '#34d399' : '#7c5cfc' });
    return false;
  }

  // ── Force paste ──
  if (message.type === 'FORCE_PASTE') {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      func: () => {
        const events = ['copy', 'paste', 'cut', 'contextmenu', 'dragstart', 'selectstart'];
        events.forEach(evt => {
          document.addEventListener(evt, (e) => { e.stopPropagation(); }, true);
        });
        const style = document.createElement('style');
        style.textContent = `* { -webkit-user-select: auto !important; user-select: auto !important; }`;
        document.head.appendChild(style);
      },
    });
    return false;
  }

  // ── Check backend health ──
  if (message.type === 'CHECK_BACKEND') {
    fetch(`${ACTIVE_API_BASE}/api/health`)
      .then(r => r.json())
      .then(data => sendResponse({ connected: true, ...data }))
      .catch(() => sendResponse({ connected: false }));
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // PORTAL MAPPER — Mapping management
  // ═══════════════════════════════════════════════════════════════

  // ── Fetch all portals from backend ──
  if (message.type === 'FETCH_PORTALS') {
    fetch(`${ACTIVE_API_BASE}/api/portals`)
      .then(r => r.json())
      .then(data => {
        // Cache portal list for URL matching
        chrome.storage.local.set({ vizezPortalList: data.portals || [] });
        sendResponse(data);
      })
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── Fetch single portal mapping from backend ──
  if (message.type === 'FETCH_PORTAL_MAPPING') {
    fetch(`${ACTIVE_API_BASE}/api/portals/${message.portalId}`)
      .then(r => r.json())
      .then(data => {
        // Cache the mapping locally
        if (data.portal) {
          chrome.storage.local.get(['vizezMappings'], (result) => {
            const mappings = result.vizezMappings || {};
            mappings[data.portal.id] = data.portal;
            chrome.storage.local.set({ vizezMappings: mappings });
          });
        }
        sendResponse(data);
      })
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── Check if current URL matches any saved portal ──
  if (message.type === 'GET_MATCHING_PORTAL') {
    const url = message.url;
    chrome.storage.local.get(['vizezPortalList', 'vizezMappings'], (result) => {
      const portals = result.vizezPortalList || [];
      const mappings = result.vizezMappings || {};

      for (const p of portals) {
        if (urlMatchesPattern(url, p.url_pattern)) {
          // Return cached mapping if available
          if (mappings[p.id]) {
            sendResponse({ portal: mappings[p.id] });
          } else {
            // Fetch from backend
            fetch(`${ACTIVE_API_BASE}/api/portals/${p.id}`)
              .then(r => r.json())
              .then(data => {
                if (data.portal) {
                  mappings[p.id] = data.portal;
                  chrome.storage.local.set({ vizezMappings: mappings });
                  sendResponse({ portal: data.portal });
                } else {
                  sendResponse({ portal: null });
                }
              })
              .catch(() => sendResponse({ portal: null }));
          }
          return;
        }
      }
      sendResponse({ portal: null });
    });
    return true;
  }

  // ── Get stored mapping for a URL ──
  if (message.type === 'GET_STORED_MAPPING') {
    const url = message.url;
    chrome.storage.local.get(['vizezPortalList', 'vizezMappings'], (result) => {
      const portals = result.vizezPortalList || [];
      const mappings = result.vizezMappings || {};

      for (const p of portals) {
        if (urlMatchesPattern(url, p.url_pattern) && mappings[p.id]) {
          sendResponse({ mapping: mappings[p.id] });
          return;
        }
      }
      sendResponse({ mapping: null });
    });
    return true;
  }

  // ── Trigger scan on active tab (or most recent non-VizEz tab) ──
  if (message.type === 'SCAN_TAB') {
    chrome.tabs.query({ currentWindow: true }, (allTabs) => {
      if (!allTabs?.length) { sendResponse({ error: 'No tabs found' }); return; }

      // Skip VizEz dashboard and extension pages
      const vizezPatterns = ['localhost:3000', 'vizez.cloud', 'viz-ez.com', 'chrome-extension://','chrome://'];
      const candidates = allTabs.filter(t =>
        t.url && !vizezPatterns.some(p => t.url.includes(p))
      );

      // Prefer the active non-VizEz tab, else the most recently accessed one
      let target = candidates.find(t => t.active);
      if (!target && candidates.length) {
        // Sort by lastAccessed descending (most recent first)
        candidates.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
        target = candidates[0];
      }

      if (!target) {
        sendResponse({ error: 'No portal tab found. Open the government portal in another tab first.' });
        return;
      }

      console.log('[VizEz] SCAN_TAB: Scanning tab', target.id, target.url);
      chrome.tabs.sendMessage(target.id, { type: 'SCAN_PAGE' }, (result) => {
        if (chrome.runtime.lastError) {
          // Try injecting the scanner
          tryScan(target.id, sendResponse, () => {});
        } else {
          sendResponse(result);
        }
      });
    });
    return true;
  }

  // ── Scan a URL: open tab → wait → scan → return results ──
  if (message.type === 'SCAN_URL') {
    const url = message.url;
    if (!url) { sendResponse({ error: 'No URL provided' }); return true; }

    console.log('[VizEz] SCAN_URL: Opening', url);

    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: 'Failed to open tab: ' + chrome.runtime.lastError.message });
        return;
      }

      const tabId = tab.id;
      const TIMEOUT = 30000; // 30s max wait
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn('[VizEz] SCAN_URL: Timeout waiting for page load');
        // Try scanning anyway
        tryScan(tabId, sendResponse, () => {
          chrome.tabs.remove(tabId).catch(() => {});
        });
      }, TIMEOUT);

      // Listen for tab to finish loading
      const onUpdated = (updatedTabId, changeInfo) => {
        if (updatedTabId !== tabId) return;
        if (changeInfo.status !== 'complete') return;
        if (settled) return;
        settled = true;
        clearTimeout(timeout);

        chrome.tabs.onUpdated.removeListener(onUpdated);

        // Give the page a moment to render its dynamic content
        setTimeout(() => {
          tryScan(tabId, sendResponse, () => {
            // Close the tab after scanning
            chrome.tabs.remove(tabId).catch(() => {});
          });
        }, 2000);
      };

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
    return true;
  }

  // ── Refresh portal cache from backend ──
  if (message.type === 'REFRESH_PORTALS') {
    fetch(`${ACTIVE_API_BASE}/api/portals`)
      .then(r => r.json())
      .then(async (data) => {
        const portals = data.portals || [];
        chrome.storage.local.set({ vizezPortalList: portals });
        const mappings = {};
        for (const p of portals) {
          try {
            const r = await fetch(`${ACTIVE_API_BASE}/api/portals/${p.id}`);
            const d = await r.json();
            if (d.portal) mappings[p.id] = d.portal;
          } catch {}
        }
        chrome.storage.local.set({ vizezMappings: mappings });
        sendResponse({ status: 'ok', count: portals.length });
      })
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── Save fill queue from web app ──
  if (message.type === 'SAVE_FILL_QUEUE') {
    const queue = (message.queue || []).map(a => ({ ...a, status: 'pending' }));
    chrome.storage.local.set({ vizezFillQueue: queue, vizezFillIdx: 0 }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
      } else {
        console.log('VizEz: Fill queue saved:', queue.length, 'applicants');
        sendResponse({ status: 'success', count: queue.length });
      }
    });
    return true;
  }
});

// ── URL Pattern Matcher ──
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

// ── Scan a tab by ID (used by SCAN_URL) ──
function tryScan(tabId, sendResponse, onDone) {
  // First try sending to the already-loaded scanner
  chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (result) => {
    if (chrome.runtime.lastError) {
      // Scanner not loaded — inject it manually
      console.log('[VizEz] Scanner not loaded, injecting...');
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content_scanner.js'],
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[VizEz] Failed to inject scanner:', chrome.runtime.lastError.message);
          sendResponse({ error: 'Cannot access this page. It may block extensions.' });
          if (onDone) onDone();
          return;
        }
        // Now try scanning again
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (result2) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: 'Scanner injection failed' });
            } else {
              console.log('[VizEz] Scan complete:', result2?.total_fields, 'fields');
              sendResponse(result2 || { error: 'Empty result', fields: [] });
            }
            if (onDone) onDone();
          });
        }, 500);
      });
    } else {
      console.log('[VizEz] Scan complete:', result?.total_fields, 'fields');
      sendResponse(result || { error: 'Empty result', fields: [] });
      if (onDone) onDone();
    }
  });
}

// ── Badge reset on tab switch ──
chrome.tabs.onActivated.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});

// ── On install/update: refresh portal cache ──
chrome.runtime.onInstalled.addListener(() => {
  fetch(`${ACTIVE_API_BASE}/api/portals`)
    .then(r => r.json())
    .then(data => {
      chrome.storage.local.set({ vizezPortalList: data.portals || [] });
      console.log('VizEz: Portal list cached on install.');
    })
    .catch(() => {});
});
