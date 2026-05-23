// content_filler.js — VizEz Generic Portal Filler Engine
// Reads a portal mapping recipe + applicant data → fills any government form
// No floating UI — all fill commands come from the extension popup's Fill tab.

(function () {
  'use strict';

  const COUNTRY_ALIASES = {
    'INDIA': ['INDIA', 'REPUBLIC OF INDIA', 'IN', 'IND'],
    'PAKISTAN': ['PAKISTAN', 'ISLAMIC REPUBLIC OF PAKISTAN', 'PK', 'PAK'],
    'BANGLADESH': ['BANGLADESH', 'PEOPLES REPUBLIC OF BANGLADESH', 'BD', 'BGD'],
    'PHILIPPINES': ['PHILIPPINES', 'REPUBLIC OF THE PHILIPPINES', 'PH', 'PHL'],
    'INDONESIA': ['INDONESIA', 'REPUBLIC OF INDONESIA', 'ID', 'IDN'],
    'SRI LANKA': ['SRI LANKA', 'DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA', 'LK', 'LKA'],
    'NEPAL': ['NEPAL', 'FEDERAL DEMOCRATIC REPUBLIC OF NEPAL', 'NP', 'NPL'],
    'EGYPT': ['EGYPT', 'ARAB REPUBLIC OF EGYPT', 'EG', 'EGY'],
    'JORDAN': ['JORDAN', 'HASHEMITE KINGDOM OF JORDAN', 'JO', 'JOR'],
    'ETHIOPIA': ['ETHIOPIA', 'FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', 'ET', 'ETH'],
    'KENYA': ['KENYA', 'REPUBLIC OF KENYA', 'KE', 'KEN'],
    'UGANDA': ['UGANDA', 'REPUBLIC OF UGANDA', 'UG', 'UGA'],
    'UNITED ARAB EMIRATES': ['UNITED ARAB EMIRATES', 'UAE', 'U.A.E.', 'AE', 'ARE'],
    'SAUDI ARABIA': ['SAUDI ARABIA', 'KINGDOM OF SAUDI ARABIA', 'SA', 'SAU', 'KSA'],
    'OMAN': ['OMAN', 'SULTANATE OF OMAN', 'OM', 'OMN'],
    'KUWAIT': ['KUWAIT', 'STATE OF KUWAIT', 'KW', 'KWT'],
    'BAHRAIN': ['BAHRAIN', 'KINGDOM OF BAHRAIN', 'BH', 'BHR'],
    'QATAR': ['QATAR', 'STATE OF QATAR', 'QA', 'QAT'],
    'CHINA': ['CHINA', 'PEOPLES REPUBLIC OF CHINA', 'CN', 'CHN'],
    'UNITED STATES': ['UNITED STATES', 'UNITED STATES OF AMERICA', 'USA', 'US', 'U.S.A.'],
    'UNITED KINGDOM': ['UNITED KINGDOM', 'GREAT BRITAIN', 'UK', 'GB', 'GBR'],
    'CANADA': ['CANADA', 'CA', 'CAN'],
    'AUSTRALIA': ['AUSTRALIA', 'AU', 'AUS'],
    'GERMANY': ['GERMANY', 'FEDERAL REPUBLIC OF GERMANY', 'DE', 'DEU'],
    'FRANCE': ['FRANCE', 'FRENCH REPUBLIC', 'FR', 'FRA'],
    'IRAN': ['IRAN', 'ISLAMIC REPUBLIC OF IRAN', 'IR', 'IRN'],
    'IRAQ': ['IRAQ', 'REPUBLIC OF IRAQ', 'IQ', 'IRQ'],
    'SYRIA': ['SYRIA', 'SYRIAN ARAB REPUBLIC', 'SY', 'SYR'],
    'YEMEN': ['YEMEN', 'REPUBLIC OF YEMEN', 'YE', 'YEM'],
    'SUDAN': ['SUDAN', 'REPUBLIC OF THE SUDAN', 'SD', 'SDN'],
    'MOROCCO': ['MOROCCO', 'KINGDOM OF MOROCCO', 'MA', 'MAR'],
    'TUNISIA': ['TUNISIA', 'REPUBLIC OF TUNISIA', 'TN', 'TUN'],
    'LEBANON': ['LEBANON', 'LEBANESE REPUBLIC', 'LB', 'LBN'],
    'MYANMAR': ['MYANMAR', 'REPUBLIC OF THE UNION OF MYANMAR', 'BURMA', 'MM', 'MMR'],
    'VIETNAM': ['VIETNAM', 'SOCIALIST REPUBLIC OF VIETNAM', 'VIET NAM', 'VN', 'VNM'],
    'THAILAND': ['THAILAND', 'KINGDOM OF THAILAND', 'TH', 'THA'],
    'MALAYSIA': ['MALAYSIA', 'MY', 'MYS'],
    'SINGAPORE': ['SINGAPORE', 'REPUBLIC OF SINGAPORE', 'SG', 'SGP'],
    'NIGERIA': ['NIGERIA', 'FEDERAL REPUBLIC OF NIGERIA', 'NG', 'NGA'],
    'GHANA': ['GHANA', 'REPUBLIC OF GHANA', 'GH', 'GHA'],
    'SOUTH AFRICA': ['SOUTH AFRICA', 'REPUBLIC OF SOUTH AFRICA', 'ZA', 'ZAF'],
    'TANZANIA': ['TANZANIA', 'UNITED REPUBLIC OF TANZANIA', 'TZ', 'TZA'],
    'CAMEROON': ['CAMEROON', 'REPUBLIC OF CAMEROON', 'CM', 'CMR'],
    'AFGHANISTAN': ['AFGHANISTAN', 'ISLAMIC REPUBLIC OF AFGHANISTAN', 'AF', 'AFG'],
    'TURKEY': ['TURKEY', 'REPUBLIC OF TURKEY', 'TURKIYE', 'TR', 'TUR'],
    'PALESTINE': ['PALESTINE', 'STATE OF PALESTINE', 'PS', 'PSE'],
    'CONGO': ['CONGO', 'REPUBLIC OF THE CONGO', 'CG', 'COG'],
    'COMOROS': ['COMOROS', 'UNION OF THE COMOROS', 'KM', 'COM'],
    'ERITREA': ['ERITREA', 'STATE OF ERITREA', 'ER', 'ERI'],
    'DJIBOUTI': ['DJIBOUTI', 'REPUBLIC OF DJIBOUTI', 'DJ', 'DJI'],
    'SOMALIA': ['SOMALIA', 'FEDERAL REPUBLIC OF SOMALIA', 'SO', 'SOM'],
    'MAURITANIA': ['MAURITANIA', 'ISLAMIC REPUBLIC OF MAURITANIA', 'MR', 'MRT'],
    'LIBYA': ['LIBYA', 'STATE OF LIBYA', 'LY', 'LBY'],
    'ALGERIA': ['ALGERIA', 'PEOPLES DEMOCRATIC REPUBLIC OF ALGERIA', 'DZ', 'DZA'],
  };

  function normalizeCountryName(name) {
    if (!name) return name;
    const upper = name.toUpperCase().trim();
    // Direct lookup
    if (COUNTRY_ALIASES[upper]) return upper;
    // Reverse lookup — find canonical name from alias
    for (const [canonical, aliases] of Object.entries(COUNTRY_ALIASES)) {
      if (aliases.some(a => a === upper)) return canonical;
    }
    return upper;
  }

  let currentMapping = null;

  // ═══════════════════════════════════════════════
  // FILL UTILITIES
  // ═══════════════════════════════════════════════

  function getElement(selector) {
    if (!selector) return null;
    try {
      if (selector.startsWith('#')) return document.getElementById(selector.slice(1));
      return document.querySelector(selector);
    } catch { return null; }
  }

  function fillText(selector, val) {
    if (!val) return false;
    const el = getElement(selector);
    if (!el) return false;
    val = String(val).trim();
    // Use native setter to bypass React/jQuery value caching
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement?.prototype
      : window.HTMLInputElement?.prototype;
    const descriptor = proto && Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) {
      descriptor.set.call(el, val);
    } else {
      el.value = val;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function fillSelect(selector, text) {
    if (!text) return false;
    const el = getElement(selector);
    if (!el || el.tagName !== 'SELECT') return false;
    const t = text.toUpperCase().trim();

    // Pass 1: exact text match
    for (let i = 0; i < el.options.length; i++) {
      if (el.options[i].text.toUpperCase().trim() === t) {
        el.selectedIndex = i;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    // Pass 2: startsWith match (avoids FEMALE matching MALE)
    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i].text.toUpperCase().trim();
      if (opt.startsWith(t) || (t.length > 3 && t.startsWith(opt))) {
        el.selectedIndex = i;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    // Pass 3: country alias normalization
    const normalized = normalizeCountryName(t);
    if (normalized !== t) {
      for (let i = 0; i < el.options.length; i++) {
        const optNorm = normalizeCountryName(el.options[i].text.toUpperCase().trim());
        if (optNorm === normalized) {
          el.selectedIndex = i;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    return false;
  }

  function fillSelectByValue(selector, val) {
    if (!val) return false;
    const el = getElement(selector);
    if (!el || el.tagName !== 'SELECT') return false;
    for (let i = 0; i < el.options.length; i++) {
      if (el.options[i].value === val) {
        el.selectedIndex = i;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  function fillMasked(selector, val) {
    if (!val) return false;
    const el = getElement(selector);
    if (!el) return false;
    val = String(val).trim();

    // Try jQuery .val() first
    if (window.jQuery) {
      try {
        window.jQuery(el).val(val).trigger('input').trigger('change');
        return true;
      } catch {}
    }

    // Simulate keypress
    el.focus();
    el.value = '';
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    for (const ch of val) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true }));
      el.value += ch;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  function fillCheckbox(selector, shouldCheck) {
    const el = getElement(selector);
    if (!el) return false;
    const check = shouldCheck === true || shouldCheck === 'checked' || shouldCheck === 'true';
    if (el.checked !== check) {
      el.click();
    }
    return true;
  }

  // ═══════════════════════════════════════════════
  // DATE REFORMATTING
  // ═══════════════════════════════════════════════

  function reformatDate(val, targetFormat) {
    if (!val || !targetFormat) return val;
    // Try to parse common input formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    let day, month, year;
    const slashParts = val.split('/');
    const dashParts = val.split('-');
    if (slashParts.length === 3) {
      [day, month, year] = slashParts;
    } else if (dashParts.length === 3) {
      if (dashParts[0].length === 4) {
        [year, month, day] = dashParts; // YYYY-MM-DD
      } else {
        [day, month, year] = dashParts; // DD-MM-YYYY
      }
    } else {
      return val; // Can't parse
    }
    // Pad values
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    if (year.length === 2) year = '20' + year;
    // Apply target format
    switch (targetFormat) {
      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
      case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
      case 'DD-MMM-YYYY': {
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const m = months[parseInt(month, 10) - 1] || month;
        return `${day}-${m}-${year}`;
      }
      default: return `${day}/${month}/${year}`;
    }
  }

  // ═══════════════════════════════════════════════
  // TRANSFORM FUNCTIONS
  // ═══════════════════════════════════════════════

  function applyTransform(val, transform) {
    if (!val || !transform) return val;
    switch (transform) {
      case 'strip_non_alnum': return val.replace(/[^A-Z0-9]/ig, '');
      case 'uppercase': return val.toUpperCase();
      case 'lowercase': return val.toLowerCase();
      case 'trim': return val.trim();
      case 'first_word': return val.split(/[\s,]+/)[0] || val;
      default:
        if (transform.startsWith('date_reformat:')) {
          return reformatDate(val, transform.split(':')[1]);
        }
        return val;
    }
  }

  // ═══════════════════════════════════════════════
  // RESOLVE SOURCE KEY → VALUE
  // ═══════════════════════════════════════════════

  function resolveValue(sourceKey, data) {
    if (!sourceKey || !data) return null;

    // sourceKey format: "passport.surname" or "work_permit.civil_id"
    const parts = sourceKey.split('.');
    if (parts.length === 2) {
      const [doc, field] = parts;
      if (doc === 'passport') {
        const pp = data.passport_data || data;
        return pp[field] || pp[toCamel(field)] || null;
      }
      if (doc === 'work_permit') {
        const wp = data.work_permit_data || data;
        return wp[field] || wp[toCamel(field)] || null;
      }
      // Generic doc prefix: try flat lookup with the full key
      const flat = data.passport_data || data;
      return flat[sourceKey] || flat[field] || flat[toCamel(field)] || null;
    }

    // Direct key lookup
    return data[sourceKey] || data[toCamel(sourceKey)] || null;
  }

  function toCamel(s) {
    return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  // ═══════════════════════════════════════════════
  // FILL ENGINE
  // ═══════════════════════════════════════════════

  function fillPortal(mapping, data) {
    return new Promise((resolve) => {
      let filled = 0;
      let skipped = 0;
      let manual = 0;
      const results = [];

      // Execute pre-actions
      if (mapping.pre_actions?.length) {
        for (const action of mapping.pre_actions) {
          executeAction(action);
        }
      }

      // Group fields by phase
      const phases = mapping.phase_groups?.length ? mapping.phase_groups : [{ name: 'All Fields', field_indices: null }];

      let phaseIdx = 0;
      function executePhase() {
        const phase = phases[phaseIdx];
        if (!phase) {
          // All phases done — report and resolve
          finishFill(filled, skipped, manual, results);
          resolve({ filled, skipped, manual, results });
          return;
        }

        // Execute trigger action if any
        if (phase.trigger_selector && phase.trigger_value) {
          fillSelect(phase.trigger_selector, phase.trigger_value);
        }

        const delay = phase.wait_before_ms || 0;

        setTimeout(() => {
          const fieldsToFill = phase.field_indices
            ? phase.field_indices.map(i => mapping.fields[i]).filter(Boolean)
            : mapping.fields;

          for (const field of fieldsToFill) {
            // Skip if already processed (for when field_indices overlap)
            if (field._filled) continue;

            if (field.fill_method === 'manual') {
              const val = field.default_value;
              if (val) {
                fillText(field.portal_selector, val);
                filled++;
                results.push({ label: field.portal_label, status: 'default', value: val });
              } else {
                manual++;
                results.push({ label: field.portal_label, status: 'manual' });
              }
              field._filled = true;
              continue;
            }

            // Resolve value from applicant data
            let val = resolveValue(field.source_key, data);
            if (val) val = applyTransform(val, field.transform);

            if (!val && field.default_value) {
              val = field.default_value;
            }

            if (!val) {
              skipped++;
              results.push({ label: field.portal_label, status: 'skipped', reason: 'no value' });
              field._filled = true;
              continue;
            }

            let success = false;
            switch (field.fill_method) {
              case 'select_by_text':
                // Try option_map first, then fuzzy
                if (field.option_map && field.option_map[val]) {
                  success = fillSelectByValue(field.portal_selector, field.option_map[val]);
                }
                if (!success) success = fillSelect(field.portal_selector, val);
                break;
              case 'masked_keypress':
                success = fillMasked(field.portal_selector, val);
                break;
              case 'checkbox':
                success = fillCheckbox(field.portal_selector, val);
                break;
              default:
                success = fillText(field.portal_selector, val);
            }

            if (success) {
              filled++;
              results.push({ label: field.portal_label, status: 'filled', value: val });
            } else {
              skipped++;
              results.push({ label: field.portal_label, status: 'element_not_found' });
            }
            field._filled = true;
          }

          phaseIdx++;
          executePhase();
        }, delay);
      }

      // Start filling
      executePhase();
    });
  }

  function executeAction(action) {
    switch (action.type) {
      case 'select':
        fillSelect(action.selector, action.value);
        break;
      case 'uncheck': {
        const el = getElement(action.selector);
        if (el?.checked) el.click();
        break;
      }
      case 'check': {
        const el = getElement(action.selector);
        if (el && !el.checked) el.click();
        break;
      }
      case 'click': {
        const el = getElement(action.selector);
        if (el) el.click();
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════
  // FILL RESULT — report to background for badge
  // ═══════════════════════════════════════════════

  function finishFill(filled, skipped, manual, results) {
    const total = filled + skipped + manual;
    // Report to background for badge update
    try {
      chrome.runtime.sendMessage({ type: 'FILL_RESULT', filled, total });
    } catch (err) {
      console.warn('[VizEz Filler] Could not report fill result:', err.message);
    }
    console.log(`[VizEz Filler] ${filled} filled, ${skipped} skipped, ${manual} manual`);
  }

  // ═══════════════════════════════════════════════
  // INIT — Just cache the matching portal (no UI)
  // ═══════════════════════════════════════════════

  function init() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_MATCHING_PORTAL', url: window.location.href }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response?.portal) {
          currentMapping = response.portal;
          console.log(`[VizEz Filler] Matched portal "${response.portal.name}" for this page.`);
        }
      });
    } catch (err) {
      console.warn('[VizEz Filler] Could not check portal match:', err.message);
    }
  }

  // ── Listen for VIZEZ_AUTOFILL message from extension popup Fill tab ──
  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'VIZEZ_AUTOFILL') {
        try {
          chrome.storage.local.get(['vizezPassportData', 'vizezActiveMapping'])
            .then(async (result) => {
              const data = result.vizezPassportData;
              if (!data || !Object.keys(data).length) {
                sendResponse({ status: 'error', error: 'No passport data in storage' });
                return;
              }

              // Broadcast to page for React-controlled forms
              window.postMessage({ type: 'VIZEZ_AUTOFILL_DATA', payload: data }, '*');

              // Check for active mapping (set by popup before fill)
              let mapping = result.vizezActiveMapping || null;

              // Fallback: try URL-based mapping lookup
              if (!mapping) {
                try {
                  const mappingResp = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ type: 'GET_STORED_MAPPING', url: window.location.href }, resolve);
                  });
                  mapping = mappingResp?.mapping || null;
                } catch (err) {
                  console.warn('[VizEz Filler] Could not fetch mapping:', err.message);
                }
              }

              if (mapping && mapping.fields && mapping.fields.length > 0) {
                console.log('[VizEz Filler] Using portal mapping:', mapping.name, '| Fields:', mapping.fields.length);
                currentMapping = mapping;
                const fillData = { passport_data: data, work_permit_data: data };
                const fillResult = await fillPortal(mapping, fillData);
                sendResponse({ status: 'filling', filled: fillResult.filled, mapping_used: true });
              } else {
                console.log('[VizEz Filler] No mapping found — broadcasting raw data for page-level handling');
                sendResponse({ status: 'filling', filled: 0, mapping_used: false });
              }

              // Clean up the active mapping from storage
              chrome.storage.local.remove('vizezActiveMapping');
            })
            .catch(err => sendResponse({ status: 'error', error: err.message }));
        } catch (err) {
          console.warn('[VizEz Filler] Context invalidated during autofill:', err.message);
          sendResponse({ status: 'error', error: 'Extension context invalidated — refresh the page.' });
        }

        return true; // async response
      }
    });
  } catch (err) {
    console.warn('[VizEz Filler] Could not register message listener:', err.message);
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
