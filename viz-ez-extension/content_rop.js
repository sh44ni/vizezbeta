// content_rop.js

function createAutofillButton() {
  const btn = document.createElement('button');
  btn.innerText = '✨ AutoFill from VizEz';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = '9999';
  btn.style.padding = '12px 24px';
  btn.style.backgroundColor = '#10B981';
  btn.style.color = '#FFFFFF';
  btn.style.border = 'none';
  btn.style.borderRadius = '8px';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '16px';
  btn.style.fontWeight = 'bold';
  btn.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    fetchAndFillData(btn);
  });

  document.body.appendChild(btn);
}

function fetchAndFillData(btn) {
  const ogText  = btn.innerText;
  const ogColor = btn.style.backgroundColor;

  btn.innerText = '⏳ AutoFilling...';
  btn.style.backgroundColor = '#F59E0B';
  btn.disabled = true;

  const finish = (msg, success) => {
    btn.innerText = (success ? '✅ ' : '❌ ') + msg;
    btn.style.backgroundColor = success ? '#10B981' : '#EF4444';
    setTimeout(() => {
      btn.innerText  = ogText;
      btn.style.backgroundColor = ogColor;
      btn.disabled = false;
    }, 4000);
  };

  try {
    chrome.runtime.sendMessage({ type: 'GET_VIZEZ_DATA' }, (response) => {
      if (chrome.runtime.lastError) { finish('Extension Error', false); return; }

      const data = response ? response.payload : null;
      if (!data) { finish('No Data Found', false); return; }

      console.log('[VizEz ROP] AutoFill data received, fields:', Object.keys(data).length);

      try {
        let filled = 0;

        // ── helpers ──────────────────────────────────────────
        const setSelect = (id, text) => {
          if (!text) return;
          const select = document.getElementById(id);
          if (!select) return;
          const t = text.toUpperCase().trim();
          // 1) Try exact match first
          for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i].text.toUpperCase().trim();
            if (opt === t) {
              select.selectedIndex = i;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              filled++;
              return;
            }
          }
          // 2) Fuzzy fallback — use startsWith (NOT includes!) to avoid
          //    'FEMALE'.includes('MALE') = true trapping Male searches.
          for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i].text.toUpperCase().trim();
            if (opt.startsWith(t) || (t.length > 3 && t.startsWith(opt))) {
              select.selectedIndex = i;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              filled++;
              return;
            }
          }
        };

        const fill = (id, val) => {
          if (!val) return;
          const el = document.getElementById(id);
          if (!el) return;
          val = String(val).trim();
          // Use native setter to bypass React/jQuery value caching
          const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          if (descriptor && descriptor.set) {
            descriptor.set.call(el, val);
          } else {
            el.value = val;
          }
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
        };

        // Special helper for jQuery Masked Input fields (e.g. Clearance Number __/________)
        // The mask plugin intercepts direct .value sets, so we must simulate typing.
        const fillMasked = (id, val) => {
          if (!val) return;
          const el = document.getElementById(id);
          if (!el) return;
          val = String(val).trim();

          // Method 1: Try jQuery .val() — masked-input hooks into $.fn.val
          if (window.jQuery) {
            try {
              window.jQuery(el).val(val).trigger('input').trigger('change');
              filled++;
              console.log('[VizEz ROP] filled masked field', id, 'via jQuery.val()');
              return;
            } catch (e) {
              console.warn('VizEz: jQuery.val() failed for', id, e);
            }
          }

          // Method 2: Simulate key-by-key input
          el.focus();
          el.value = '';  // clear first
          el.dispatchEvent(new Event('focus', { bubbles: true }));
          for (const ch of val) {
            el.dispatchEvent(new KeyboardEvent('keydown',  { key: ch, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true }));
            el.value += ch;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          filled++;
          console.log('[VizEz ROP] filled masked field', id, 'via key simulation');
        };

        // ── Global selects ────────────────────────────────────
        setSelect('ddlmode',    'New Visa');
        setSelect('ddlVisaType', 'HOUSE WORKERS');

        // Uncheck "previously obtained visa" if checked
        const chk = document.getElementById('chkPrevVisa');
        if (chk && chk.checked) { chk.click(); filled++; }

        // ── TAB 1 — Passport & Visa Details ──────────────────
        let pno = (data.passportNumber || data.passport_number || '').replace(/[^A-Z0-9]/ig, '');
        fill('txtPassportNo', pno);

        fill('txtIssueDate',  data.issueDate  || data.issue_date  || '');
        fill('txtExpiryDate', data.expiryDate || data.expiry_date || '');

        let poi = data.placeOfIssue || data.place_of_issue || '';
        if (poi.includes(',')) poi = poi.split(',')[0].trim();
        fill('txtPlaceOfIssue', poi || 'N/A');

        const nat = data.nationality || data.country || data.passport_country || '';
        setSelect('ddlIssueCountry', nat);
        setSelect('ddlNationality',  nat);

        // ── TAB 2 — Applicant Information ─────────────────────
        fill('txtSurname',    data.surname     || '');
        fill('txtFirstName',  data.first_name  || data.firstName  || '');
        fill('txtSecondName', data.second_name || data.secondName || '');
        fill('txtThirdName',  data.third_name  || data.thirdName  || '');

        // Mother's Name — we never have this data, so always use "MRS"
        fill('txtMotherName', 'MRS');

        // Gender — three-pass matching to handle any portal option format.
        // IMPORTANT: 'FEMALE'.includes('MALE') === true, so we NEVER use .includes() for gender.
        const rawGender = (data.gender || '').toUpperCase().trim();
        const genderCode = (rawGender === 'M' || rawGender === 'MALE') ? 'M'
                         : (rawGender === 'F' || rawGender === 'FEMALE') ? 'F' : '';
        const genderWord = genderCode === 'M' ? 'MALE' : genderCode === 'F' ? 'FEMALE' : '';
        console.log('[VizEz ROP] Gender resolve:', rawGender, '→', genderCode);

        if (genderCode) {
          const genderSelect = document.getElementById('ddlGender');
          if (genderSelect) {
            let genderFilled = false;

            // Pass 1: match by option VALUE attribute ('M' / 'F') — most reliable
            for (let i = 0; !genderFilled && i < genderSelect.options.length; i++) {
              if (genderSelect.options[i].value.toUpperCase().trim() === genderCode) {
                genderSelect.selectedIndex = i;
                genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
                filled++; genderFilled = true;
                console.log('[VizEz ROP] Gender set via VALUE match');
              }
            }

            // Pass 2: exact text match (e.g. option text is 'Male' / 'Female')
            for (let i = 0; !genderFilled && i < genderSelect.options.length; i++) {
              if (genderSelect.options[i].text.toUpperCase().trim() === genderWord) {
                genderSelect.selectedIndex = i;
                genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
                filled++; genderFilled = true;
                console.log('[VizEz ROP] Gender set via TEXT match');
              }
            }

            // Pass 3: startsWith match (e.g. 'Male (M)') — safe, avoids FEMALE matching MALE
            for (let i = 0; !genderFilled && i < genderSelect.options.length; i++) {
              const optText = genderSelect.options[i].text.toUpperCase().trim();
              if (optText.startsWith(genderWord)) {
                genderSelect.selectedIndex = i;
                genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
                filled++; genderFilled = true;
                console.log('[VizEz ROP] Gender set via STARTSWITH match');
              }
            }

            if (!genderFilled) {
              console.warn('VizEz: Gender NOT filled — no option matched for code:', genderCode,
                '| Available options:', Array.from(genderSelect.options).map(o => `"${o.text}" (val="${o.value}")`).join(', '));
            }
          } else {
            console.warn('VizEz: ddlGender element not found on page.');
          }
        }

        fill('txtDOB',       data.date_of_birth || data.dob || data.dateOfBirth || '');
        fill('txtBirthCity', data.city_of_birth || data.cityOfBirth || '');
        setSelect('ddlBirthCountry', data.country_of_birth || data.countryOfBirth || nat);

        // ── TAB 3 — Sponsor Details (TWO-PHASE) ───────────────
        // PHASE 1: Select "Individual" — this triggers an ASP.NET UpdatePanel
        //          postback that re-renders the sponsor sub-fields on the server.
        //          We MUST wait for the postback to finish before filling those fields.
        setSelect('ddlSponsorType', 'Individual');

        // Show progress so the user knows we're still working
        btn.innerText = '⏳ Waiting for portal… (2s)';

        // PHASE 2: After the postback settles, fill the revealed sponsor fields
        setTimeout(() => {
          try {
            fill('txtSponsorName',        data.sponsor_name           || data.sponsorName           || '');
            fill('txtSponsorOfficeNo',    data.phone_number           || data.phoneNumber           || '');
            fill('txtSponsorId',          data.civil_id               || data.civilId               || '');
            fill('txtSponsorAddress',     data.address                || '');
            fill('txtSponsorMobileNo',    data.mobile_number          || data.mobileNumber          || data.phone_number || '');
            fill('txtSponsorRelationship',data.relationship           || '');
            fill('txtOccupationCode',     data.occupation_code        || data.occupationCode        || '');
            fill('txtOccupationDescription', data.occupation_description || data.occupationDescription || '');
            fillMasked('txtClearanceNumber', data.pa_number              || data.paNumber              || '');

            // ── TAB 4 — Complete (Applying Person = same as Sponsor) ──
            fill('txtSubmittedbyID',   data.civil_id               || data.civilId               || '');
            fill('txtSubmittedbyName', data.sponsor_name           || data.sponsorName           || '');
            fill('txtSubmittedbyGSM',  data.mobile_number          || data.mobileNumber          || data.phone_number || '');
          } catch (e) {
            console.warn('VizEz: Sponsor/Complete fill error —', e);
          }

          // ── Show document preview buttons ──
          createPreviewButtons(data);

          // Final report
          if (filled === 0) {
            finish('❌ No inputs found', false);
          } else {
            finish('Filled ' + filled + ' fields!', true);
          }
        }, 2000); // 2 s — enough for the ASP.NET UpdatePanel round-trip

      } catch (err) {
        finish('❌ ' + err.message, false);
      }
    });
  } catch (err) {
    if (err.message.includes('Extension context invalidated')) {
      finish('❌ Refresh Tab Please!', false);
      console.error('VizEz: Extension was updated. Refresh the portal tab.', err);
    } else {
      finish('❌ Runtime Error', false);
      console.error(err);
    }
  }
}

// ──────────────────────────────────────────────────────
// DOCUMENT PREVIEW SYSTEM
// ──────────────────────────────────────────────────────

function createPreviewButtons(data) {
  // Remove any previously created preview buttons & overlays
  document.querySelectorAll('.vizez-preview-btn, .vizez-preview-overlay').forEach(b => b.remove());

  const passportImg = data._passportImageUrl || '';
  const workPermitImg = data._workPermitImageUrl || '';

  if (!passportImg && !workPermitImg) {
    return;
  }

  // Inject animation styles once
  if (!document.getElementById('vizez-preview-styles')) {
    const style = document.createElement('style');
    style.id = 'vizez-preview-styles';
    style.textContent = `
      @keyframes vizez-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes vizez-slideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  const baseBtnStyle = `
    position: fixed; z-index: 9998; padding: 10px 18px;
    border: none; border-radius: 8px; cursor: pointer;
    font-size: 13px; font-weight: 600; font-family: inherit;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.15s, box-shadow 0.15s;
  `;

  // Pre-create persistent overlays
  let ppOverlay = null;
  let wpOverlay = null;

  if (passportImg) {
    ppOverlay = buildOverlay(passportImg, 'Passport');
    document.body.appendChild(ppOverlay);
  }
  if (workPermitImg) {
    wpOverlay = buildOverlay(workPermitImg, 'Work Permit (Madunia)');
    document.body.appendChild(wpOverlay);
  }

  if (passportImg) {
    const ppBtn = document.createElement('button');
    ppBtn.className = 'vizez-preview-btn';
    ppBtn.innerHTML = '📄 Show Passport';
    ppBtn.style.cssText = baseBtnStyle + `
      bottom: 70px; right: 20px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
    `;
    ppBtn.onmouseenter = () => { ppBtn.style.transform = 'scale(1.04)'; ppBtn.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)'; };
    ppBtn.onmouseleave = () => { ppBtn.style.transform = 'scale(1)'; ppBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
    ppBtn.addEventListener('click', (e) => { e.preventDefault(); toggleOverlay(ppOverlay); });
    document.body.appendChild(ppBtn);
  }

  if (workPermitImg) {
    const wpBtn = document.createElement('button');
    wpBtn.className = 'vizez-preview-btn';
    wpBtn.innerHTML = '📋 Show Madunia';
    wpBtn.style.cssText = baseBtnStyle + `
      bottom: ${passportImg ? '115' : '70'}px; right: 20px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: #fff;
    `;
    wpBtn.onmouseenter = () => { wpBtn.style.transform = 'scale(1.04)'; wpBtn.style.boxShadow = '0 6px 20px rgba(139,92,246,0.4)'; };
    wpBtn.onmouseleave = () => { wpBtn.style.transform = 'scale(1)'; wpBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
    wpBtn.addEventListener('click', (e) => { e.preventDefault(); toggleOverlay(wpOverlay); });
    document.body.appendChild(wpBtn);
  }
}

// Toggle overlay visibility — minimize / restore (preserves scroll & zoom)
function toggleOverlay(overlay) {
  if (!overlay) return;
  const isHidden = overlay.style.display === 'none';
  overlay.style.display = isHidden ? 'flex' : 'none';
}

// Build a persistent overlay element (starts hidden, never destroyed)
function buildOverlay(imgSrc, title) {
  const overlay = document.createElement('div');
  overlay.className = 'vizez-preview-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.85);
    display: none; flex-direction: column; align-items: center; justify-content: center;
  `;

  // Header bar
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    width: 90%; max-width: 900px; padding: 12px 0; margin-bottom: 8px;
  `;

  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = 'color: #fff; font-size: 16px; font-weight: 600; font-family: system-ui, sans-serif;';

  // Minimize button
  const minBtn = document.createElement('button');
  minBtn.innerHTML = '▬ Minimize';
  minBtn.style.cssText = `
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
    color: #fff; padding: 6px 16px; border-radius: 6px; cursor: pointer;
    font-size: 13px; font-weight: 500; font-family: inherit;
    transition: background 0.15s;
  `;
  minBtn.onmouseenter = () => { minBtn.style.background = 'rgba(255,255,255,0.25)'; };
  minBtn.onmouseleave = () => { minBtn.style.background = 'rgba(255,255,255,0.15)'; };
  minBtn.addEventListener('click', () => { overlay.style.display = 'none'; });

  header.appendChild(titleEl);
  header.appendChild(minBtn);

  // Image container (scrollable — scroll position persists across minimize/restore)
  const imgContainer = document.createElement('div');
  imgContainer.style.cssText = `
    max-width: 90%; max-height: 80vh; overflow: auto;
    border-radius: 12px; background: #fff; padding: 8px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: vizez-slideUp 0.3s ease-out;
  `;

  const img = document.createElement('img');
  img.src = imgSrc;
  img.style.cssText = 'max-width: 100%; height: auto; display: block; border-radius: 8px;';
  img.alt = title;

  imgContainer.appendChild(img);
  overlay.appendChild(header);
  overlay.appendChild(imgContainer);

  // Minimize on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });

  // Minimize on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') {
      overlay.style.display = 'none';
    }
  });

  return overlay;
}

// ── Listen for VIZEZ_AUTOFILL from popup ──
// This allows the portal-centric popup to trigger the ROP filler
try {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'VIZEZ_AUTOFILL') {
      console.log('[VizEz ROP] VIZEZ_AUTOFILL received from popup');
      
      try {
        chrome.runtime.sendMessage({ type: 'GET_VIZEZ_DATA' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ status: 'error', error: 'Extension error: ' + chrome.runtime.lastError.message });
            return;
          }

          const data = response ? response.payload : null;
          if (!data) {
            sendResponse({ status: 'error', error: 'No data in storage. Send data from VizEz first.' });
            return;
          }

          console.log('[VizEz ROP] Filling with', Object.keys(data).length, 'fields');

          try {
            let filled = 0;

            // Helpers (same as fetchAndFillData)
            const setSelect = (id, text) => {
              if (!text) return;
              const select = document.getElementById(id);
              if (!select) return;
              const t = text.toUpperCase().trim();
              for (let i = 0; i < select.options.length; i++) {
                const opt = select.options[i].text.toUpperCase().trim();
                if (opt === t) { select.selectedIndex = i; select.dispatchEvent(new Event('change', { bubbles: true })); filled++; return; }
              }
              for (let i = 0; i < select.options.length; i++) {
                const opt = select.options[i].text.toUpperCase().trim();
                if (opt.startsWith(t) || (t.length > 3 && t.startsWith(opt))) { select.selectedIndex = i; select.dispatchEvent(new Event('change', { bubbles: true })); filled++; return; }
              }
            };

            const fill = (id, val) => {
              if (!val) return;
              const el = document.getElementById(id);
              if (!el) return;
              val = String(val).trim();
              const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
              if (descriptor && descriptor.set) { descriptor.set.call(el, val); } else { el.value = val; }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              filled++;
            };

            const fillMasked = (id, val) => {
              if (!val) return;
              const el = document.getElementById(id);
              if (!el) return;
              val = String(val).trim();
              if (window.jQuery) {
                try { window.jQuery(el).val(val).trigger('input').trigger('change'); filled++; return; } catch {}
              }
              el.focus(); el.value = '';
              for (const ch of val) {
                el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true }));
                el.value += ch;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
              }
              el.dispatchEvent(new Event('change', { bubbles: true }));
              filled++;
            };

            // Phase 1: Fill passport + applicant fields
            setSelect('ddlmode', 'New Visa');
            setSelect('ddlVisaType', 'HOUSE WORKERS');
            const chk = document.getElementById('chkPrevVisa');
            if (chk && chk.checked) { chk.click(); filled++; }

            let pno = (data.passportNumber || data.passport_number || '').replace(/[^A-Z0-9]/ig, '');
            fill('txtPassportNo', pno);
            fill('txtIssueDate', data.issueDate || data.issue_date || '');
            fill('txtExpiryDate', data.expiryDate || data.expiry_date || '');
            let poi = data.placeOfIssue || data.place_of_issue || '';
            if (poi.includes(',')) poi = poi.split(',')[0].trim();
            fill('txtPlaceOfIssue', poi || 'N/A');

            const nat = data.nationality || data.country || data.passport_country || '';
            setSelect('ddlIssueCountry', nat);
            setSelect('ddlNationality', nat);

            fill('txtSurname', data.surname || '');
            fill('txtFirstName', data.first_name || data.firstName || '');
            fill('txtSecondName', data.second_name || data.secondName || '');
            fill('txtThirdName', data.third_name || data.thirdName || '');
            fill('txtMotherName', 'MRS');

            // Gender
            const rawGender = (data.gender || '').toUpperCase().trim();
            const genderCode = (rawGender === 'M' || rawGender === 'MALE') ? 'M' : (rawGender === 'F' || rawGender === 'FEMALE') ? 'F' : '';
            const genderWord = genderCode === 'M' ? 'MALE' : genderCode === 'F' ? 'FEMALE' : '';
            if (genderCode) {
              const gs = document.getElementById('ddlGender');
              if (gs) {
                let gf = false;
                for (let i = 0; !gf && i < gs.options.length; i++) { if (gs.options[i].value.toUpperCase().trim() === genderCode) { gs.selectedIndex = i; gs.dispatchEvent(new Event('change', { bubbles: true })); filled++; gf = true; } }
                for (let i = 0; !gf && i < gs.options.length; i++) { if (gs.options[i].text.toUpperCase().trim() === genderWord) { gs.selectedIndex = i; gs.dispatchEvent(new Event('change', { bubbles: true })); filled++; gf = true; } }
              }
            }

            fill('txtDOB', data.date_of_birth || data.dob || data.dateOfBirth || '');
            fill('txtBirthCity', data.city_of_birth || data.cityOfBirth || '');
            setSelect('ddlBirthCountry', data.country_of_birth || data.countryOfBirth || nat);

            // Phase 1 report
            const phase1Filled = filled;

            // Phase 2: Sponsor fields (after ASP.NET UpdatePanel)
            setSelect('ddlSponsorType', 'Individual');

            setTimeout(() => {
              try {
                fill('txtSponsorName', data.sponsor_name || data.sponsorName || '');
                fill('txtSponsorOfficeNo', data.phone_number || data.phoneNumber || '');
                fill('txtSponsorId', data.civil_id || data.civilId || '');
                fill('txtSponsorAddress', data.address || '');
                fill('txtSponsorMobileNo', data.mobile_number || data.mobileNumber || data.phone_number || '');
                fill('txtSponsorRelationship', data.relationship || '');
                fill('txtOccupationCode', data.occupation_code || data.occupationCode || '');
                fill('txtOccupationDescription', data.occupation_description || data.occupationDescription || '');
                fillMasked('txtClearanceNumber', data.pa_number || data.paNumber || '');
                fill('txtSubmittedbyID', data.civil_id || data.civilId || '');
                fill('txtSubmittedbyName', data.sponsor_name || data.sponsorName || '');
                fill('txtSubmittedbyGSM', data.mobile_number || data.mobileNumber || data.phone_number || '');

                createPreviewButtons(data);
              } catch (e) {
                console.warn('[VizEz ROP] Phase 2 error:', e);
              }

              // Report total filled back to background/popup
              chrome.runtime.sendMessage({ type: 'FILL_COMPLETE', filled, total: filled, phase1: phase1Filled });
            }, 2000);

            // Send immediate response — phase 1 is done
            sendResponse({ status: 'filling', filled: phase1Filled, message: `Phase 1: ${phase1Filled} fields filled. Waiting for sponsor section...` });

          } catch (err) {
            sendResponse({ status: 'error', error: err.message });
          }
        });
      } catch (err) {
        sendResponse({ status: 'error', error: err.message });
      }

      return true; // async
    }
  });
} catch (err) {
  console.warn('[VizEz ROP] Could not register VIZEZ_AUTOFILL listener:', err.message);
}
