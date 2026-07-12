import { NextRequest, NextResponse } from 'next/server';
import { enhancePassportImageSharp } from '@/lib/passport-enhance-sharp';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
async function fileToBase64DataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');
  return `data:${file.type || 'image/jpeg'};base64,${b64}`;
}

async function callVision(
  dataUrl: string,
  prompt: string,
  maxTokens: number,
): Promise<Record<string, string>> {
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content || '';
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? (match[1] || match[0]) : text;

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    console.error('[process] Failed to parse GPT-4o response:', text);
    throw new Error('Failed to parse GPT-4o response as JSON');
  }
}

// ─────────────────────────────────────────────────────
// PASSPORT PROMPT
// ─────────────────────────────────────────────────────
function buildPassportPrompt(): string {
  return `You are an expert OCR specialist for international passports. Extract all fields from this passport image.

CRITICAL RULES:
- Extract text EXACTLY as printed. Do NOT correct or translate.
- ALL dates MUST be in DD/MM/YYYY format.
- For the MRZ (Machine Readable Zone — the two lines of text at the bottom with < characters): read them with extreme precision, digit by digit, letter by letter.
- Names: extract surname and given names exactly as printed in the data zone.
- Gender: output only "M" or "F".
- Missing/unreadable fields: use "UNREADABLE".

DATE EXTRACTION — READ CAREFULLY:
- "issue_date" is the date the passport was ISSUED (Date of Issue / Date Issued). It is ALWAYS in the past.
- "expiry_date" is the date the passport EXPIRES (Date of Expiry / Valid Until). It is ALWAYS after the issue date.
- "date_of_birth" is the holder's birthday. It is ALWAYS before both issue and expiry dates.
- Do NOT swap these dates. If you are unsure which date is which, use "UNREADABLE" rather than guessing.
- The issue_date MUST be earlier (older) than expiry_date. If what you read for issue_date is later than expiry_date, you have them swapped — re-read carefully.
- Myanmar passports: the issue date is labelled "Date of Issue" and the expiry date is labelled "Date of Expiry" on the personal data page. Both use Gregorian calendar DD/MM/YYYY format.

Return ONLY a valid JSON object with these exact fields:
{
  "surname": "",
  "first_name": "",
  "second_name": "",
  "third_name": "",
  "fourth_name": "",
  "passport_number": "",
  "issue_date": "DD/MM/YYYY",
  "issue_date_confidence": "HIGH or MEDIUM or LOW",
  "place_of_issue": "",
  "expiry_date": "DD/MM/YYYY",
  "expiry_date_confidence": "HIGH or MEDIUM or LOW",
  "passport_country": "",
  "nationality": "",
  "date_of_birth": "DD/MM/YYYY",
  "dob_confidence": "HIGH or MEDIUM or LOW",
  "city_of_birth": "",
  "country_of_birth": "",
  "gender": "M or F",
  "mrz_line_1": "",
  "mrz_line_2": ""
}

Output ONLY the JSON. No explanation, no markdown fences.`;
}

// ─────────────────────────────────────────────────────
// WORK PERMIT PROMPT (ported from main app)
// ─────────────────────────────────────────────────────
function buildWorkPermitPrompt(): string {
  return `You are an expert OCR specialist for Omani Work Permit / Labour Authorisation documents (ترخيص العمل / تصريح العمل) issued by the Oman Ministry of Labour (وزارة العمل).

This document may be FULLY IN ARABIC, fully in English, or bilingual. You MUST handle all three equally well.

CRITICAL EXTRACTION RULES — READ CAREFULLY:
- Extract ALL text EXACTLY as it is printed on the document. Do NOT change, correct, transliterate, or translate anything.
- If the document is in Arabic: return the values in Arabic script exactly as printed.
- If the document is in English: return the values in English exactly as printed.
- If the document is bilingual (both Arabic and English on the same document): prefer the English value for each field, but only if English text is actually present for that specific field. If a field only has Arabic text, return it in Arabic.
- Numbers (IDs, codes, phone numbers, PA numbers): always extract as-is — digits and slashes exactly as shown.
- Dates: convert to DD/MM/YYYY format (this is the only allowed transformation).
- Do NOT guess, invent, transliterate, or translate any value. Copy it character-for-character from the image.
- Missing fields: return empty string "".

FIELD-SPECIFIC VALIDATION:
- civil_id: Omani civil IDs are numeric. Verify digit count.
- phone_number / mobile_number: Omani numbers are 8 digits (landline or mobile). If you see a number, count the digits.
- pa_number: ALWAYS has a slash (e.g. "26/80636"). Capture BOTH parts fully.
- occupation_code: Numeric code, typically 10 digits (e.g. "9111001001"). Count the digits.

=== SECTION 1: بيانات الترخيص / Labour Authorisation Details ===

Field: wfpa_number
  English label: "WFPA Number" or "WPPA Number"
  Arabic label:  "رقم طلب ترخيص العمل"
  Value: The long permit reference code that starts with WPPA- or WFPA- (e.g. "WPPA-5193303" or "WFPA-5181476")

Field: pa_number  ← CLEARANCE NUMBER
  English label: "PA Number"
  Arabic label:  "رقم ترخيص العمل"
  Value: A compound number with a slash, e.g. "26/80636" or "26/81281".
  CRITICAL: Capture the FULL value including the slash and BOTH parts. Never truncate.

Field: expiry_date
  English label: "Expiry Date"
  Arabic label:  "تاريخ انتهاء الصلاحية" or "تاريخ الصلاحية"
  Value: Date in DD/MM/YYYY format (ignore time portion if present)

=== SECTION 2: بيانات صاحب العمل / Employer Details ===

Field: civil_id
  English label: "Civil Number"
  Arabic label:  "الرقم المدني"
  Value: Numeric digits only, no spaces (e.g. "103458" or "4072564")

Field: sponsor_name
  English label: "Employer Name"
  Arabic label:  "اسم صاحب العمل"
  Value: Full name — transliterate Arabic to English capital letters

Field: phone_number
  English label: "Phone Number"
  Arabic label:  "رقم الهاتف" or "الهاتف"
  Value: Phone digits as printed (e.g. "99377336")

Field: mobile_number
  English label: "Mobile" / "GSM"
  Arabic label:  "رقم الجوال"
  Value: If no separate mobile field exists, copy phone_number here

Field: address
  English label: "Labour Office" / "Address"
  Arabic label:  "مكاتب العمل" or "مكتب العمل" or "العنوان"
  Value: The office location text (e.g. "Al-Seeb" / "السيب")

Field: relationship
  Value: Leave empty string — this field is not on the Omani work permit

=== SECTION 3: بيانات المهنة / Occupation Details ===

Field: occupation_code
  English label: "Occupation Code"
  Arabic label:  "رمز المهنة"
  Value: Numeric code exactly as printed (e.g. "9111001001")

Field: occupation_description
  English label: "Occupation Description"
  Arabic label:  "وصف المهنة"
  Value: Copy EXACTLY as printed — Arabic if Arabic document, English if English document

Return ONLY a valid JSON object with exactly these fields:
{
  "wfpa_number": "",
  "pa_number": "",
  "expiry_date": "",
  "sponsor_name": "",
  "civil_id": "",
  "phone_number": "",
  "mobile_number": "",
  "address": "",
  "relationship": "",
  "occupation_code": "",
  "occupation_description": ""
}

Output ONLY the JSON. No explanation, no markdown fences.`;
}

// ─────────────────────────────────────────────────────
// MRZ UTILITIES (subset — for date parsing)
// ─────────────────────────────────────────────────────
function parseMRZDate(yymmdd: string, isExpiry: boolean): Date | null {
  if (!yymmdd || yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  let century: number;
  if (isExpiry) {
    century = 2000;
  } else {
    const currentYY = new Date().getFullYear() % 100;
    century = yy > currentYY + 5 ? 1900 : 2000;
  }
  return new Date(century + yy, mm - 1, dd);
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Parse a DD/MM/YYYY string into a Date, or null if invalid. */
function parseDDMMYYYY(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) return null;
  return new Date(yyyy, mm - 1, dd);
}

function mrzCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    let val: number;
    if (ch === '<') val = 0;
    else if (ch >= '0' && ch <= '9') val = parseInt(ch, 10);
    else val = ch.charCodeAt(0) - 55;
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

function verifyMRZ(data: string, checkDigit: string): boolean {
  if (!/^\d$/.test(checkDigit)) return false;
  return mrzCheckDigit(data) === parseInt(checkDigit, 10);
}

interface MRZResult {
  passportNumber: string | null;
  dob: Date | null;
  expiry: Date | null;
  gender: string | null;
  dobCheckOk: boolean | null;
  expiryCheckOk: boolean | null;
  ppNumCheckOk: boolean | null;
}

function parseMRZ(line1: string, line2: string): MRZResult {
  const result: MRZResult = {
    passportNumber: null, dob: null, expiry: null, gender: null,
    dobCheckOk: null, expiryCheckOk: null, ppNumCheckOk: null,
  };

  if (!line2 || line2.length < 35) return result;
  const l2 = line2.replace(/\s/g, '').padEnd(44, '<');

  const ppNum = l2.slice(0, 9);
  const ppCheck = l2[9];
  if (ppNum && ppCheck) {
    result.ppNumCheckOk = verifyMRZ(ppNum, ppCheck);
    result.passportNumber = ppNum.replace(/<+$/, '');
  }

  const dobStr = l2.slice(13, 19);
  const dobCheck = l2[19];
  const dob = parseMRZDate(dobStr, false);
  if (dob) {
    result.dobCheckOk = verifyMRZ(dobStr, dobCheck);
    result.dob = dob;
  }

  const genderChar = l2[20];
  if (genderChar === 'M' || genderChar === 'F') result.gender = genderChar;

  const expiryStr = l2.slice(21, 27);
  const expiryCheck = l2[27];
  const expiry = parseMRZDate(expiryStr, true);
  if (expiry) {
    result.expiryCheckOk = verifyMRZ(expiryStr, expiryCheck);
    result.expiry = expiry;
  }

  return result;
}

// ─────────────────────────────────────────────────────
// PASSPORT ENHANCEMENT via sharp (no Python required)
// ─────────────────────────────────────────────────────
async function enhancePassport(file: File): Promise<{ dataUrl: string; wasEnhanced: boolean }> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  return enhancePassportImageSharp(fileBuffer, file.type || 'image/jpeg');
}


// ─────────────────────────────────────────────────────
// MAIN ROUTE HANDLER
// ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured in .env.local' },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const passportFile = formData.get('passport') as File | null;
    const workPermitFile = formData.get('work_permit') as File | null;

    if (!passportFile) {
      return NextResponse.json({ error: 'No passport file provided' }, { status: 400 });
    }

    // ── 1. Enhance passport image ──
    console.log('[process] Enhancing passport image...');
    const { dataUrl: passportDataUrl, wasEnhanced } = await enhancePassport(passportFile);
    console.log(`[process] Enhancement: ${wasEnhanced ? '✓ enhanced' : '⚠ raw (enhancer unavailable)'}`);

    // ── 2. Extract passport fields via GPT-4o ──
    console.log('[process] Extracting passport fields with GPT-4o...');
    const rawPassportData = await callVision(passportDataUrl, buildPassportPrompt(), 1500);

    // ── 3. MRZ override (deterministic checksum correction) ──
    const mrz = parseMRZ(rawPassportData.mrz_line_1, rawPassportData.mrz_line_2);
    const mrzLog: string[] = [];

    if (mrz.dob && mrz.dobCheckOk === true) {
      const mrzDob = formatDDMMYYYY(mrz.dob);
      if (rawPassportData.date_of_birth !== mrzDob) mrzLog.push(`DOB: LLM="${rawPassportData.date_of_birth}" → MRZ verified="${mrzDob}"`);
      rawPassportData.date_of_birth = mrzDob;
    }
    if (mrz.expiry && mrz.expiryCheckOk === true) {
      const mrzExp = formatDDMMYYYY(mrz.expiry);
      if (rawPassportData.expiry_date !== mrzExp) mrzLog.push(`EXPIRY: LLM="${rawPassportData.expiry_date}" → MRZ verified="${mrzExp}"`);
      rawPassportData.expiry_date = mrzExp;
    }
    if (mrz.gender) rawPassportData.gender = mrz.gender;
    if (mrz.passportNumber && mrz.ppNumCheckOk === true) {
      rawPassportData.passport_number = mrz.passportNumber;
    }

    // ── Date sanity validation for issue_date (no MRZ anchor available) ──
    // Resolve the best-known expiry for comparison (prefer MRZ-corrected value)
    const expiryForValidation = parseDDMMYYYY(rawPassportData.expiry_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (rawPassportData.issue_date) {
      const issueParsed = parseDDMMYYYY(rawPassportData.issue_date);
      if (!issueParsed) {
        // Completely unparseable — safer to clear than submit garbage
        mrzLog.push(`ISSUE_DATE: unparseable "${rawPassportData.issue_date}" — cleared`);
        delete rawPassportData.issue_date;
      } else if (issueParsed > today) {
        // Issue date is in the future — impossible, AI hallucinated
        mrzLog.push(`ISSUE_DATE: "${rawPassportData.issue_date}" is in the future — cleared`);
        delete rawPassportData.issue_date;
      } else if (expiryForValidation && issueParsed >= expiryForValidation) {
        // Issue date is on or after expiry — AI swapped the dates, clear it
        mrzLog.push(`ISSUE_DATE: "${rawPassportData.issue_date}" is on/after expiry "${rawPassportData.expiry_date}" — cleared (likely swapped)`);
        delete rawPassportData.issue_date;
      }
    }

    if (mrzLog.length > 0) {
      console.log('[process] MRZ/date corrections:', mrzLog);
    }

    // ── 4. Clean passport data ──
    const passport: Record<string, string> = {};
    const skipKeys = new Set(['mrz_line_1', 'mrz_line_2', 'issue_date_confidence', 'expiry_date_confidence', 'dob_confidence']);
    for (const [k, v] of Object.entries(rawPassportData)) {
      if (!skipKeys.has(k) && v && !String(v).includes('UNREADABLE')) {
        passport[k] = String(v);
      }
    }

    // ── 5. Extract work permit data (if provided) ──
    let work_permit: Record<string, string> | null = null;
    let workPermitImageDataUrl: string | null = null;

    if (workPermitFile) {
      console.log('[process] Extracting work permit fields with GPT-4o...');
      workPermitImageDataUrl = await fileToBase64DataUrl(workPermitFile);
      try {
        const wpData = await callVision(workPermitImageDataUrl, buildWorkPermitPrompt(), 800);
        // Clean: only keep non-empty values
        work_permit = {};
        for (const [k, v] of Object.entries(wpData)) {
          if (v && String(v).trim() !== '') {
            work_permit[k] = String(v);
          }
        }
        console.log(`[process] Work permit extracted: sponsor=${work_permit.sponsor_name || 'N/A'}, civil_id=${work_permit.civil_id || 'N/A'}, pa_number=${work_permit.pa_number || 'N/A'}`);
      } catch (wpErr) {
        console.error('[process] Work permit extraction failed:', (wpErr as Error).message);
        work_permit = null;
      }
    }

    return NextResponse.json({
      passport,
      work_permit,
      passport_image_data_url: passportDataUrl,
      work_permit_image_data_url: workPermitImageDataUrl,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[process] Error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Unknown extraction error' },
      { status: 500 }
    );
  }
}
