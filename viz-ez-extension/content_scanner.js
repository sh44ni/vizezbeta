// content_scanner.js — VizEz Portal Brain DOM Scanner
// Scans visible form fields on any page and reports them back

(function () {
  'use strict';

  // Listen for scan requests from the web app or popup
  // BUT skip if we're on a VizEz page — avoid scanning the dashboard itself
  const isVizEzPage = ['localhost:3000', 'vizez.cloud', 'viz-ez.com', 'vizez.vercel.app']
    .some(p => window.location.href.includes(p));

  if (!isVizEzPage) {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data?.type === 'VIZEZ_SCAN_REQUEST') {
        const result = scanPage();
        window.postMessage({ type: 'VIZEZ_SCAN_RESULT', payload: result }, '*');
      }
    });
  }

  // Also listen from background.js
  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'SCAN_PAGE') {
        const result = scanPage();
        sendResponse(result);
        return true;
      }
    });
  } catch (err) {
    console.warn('[VizEz Scanner] Could not register message listener:', err.message);
  }

  function scanPage() {
    const fields = [];
    const seen = new Set();

    // Scan inputs, selects, textareas
    const elements = document.querySelectorAll('input, select, textarea');

    elements.forEach((el, idx) => {
      // Skip hidden, submit, button, image, reset types
      const type = el.type?.toLowerCase() || '';
      if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) return;
      if (el.offsetParent === null && !el.closest('[style*="display"]')) return; // skip invisible

      const selector = getBestSelector(el);
      if (seen.has(selector)) return;
      seen.add(selector);

      const field = {
        selector,
        label: getLabel(el),
        type: getFieldType(el),
        required: el.required || el.getAttribute('aria-required') === 'true' || hasRequiredIndicator(el),
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || '',
        value: el.tagName === 'SELECT' ? '' : (el.value || ''),
        options: el.tagName === 'SELECT' ? getSelectOptions(el) : null,
        masked: isMaskedInput(el),
        maxLength: el.maxLength > 0 ? el.maxLength : null,
        pattern: el.pattern || null,
        sort_order: idx,
      };

      fields.push(field);
    });

    return {
      url: window.location.href,
      title: document.title,
      total_fields: fields.length,
      required_fields: fields.filter(f => f.required).length,
      language: document.documentElement.lang || detectLanguage(),
      fields,
    };
  }

  function getBestSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) {
      const byName = document.querySelectorAll(`[name="${el.name}"]`);
      if (byName.length === 1) return `[name="${el.name}"]`;
    }
    // Build a CSS path
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      let seg = current.tagName.toLowerCase();
      if (current.id) { seg = `#${current.id}`; path.unshift(seg); break; }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          seg += `:nth-of-type(${idx})`;
        }
      }
      path.unshift(seg);
      current = parent;
    }
    return path.join(' > ');
  }

  function getLabel(el) {
    // 1. aria-label
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();

    // 2. Associated <label>
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return cleanLabel(label.textContent);
    }

    // 3. Parent label
    const parentLabel = el.closest('label');
    if (parentLabel) return cleanLabel(parentLabel.textContent);

    // 4. Previous sibling label or text
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'DIV') {
        const text = prev.textContent?.trim();
        if (text && text.length < 80) return cleanLabel(text);
      }
      prev = prev.previousElementSibling;
    }

    // 5. Placeholder
    if (el.placeholder) return el.placeholder.trim();

    // 6. Name attribute as fallback
    if (el.name) return el.name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();

    return `Field ${el.id || el.name || 'unknown'}`;
  }

  function cleanLabel(text) {
    return (text || '').replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').replace(/\*+$/, '').trim().slice(0, 80);
  }

  function getFieldType(el) {
    if (el.tagName === 'SELECT') return 'select';
    if (el.tagName === 'TEXTAREA') return 'textarea';
    const type = el.type?.toLowerCase() || 'text';
    if (type === 'date' || type === 'datetime-local') return 'date';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'file') return 'file';
    if (type === 'email') return 'text';
    if (type === 'tel') return 'text';
    if (type === 'number') return 'text';
    return 'text';
  }

  function getSelectOptions(select) {
    return Array.from(select.options)
      .filter(o => o.value)
      .map(o => ({ value: o.value, text: o.text.trim() }));
  }

  function isMaskedInput(el) {
    // Detect jQuery masked input
    if (el.inputmask || el._inputmask) return true;
    const placeholder = el.placeholder || '';
    if (/^[_\-\/\s.]+$/.test(placeholder)) return true;
    return false;
  }

  function hasRequiredIndicator(el) {
    const label = getLabel(el);
    if (label.includes('*')) return true;
    // Check for visual required indicator
    const parent = el.parentElement;
    if (parent) {
      const star = parent.querySelector('.required, .req, .mandatory');
      if (star) return true;
    }
    return false;
  }

  function detectLanguage() {
    const text = document.body?.innerText?.slice(0, 500) || '';
    if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
    return 'English';
  }

  console.log('[VizEz Scanner] Ready.');
})();
