import crypto from 'crypto';
import https from 'https';

// In-memory store for sessions
// sessionId -> { viewState, viewStateGenerator, eventValidation, captchaToken, cookies }
const sessions = new Map();

const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
const ROP_BASE = 'https://www.rop.gov.om';

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Helper to manually fetch and handle cookies since we need precise control over redirects
function fetchWithManualRedirect(url, options) {
  return fetch(url, { ...options, redirect: 'manual' });
}

export async function handleRopAutoSubmitInit(req, res) {
  try {
    const response = await fetchWithManualRedirect(ROP_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok && response.status !== 302) {
      throw new Error(`Failed to load ROP portal, status: ${response.status}`);
    }

    const html = await response.text();
    const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    
    // Extract hidden fields
    const viewStateMatch = html.match(/id="__VIEWSTATE"\s+value="([^"]*)"/);
    const viewStateGeneratorMatch = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
    const eventValidationMatch = html.match(/id="__EVENTVALIDATION"\s+value="([^"]*)"/);
    const captchaTokenMatch = html.match(/id="LBD_VCID_c_en_applyfornewvisa_samplecaptcha"\s+value="([^"]*)"/);
    const captchaImageSrcMatch = html.match(/<img\s+id="c_en_applyfornewvisa_samplecaptcha_CaptchaImage"[^>]+src="([^"]+)"/);

    if (!viewStateMatch || !captchaTokenMatch || !captchaImageSrcMatch) {
      throw new Error('Failed to extract necessary form fields from ROP portal. The portal might have changed.');
    }

    const viewState = viewStateMatch[1];
    const viewStateGenerator = viewStateGeneratorMatch ? viewStateGeneratorMatch[1] : '';
    const eventValidation = eventValidationMatch ? eventValidationMatch[1] : '';
    const captchaToken = captchaTokenMatch[1];
    const captchaUrl = captchaImageSrcMatch[1].replace(/&amp;/g, '&');

    // Fetch the captcha image
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const captchaResponse = await fetch(ROP_BASE + captchaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': cookieHeader,
        'Referer': ROP_URL
      }
    });

    if (!captchaResponse.ok) {
      throw new Error('Failed to fetch CAPTCHA image');
    }

    const captchaBuffer = await captchaResponse.arrayBuffer();
    const captchaBase64 = Buffer.from(captchaBuffer).toString('base64');

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      viewState,
      viewStateGenerator,
      eventValidation,
      captchaToken,
      cookies: cookieHeader,
      timestamp: Date.now()
    });

    // Cleanup old sessions (older than 10 mins)
    for (const [key, val] of sessions.entries()) {
      if (Date.now() - val.timestamp > 10 * 60 * 1000) {
        sessions.delete(key);
      }
    }

    json(res, 200, {
      sessionId,
      captchaBase64: `data:image/jpeg;base64,${captchaBase64}`
    });

  } catch (err) {
    console.error('[ROP Auto Submit Init Error]', err);
    json(res, 500, { error: err.message });
  }
}

export async function handleRopAutoSubmitConfirm(req, res, body) {
  try {
    const { sessionId, captchaAnswer, applicantData } = body;

    if (!sessionId || !captchaAnswer || !applicantData) {
      return json(res, 400, { error: 'sessionId, captchaAnswer, and applicantData are required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return json(res, 400, { error: 'Session expired or invalid. Please try again.' });
    }

    sessions.delete(sessionId);

    const payload = new URLSearchParams();
    
    // ASP.NET State
    payload.append('__EVENTTARGET', '');
    payload.append('__EVENTARGUMENT', '');
    payload.append('__VIEWSTATE', session.viewState);
    if (session.viewStateGenerator) payload.append('__VIEWSTATEGENERATOR', session.viewStateGenerator);
    if (session.eventValidation) payload.append('__EVENTVALIDATION', session.eventValidation);

    // FIXED VALUES
    payload.append('ddlmode', '1');
    payload.append('ddlVisaType', '9');
    payload.append('ddlSponsorType', '1');
    payload.append('hdnMOMPIntegration', 'true');
    payload.append('hdnPG', 'CBO');
    payload.append('ddlIDType', 'CRN');
    payload.append('ddlRelationVisaNumber', '0');
    payload.append('ddlDependentGender', '0');
    payload.append('ddlDependentBirthCountry', '0');
    payload.append('ddlDependentRelation', '0');

    // DYNAMIC DATA
    const mapField = (key, defaultVal = '') => applicantData[key] !== undefined ? applicantData[key] : defaultVal;

    payload.append('ddlPassportLang', '1');
    payload.append('txtPassportNo', mapField('txtPassportNo'));
    payload.append('txtIssueDate', mapField('txtIssueDate'));
    payload.append('txtPlaceOfIssue', mapField('txtPlaceOfIssue'));
    payload.append('txtExpiryDate', mapField('txtExpiryDate'));
    payload.append('ddlIssueCountry', mapField('ddlIssueCountry'));
    payload.append('ddlNationality', mapField('ddlNationality'));

    payload.append('txtSurname', mapField('txtSurname'));
    payload.append('txtFirstName', mapField('txtFirstName'));
    payload.append('txtSecondName', mapField('txtSecondName'));
    payload.append('txtThirdName', mapField('txtThirdName'));
    payload.append('txtFourthName', mapField('txtFourthName'));
    payload.append('txtMotherName', mapField('txtMotherName'));
    payload.append('ddlGender', mapField('ddlGender', '1'));
    payload.append('txtDOB', mapField('txtDOB'));
    payload.append('txtBirthCity', mapField('txtBirthCity'));
    payload.append('ddlBirthCountry', mapField('ddlBirthCountry'));
    payload.append('txtEmailAddress', mapField('txtEmailAddress'));

    payload.append('txtPrvCivil', mapField('txtPrvCivil'));
    payload.append('txtPrvVisa', mapField('txtPrvVisa'));
    payload.append('txtPrevVisaExpiry', mapField('txtPrevVisaExpiry'));

    payload.append('txtSponsorName', mapField('txtSponsorName'));
    payload.append('txtSponsorOfficeNo', mapField('txtSponsorOfficeNo'));
    payload.append('txtSponsorId', mapField('txtSponsorId'));
    payload.append('txtSponsorPassportNo', mapField('txtSponsorPassportNo'));
    payload.append('txtSponsorPassIssueDate', mapField('txtSponsorPassIssueDate'));
    payload.append('ddlSponsorPassIssueCountry', mapField('ddlSponsorPassIssueCountry', '0'));
    payload.append('txtSponsorCRNNew', mapField('txtSponsorCRNNew'));
    payload.append('txtOrganizationNo', mapField('txtOrganizationNo'));
    payload.append('txtSponsorAddress', mapField('txtSponsorAddress'));
    payload.append('txtSponsorMobileNo', mapField('txtSponsorMobileNo'));
    payload.append('txtSponsorRelationship', mapField('txtSponsorRelationship'));
    payload.append('txtOccupationCode', mapField('txtOccupationCode'));
    payload.append('txtOccupationDescription', mapField('txtOccupationDescription'));
    payload.append('txtClearanceNumber', mapField('txtClearanceNumber'));

    payload.append('txtSubmittedbyID', mapField('txtSubmittedbyID'));
    payload.append('txtSubmittedbyName', mapField('txtSubmittedbyName'));
    payload.append('txtSubmittedbyGSM', mapField('txtSubmittedbyGSM'));

    // CAPTCHA
    payload.append('LBD_VCID_c_en_applyfornewvisa_samplecaptcha', session.captchaToken);
    payload.append('CaptchaCodeTextBox', captchaAnswer);
    payload.append('btnComplete', 'Submit Application');

    // Dependents
    payload.append('hdnDependents', '');
    payload.append('txtDependentSurname', '');
    payload.append('txtDependentFirstName', '');
    payload.append('txtDependentSecondName', '');
    payload.append('txtDependentThirdName', '');
    payload.append('txtDependentDOB', '');

    const postResponse = await fetchWithManualRedirect(ROP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Cookie': session.cookies,
        'Referer': ROP_URL
      },
      body: payload.toString()
    });

    if (postResponse.status !== 302 && postResponse.status !== 301) {
      // It didn't redirect, meaning there was likely a validation error or wrong CAPTCHA
      const html = await postResponse.text();
      // Try to extract an error message
      const errorMatch = html.match(/<span[^>]*id="[^"]*lblError[^"]*"[^>]*>(.*?)<\/span>/i);
      const errorMessage = errorMatch ? errorMatch[1].replace(/<[^>]+>/g, '').trim() : 'Form submission failed (incorrect CAPTCHA or invalid data)';
      return json(res, 400, { error: errorMessage });
    }

    const redirectUrl = postResponse.headers.get('location');
    if (!redirectUrl) {
      return json(res, 500, { error: 'No redirect location found from ROP portal' });
    }

    const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : ROP_BASE + redirectUrl;

    const confirmResponse = await fetch(fullRedirectUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': session.cookies,
        'Referer': ROP_URL
      }
    });

    const confirmHtml = await confirmResponse.text();

    const appNoMatch = confirmHtml.match(/Web Application Number.*?<span[^>]*>(.*?)<\/span>/is) || confirmHtml.match(/Application Number.*?<span[^>]*>(.*?)<\/span>/is);
    const refKeyMatch = confirmHtml.match(/Reference Key.*?<span[^>]*>(.*?)<\/span>/is);
    const pdfLinkMatch = confirmHtml.match(/<a[^>]+href="([^"]+)"[^>]*>.*?Click here to Download Application.*?<\/a>/is);

    const webAppNo = appNoMatch ? appNoMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const refKey = refKeyMatch ? refKeyMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    let pdfUrl = pdfLinkMatch ? pdfLinkMatch[1].replace(/&amp;/g, '&') : '';

    let pdfBase64 = null;
    if (pdfUrl) {
      if (!pdfUrl.startsWith('http')) pdfUrl = ROP_BASE + (pdfUrl.startsWith('/') ? '' : '/') + pdfUrl;
      try {
        const pdfResponse = await fetch(pdfUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Cookie': session.cookies,
            'Referer': fullRedirectUrl
          }
        });
        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
        }
      } catch (pdfErr) {
        console.error('[ROP Auto Submit PDF Error]', pdfErr);
      }
    }

    json(res, 200, {
      webApplicationNumber: webAppNo,
      referenceKey: refKey,
      pdfBase64: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null
    });

  } catch (err) {
    console.error('[ROP Auto Submit Confirm Error]', err);
    json(res, 500, { error: err.message });
  }
}
