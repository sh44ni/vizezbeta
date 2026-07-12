import { NextRequest, NextResponse } from 'next/server';
import { sessions } from '../shared';
import { COUNTRY_MAP } from '../countryMap';
export const dynamic = 'force-dynamic';

const ROP_URL = 'https://www.rop.gov.om/OnlineServices/eVisa/en/ApplyforNewVisa.aspx';
const ROP_BASE = 'https://www.rop.gov.om';

function fetchWithManualRedirect(url: string, options: any) {
  return fetch(url, { ...options, redirect: 'manual', cache: 'no-store' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, captchaAnswer, applicantData } = body;

    if (!sessionId || !captchaAnswer || !applicantData) {
      return NextResponse.json({ error: 'sessionId, captchaAnswer, and applicantData are required' }, { status: 400 });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session expired or invalid. Please try again.' }, { status: 400 });
    }


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
    const mapField = (key: string, defaultVal = '') => applicantData[key] !== undefined ? applicantData[key] : defaultVal;
    
    // Helper to get country ID
    const getCountryId = (name: string) => {
      if (!name) return '0';
      const upName = name.toUpperCase();
      if (COUNTRY_MAP[upName]) return COUNTRY_MAP[upName];
      
      // Fuzzy match (e.g., "NEPALI" -> "NEPAL")
      for (const [country, id] of Object.entries(COUNTRY_MAP)) {
        if (upName.includes(country) || country.includes(upName)) {
          return id;
        }
      }
      return '0';
    };

    payload.append('ddlPassportLang', '1');
    payload.append('txtPassportNo', mapField('txtPassportNo'));
    payload.append('txtIssueDate', mapField('txtIssueDate'));
    payload.append('txtPlaceOfIssue', mapField('txtPlaceOfIssue'));
    payload.append('txtExpiryDate', mapField('txtExpiryDate'));
    const nat = mapField('ddlNationality');
    
    let issueCountry = mapField('ddlIssueCountry');
    if (!issueCountry || issueCountry === '0') issueCountry = nat;
    
    payload.append('ddlIssueCountry', getCountryId(issueCountry));
    payload.append('ddlNationality', getCountryId(nat));

    payload.append('txtSurname', mapField('txtSurname'));
    payload.append('txtFirstName', mapField('txtFirstName'));
    payload.append('txtSecondName', mapField('txtSecondName'));
    payload.append('txtThirdName', mapField('txtThirdName'));
    payload.append('txtFourthName', mapField('txtFourthName'));
    payload.append('txtMotherName', mapField('txtMotherName'));
    payload.append('ddlGender', mapField('ddlGender', '1'));
    payload.append('txtDOB', mapField('txtDOB'));
    payload.append('txtBirthCity', mapField('txtBirthCity'));
    
    let birthCountry = mapField('ddlBirthCountry');
    if (!birthCountry || birthCountry === '0') birthCountry = nat;
    
    payload.append('ddlBirthCountry', getCountryId(birthCountry));
    payload.append('txtEmailAddress', mapField('txtEmailAddress'));

    payload.append('txtPrvCivil', mapField('txtPrvCivil'));
    payload.append('txtPrvVisa', mapField('txtPrvVisa'));
    payload.append('txtPrevVisaExpiry', mapField('txtPrevVisaExpiry'));

    payload.append('txtSponsorName', mapField('txtSponsorName'));
    payload.append('txtSponsorOfficeNo', mapField('txtSponsorOfficeNo'));
    payload.append('txtSponsorId', mapField('txtSponsorId'));
    payload.append('txtSponsorPassportNo', mapField('txtSponsorPassportNo'));
    payload.append('txtSponsorPassIssueDate', mapField('txtSponsorPassIssueDate'));
    
    payload.append('ddlSponsorPassIssueCountry', getCountryId(mapField('ddlSponsorPassIssueCountry', '0')));
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
    console.log('\n\x1b[36m==================================================');
    console.log('🚀 ROP AUTO SUBMIT - POST PAYLOAD');
    console.log('==================================================\x1b[0m');
    Array.from(payload.entries()).forEach(([k, v]) => {
      // Avoid printing massive viewstates completely
      const displayVal = (k.includes('VIEWSTATE') || k.includes('EVENTVALIDATION')) 
        ? `${v.substring(0, 15)}... (truncated)` 
        : (v || '(empty)');
      console.log(`\x1b[33m${k.padEnd(35, ' ')}\x1b[0m : \x1b[32m${displayVal}\x1b[0m`);
    });
    console.log('\x1b[36m==================================================\x1b[0m\n');

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
      
      console.error('--- ROP VALIDATION ERROR ---');
      console.error(errorMessage);
      console.error('----------------------------');
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const redirectUrl = postResponse.headers.get('location');
    if (!redirectUrl) {
      return NextResponse.json({ error: 'No redirect location found from ROP portal' }, { status: 500 });
    }

    const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : ROP_BASE + redirectUrl;

    const confirmResponse = await fetch(fullRedirectUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': session.cookies,
        'Referer': ROP_URL
      }
    });

    const confirmHtml = await confirmResponse.text();
    
    // Save the success HTML so we can reverse-engineer the PDF download button!
    try {
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(process.cwd(), 'success.html'), confirmHtml);
      console.log('--- SAVED success.html TO ROOT FOLDER ---');
    } catch (e) {}

    const appNoMatch = confirmHtml.match(/Web Application Number[\s\S]*?<span[^>]*>(.*?)<\/span>/i) || confirmHtml.match(/Application Number[\s\S]*?<span[^>]*>(.*?)<\/span>/i);
    const refKeyMatch = confirmHtml.match(/Reference Key[\s\S]*?<span[^>]*>(.*?)<\/span>/i);
    const pdfLinkMatch = confirmHtml.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?Click here to Download Application[\s\S]*?<\/a>/i);

    const webAppNo = appNoMatch ? appNoMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const refKey = refKeyMatch ? refKeyMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    let pdfBase64 = null;
    
    // Extract new ASP.NET state variables from success page to trigger the PDF download POST
    const vsMatch = confirmHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/i) || confirmHtml.match(/name="__VIEWSTATE"\s+value="([^"]+)"/i);
    const vsgMatch = confirmHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/i) || confirmHtml.match(/name="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/i);
    const evMatch = confirmHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/i) || confirmHtml.match(/name="__EVENTVALIDATION"\s+value="([^"]+)"/i);
    const hdnAppidMatch = confirmHtml.match(/id="hdnAppid"\s+value="([^"]+)"/i) || confirmHtml.match(/name="hdnAppid"\s+value="([^"]+)"/i);
    const hdnWebAppNoMatch = confirmHtml.match(/id="hdnWebAppNo"\s+value="([^"]+)"/i) || confirmHtml.match(/name="hdnWebAppNo"\s+value="([^"]+)"/i);

    if (vsMatch) {
      try {
        const downloadPayload = new URLSearchParams();
        downloadPayload.append('__VIEWSTATE', vsMatch[1]);
        if (vsgMatch) downloadPayload.append('__VIEWSTATEGENERATOR', vsgMatch[1]);
        if (evMatch) downloadPayload.append('__EVENTVALIDATION', evMatch[1]);
        if (hdnAppidMatch) downloadPayload.append('hdnAppid', hdnAppidMatch[1]);
        if (hdnWebAppNoMatch) downloadPayload.append('hdnWebAppNo', hdnWebAppNoMatch[1]);
        
        downloadPayload.append('btnComplete', 'Click here to Download Application');

        const pdfResponse = await fetch(fullRedirectUrl, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0',
            'Cookie': session.cookies,
            'Referer': fullRedirectUrl
          },
          body: downloadPayload.toString()
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const buffer = Buffer.from(pdfBuffer);
          
          // Check for PDF magic bytes (%PDF) instead of relying on IIS Content-Type headers
          if (buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
            pdfBase64 = buffer.toString('base64');
          } else {
            console.error('[ROP Auto Submit PDF Error] Invalid PDF Signature. Length:', buffer.length);
          }
        }
      } catch (pdfErr) {
        console.error('[ROP Auto Submit PDF Error]', pdfErr);
      }
    }

    sessions.delete(sessionId);

    return NextResponse.json({
      webApplicationNumber: webAppNo,
      referenceKey: refKey,
      pdfBase64: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null
    });

  } catch (err: any) {
    console.error('[ROP Auto Submit Confirm Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
