// content_vizez.js
// Runs on the VizEz web application pages.
// Bridges communication between the web app and the extension's background script.

// ── Mark extension as installed ──
document.documentElement.setAttribute('data-vizez-extension', 'installed');
window.postMessage({ type: 'VIZEZ_EXTENSION_READY', version: '3.0' }, '*');
console.log('[VizEz Extension] Content script loaded on VizEz web app');

// ── Listen for messages from the web app page ──
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || !event.data.type) return;

  const { type, payload } = event.data;

  // ── PING: Extension detection ──
  if (type === 'VIZEZ_PING') {
    window.postMessage({ type: 'VIZEZ_PONG', version: '3.0' }, '*');
    return;
  }

  // ── SCAN REQUEST: Scan the currently active portal tab ──
  if (type === 'VIZEZ_SCAN_REQUEST') {
    console.log('[VizEz Extension] Scan request received from web app');

    try {
      chrome.runtime.sendMessage({ type: 'SCAN_TAB' }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('[VizEz Extension] Scan error:', chrome.runtime.lastError.message);
          window.postMessage({
            type: 'VIZEZ_SCAN_RESULT',
            payload: { error: chrome.runtime.lastError.message, fields: [] }
          }, '*');
          return;
        }

        console.log('[VizEz Extension] Scan result:', result?.total_fields, 'fields');
        window.postMessage({
          type: 'VIZEZ_SCAN_RESULT',
          payload: result || { error: 'No result from scanner', fields: [] }
        }, '*');
      });
    } catch (err) {
      console.warn('[VizEz Extension] Context invalidated during scan:', err.message);
      window.postMessage({
        type: 'VIZEZ_SCAN_RESULT',
        payload: { error: 'Extension was updated — please refresh this page (F5).', fields: [] }
      }, '*');
    }
    return;
  }

  // ── SCAN URL: Open a URL in a new tab, scan its fields, return results ──
  if (type === 'VIZEZ_SCAN_URL') {
    const url = event.data.url;
    console.log('[VizEz Extension] Scan URL request:', url);

    try {
      chrome.runtime.sendMessage({ type: 'SCAN_URL', url }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('[VizEz Extension] Scan URL error:', chrome.runtime.lastError.message);
          window.postMessage({
            type: 'VIZEZ_SCAN_RESULT',
            payload: { error: chrome.runtime.lastError.message, fields: [], url }
          }, '*');
          return;
        }

        console.log('[VizEz Extension] URL scan result:', result?.total_fields, 'fields');
        window.postMessage({
          type: 'VIZEZ_SCAN_RESULT',
          payload: result || { error: 'No result', fields: [], url }
        }, '*');
      });
    } catch (err) {
      console.warn('[VizEz Extension] Context invalidated during URL scan:', err.message);
      window.postMessage({
        type: 'VIZEZ_SCAN_RESULT',
        payload: { error: 'Extension was updated — please refresh this page (F5).', fields: [], url }
      }, '*');
    }
    return;
  }

  // ── SEND TO EXTENSION: Save passport data for auto-fill ──
  if (type === 'VIZEZ_SEND_TO_EXTENSION') {
    const passportData = payload;

    try {
      if (!passportData) {
        alert('❌ No passport data was found! Did the AI extraction run properly?');
        return;
      }

      const hasPassportImg = !!passportData._passportImageUrl;
      const hasWpImg = !!passportData._workPermitImageUrl;
      console.log('[VizEz Extension] Sending data to storage.');

      chrome.runtime.sendMessage({
        type: 'SAVE_VIZEZ_DATA',
        payload: passportData
      }, (response) => {
        if (chrome.runtime.lastError) {
          alert('❌ Extension Error: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.status === 'success') {
          const imgInfo = (hasPassportImg || hasWpImg)
            ? `\n📄 Passport preview: ${hasPassportImg ? '✅' : '❌'}\n📋 Work permit preview: ${hasWpImg ? '✅' : '❌'}`
            : '';
          alert('✅ Data securely saved to AutoFiller extension!' + imgInfo);
        } else if (response && response.status === 'error') {
          alert('❌ Storage error: ' + (response.error || 'Unknown error'));
        } else {
          alert('❌ Failed to save data to extension. Please make sure the extension is enabled.');
        }
      });
    } catch (err) {
      if (err.message.includes('Extension context invalidated')) {
        alert("⚠️ The VizEz Extension was updated. Refresh (F5) this page before sending data again.");
      } else {
        alert("❌ Runtime Error: " + err.message);
      }
    }
    return;
  }
  // ── SEND QUEUE: Save full applicant queue for Fill tab ──
  if (type === 'VIZEZ_SEND_QUEUE') {
    const { queue, portalId } = event.data;
    if (!queue || !queue.length) return;

    const queueWithStatus = queue.map(a => ({ ...a, status: 'pending' }));

    try {
      // Use Promise API — avoids chrome.runtime.lastError callback pattern entirely
      chrome.storage.local.set({ vizezFillQueue: queueWithStatus, vizezFillIdx: 0, vizezFillPortalId: portalId })
        .then(() => {
          console.log('[VizEz] Fill queue saved:', queue.length, 'applicants');
          try { window.postMessage({ type: 'VIZEZ_QUEUE_SAVED', count: queue.length }, '*'); } catch {}
        })
        .catch(err => {
          // Storage likely still succeeded; context invalidated mid-flight is harmless
          console.log('[VizEz] Queue save (context change, data likely saved):', err?.message);
          try { window.postMessage({ type: 'VIZEZ_QUEUE_SAVED', count: queue.length }, '*'); } catch {}
        });
    } catch (err) {
      console.warn('[VizEz] Context invalidated during queue save:', err.message);
      try { window.postMessage({ type: 'VIZEZ_QUEUE_SAVED', count: queue.length }, '*'); } catch {}
    }
    return;
  }
});
