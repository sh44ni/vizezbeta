import { NextRequest, NextResponse } from 'next/server';
import { enhancePassportImage } from '@/lib/passport-enhance';

// ─────────────────────────────────────────────────────
// PASSPORT KNOWLEDGE BASE — country-specific rules
// ─────────────────────────────────────────────────────
const PASSPORT_RULES: Record<string, { validity: number[]; numberPattern: string; numberLength: number[] }> = {
  NEPAL:       { validity: [10], numberPattern: '2 letters + 7 digits (e.g. PA1234567) OR 8 digits for old passports', numberLength: [8, 9] },
  INDIA:       { validity: [10], numberPattern: '1 letter + 7 digits (e.g. A1234567)', numberLength: [8] },
  BANGLADESH:  { validity: [5, 10], numberPattern: '2 letters + 7 digits (e.g. BK0123456) for e-passport, or old format', numberLength: [9] },
  SRI_LANKA:   { validity: [10], numberPattern: '1 letter + 7 digits (e.g. N1234567)', numberLength: [8] },
  PAKISTAN:     { validity: [5, 10], numberPattern: '2 letters + 7 digits (e.g. AB1234567)', numberLength: [9] },
  PHILIPPINES: { validity: [5, 10], numberPattern: '2 letters + 7 digits (e.g. P1234567A)', numberLength: [8, 9, 10] },
  INDONESIA:   { validity: [5, 10], numberPattern: '1 letter + 7 digits or 8 digits', numberLength: [8] },
  ETHIOPIA:    { validity: [5], numberPattern: 'EP + 7 digits (e.g. EP1234567)', numberLength: [9] },
  EGYPT:       { validity: [7], numberPattern: '1 letter + 7 digits (e.g. A12345678)', numberLength: [8, 9] },
  UGANDA:      { validity: [10], numberPattern: '1-2 letters + 7 digits', numberLength: [8, 9] },
  KENYA:       { validity: [10], numberPattern: '1-2 letters + digits, varies', numberLength: [8, 9] },
  TANZANIA:    { validity: [5, 10], numberPattern: '2 letters + 7 digits', numberLength: [9] },
  VIETNAM:     { validity: [10], numberPattern: '1 letter + 8 digits (e.g. B12345678)', numberLength: [9] },
  MYANMAR:     { validity: [5], numberPattern: '2 letters + 6 digits', numberLength: [8] },
  CAMEROON:    { validity: [5, 10], numberPattern: 'varies', numberLength: [8, 9] },
};

// ─────────────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────────────
function parseDDMMYYYY(s: string): Date | null {
  if (!s || s.includes('UNREADABLE')) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(+yyyy, +mm - 1, +dd);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function yearsBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

// ─────────────────────────────────────────────────────
// ICAO 9303 MRZ CHECK DIGIT VERIFICATION
// ─────────────────────────────────────────────────────
function mrzCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    let val: number;
    if (ch === '<') val = 0;
    else if (ch >= '0' && ch <= '9') val = parseInt(ch, 10);
    else val = ch.charCodeAt(0) - 55; // A=10, B=11, ...Z=35
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

function verifyMRZField(data: string, expectedCheckDigit: string): boolean {
  if (!/^\d$/.test(expectedCheckDigit)) return false;
  return mrzCheckDigit(data) === parseInt(expectedCheckDigit, 10);
}

// Validate impossible calendar dates (Feb 30, Apr 31, etc.)
function isValidCalendarDate(dd: number, mm: number, yyyy: number): boolean {
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
}

// ─────────────────────────────────────────────────────
// MRZ PARSER — deterministic, no LLM involved
// ─────────────────────────────────────────────────────
interface MRZParsed {
  passportNumber: string | null;
  nationality: string | null;
  dob: Date | null;
  expiry: Date | null;
  gender: string | null;
  surname: string | null;
  givenNames: string | null;
  // Checksum verification results
  ppNumCheckOk: boolean | null;   // null = couldn't verify
  dobCheckOk: boolean | null;
  expiryCheckOk: boolean | null;
  compositeCheckOk: boolean | null;
  mrzQuality: 'VERIFIED' | 'PARTIAL' | 'FAILED' | 'UNREADABLE';
}

// MRZ country code → human-readable mapping (for matching PASSPORT_RULES)
const MRZ_COUNTRY_MAP: Record<string, string> = {
  NPL: 'NEPAL', IND: 'INDIA', BGD: 'BANGLADESH', LKA: 'SRI_LANKA',
  PAK: 'PAKISTAN', PHL: 'PHILIPPINES', IDN: 'INDONESIA', ETH: 'ETHIOPIA',
  EGY: 'EGYPT', UGA: 'UGANDA', KEN: 'KENYA', TZA: 'TANZANIA',
  VNM: 'VIETNAM', MMR: 'MYANMAR', CMR: 'CAMEROON',
};

function parseMRZDate(yymmdd: string, isExpiry: boolean): Date | null {
  if (!yymmdd || yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  // Century logic:
  // - Expiry dates: almost always 20XX (passports don't expire in the 1900s)
  // - DOB: if YY > current 2-digit year + 5, assume 19XX, else 20XX
  let century: number;
  if (isExpiry) {
    century = 2000;
  } else {
    const currentYY = new Date().getFullYear() % 100;
    century = yy > currentYY + 5 ? 1900 : 2000;
  }

  const d = new Date(century + yy, mm - 1, dd);
  if (isNaN(d.getTime())) return null;
  return d;
}

function parseMRZ(line1: string | undefined, line2: string | undefined): MRZParsed {
  const result: MRZParsed = {
    passportNumber: null, nationality: null,
    dob: null, expiry: null, gender: null,
    surname: null, givenNames: null,
    ppNumCheckOk: null, dobCheckOk: null,
    expiryCheckOk: null, compositeCheckOk: null,
    mrzQuality: 'UNREADABLE',
  };

  // Clean lines: remove spaces, ensure uppercase
  const l1 = (line1 || '').replace(/\s/g, '').toUpperCase();
  const l2 = (line2 || '').replace(/\s/g, '').toUpperCase();

  // Bail if lines look like [UNREADABLE] placeholders
  if (l1.includes('UNREADABLE') || l2.includes('UNREADABLE')) {
    return result;
  }

  // Line 1: P<CCCsurname<<givennames<<<
  if (l1.length >= 10 && l1.startsWith('P')) {
    const namesPart = l1.slice(5); // skip P + type + 3-letter country
    const parts = namesPart.split('<<').filter(Boolean);
    if (parts.length >= 1) {
      result.surname = parts[0].replace(/</g, ' ').trim();
    }
    if (parts.length >= 2) {
      result.givenNames = parts[1].replace(/</g, ' ').trim();
    }
  }

  // Line 2 must be 44 chars for TD3 (passport) format
  // But allow slightly shorter if trailing <'s were trimmed
  if (l2.length >= 28) {
    // ── Passport Number: positions 0-8, check digit at position 9 ──
    const rawPpNum = l2.slice(0, 9);
    const ppCheckChar = l2.charAt(9);
    const ppNumClean = rawPpNum.replace(/</g, '');
    if (ppNumClean.length > 0) {
      result.passportNumber = ppNumClean;
      result.ppNumCheckOk = verifyMRZField(rawPpNum, ppCheckChar);
    }

    // Positions 10-12: Nationality
    const natCode = l2.slice(10, 13).replace(/</g, '');
    if (natCode.length === 3) {
      result.nationality = natCode;
    }

    // ── DOB: positions 13-18, check digit at position 19 ──
    const dobRaw = l2.slice(13, 19);
    const dobCheckChar = l2.charAt(19);
    result.dob = parseMRZDate(dobRaw, false);
    if (result.dob) {
      result.dobCheckOk = verifyMRZField(dobRaw, dobCheckChar);
      // Also check it's a valid calendar date
      const dd = parseInt(dobRaw.slice(4, 6), 10);
      const mm = parseInt(dobRaw.slice(2, 4), 10);
      const yyyy = result.dob.getFullYear();
      if (!isValidCalendarDate(dd, mm, yyyy)) {
        result.dob = null;
        result.dobCheckOk = false;
      }
    }

    // Position 20: Sex
    const sex = l2.charAt(20);
    if (sex === 'M' || sex === 'F') {
      result.gender = sex;
    }

    // ── Expiry: positions 21-26, check digit at position 27 ──
    const expiryRaw = l2.slice(21, 27);
    const expiryCheckChar = l2.charAt(27);
    result.expiry = parseMRZDate(expiryRaw, true);
    if (result.expiry) {
      result.expiryCheckOk = verifyMRZField(expiryRaw, expiryCheckChar);
      // Also check it's a valid calendar date
      const dd = parseInt(expiryRaw.slice(4, 6), 10);
      const mm = parseInt(expiryRaw.slice(2, 4), 10);
      const yyyy = result.expiry.getFullYear();
      if (!isValidCalendarDate(dd, mm, yyyy)) {
        result.expiry = null;
        result.expiryCheckOk = false;
      }
    }

    // ── Composite check digit (position 43) over positions 0-9,13-19,21-27 ──
    if (l2.length >= 44) {
      const compositeInput = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 28);
      const compositeCheckChar = l2.charAt(43);
      result.compositeCheckOk = verifyMRZField(compositeInput, compositeCheckChar);
    }

    // ── Determine overall MRZ quality ──
    const checks = [result.ppNumCheckOk, result.dobCheckOk, result.expiryCheckOk];
    const passed = checks.filter(c => c === true).length;
    const failed = checks.filter(c => c === false).length;
    if (failed > 0 && passed === 0) {
      result.mrzQuality = 'FAILED';
    } else if (passed === 3 || (passed >= 2 && result.compositeCheckOk === true)) {
      result.mrzQuality = 'VERIFIED';
    } else if (passed > 0) {
      result.mrzQuality = 'PARTIAL';
    } else {
      result.mrzQuality = 'UNREADABLE';
    }
  }

  return result;
}


// ─────────────────────────────────────────────────────
// POST-EXTRACTION VALIDATOR
// ─────────────────────────────────────────────────────
interface ValidationResult {
  warnings: string[];
  corrected: Record<string, string>;
}

function validatePassportData(data: Record<string, string>): ValidationResult {
  const warnings: string[] = [];
  const corrected: Record<string, string> = {};

  // ── 1. Date format validation ──
  for (const key of ['issue_date', 'expiry_date', 'date_of_birth']) {
    const val = data[key];
    if (val && !val.includes('UNREADABLE') && !parseDDMMYYYY(val)) {
      warnings.push(`⚠️ ${key} "${val}" is not valid DD/MM/YYYY format`);
    }
  }

  const issueDate = parseDDMMYYYY(data.issue_date);
  const expiryDate = parseDDMMYYYY(data.expiry_date);
  const dob = parseDDMMYYYY(data.date_of_birth);

  // ── 2. Logical date ordering ──
  if (issueDate && expiryDate && expiryDate <= issueDate) {
    warnings.push(`🚨 expiry_date (${data.expiry_date}) is before or equal to issue_date (${data.issue_date}) — IMPOSSIBLE`);
  }
  if (dob && issueDate && dob >= issueDate) {
    warnings.push(`🚨 date_of_birth (${data.date_of_birth}) is after issue_date — IMPOSSIBLE`);
  }
  if (dob) {
    const now = new Date();
    const age = yearsBetween(dob, now);
    if (age < 14 || age > 80) {
      warnings.push(`⚠️ Calculated age is ${age} — verify date_of_birth`);
    }
  }

  // ── 3. Passport validity period vs country ──
  const nat = (data.nationality || data.passport_country || '').toUpperCase().replace(/\s+/g, '_');
  const countryKey = Object.keys(PASSPORT_RULES).find(k => nat.includes(k));
  const rules = countryKey ? PASSPORT_RULES[countryKey] : null;

  if (issueDate && expiryDate && rules) {
    const gap = yearsBetween(issueDate, expiryDate);
    if (!rules.validity.includes(gap)) {
      const expected = rules.validity.join(' or ');
      warnings.push(`⚠️ ${countryKey} passport validity is ${gap} years, expected ${expected} years — verify expiry_date`);
      // Auto-correct if only one valid option and gap is close
      if (rules.validity.length === 1) {
        const correctedExpiry = new Date(issueDate);
        correctedExpiry.setFullYear(correctedExpiry.getFullYear() + rules.validity[0]);
        corrected.expiry_date = formatDDMMYYYY(correctedExpiry);
        warnings.push(`🔧 Auto-corrected expiry_date to ${corrected.expiry_date} (issue_date + ${rules.validity[0]}yr)`);
      }
    }
  }

  // ── 4. Passport number digit count ──
  const ppNum = (data.passport_number || '').replace(/[\s-]/g, '');
  if (rules && ppNum.length > 0) {
    if (!rules.numberLength.includes(ppNum.length)) {
      warnings.push(`⚠️ ${countryKey} passport number "${ppNum}" has ${ppNum.length} chars, expected ${rules.numberLength.join(' or ')} — verify`);
    }
  }

  // ── 5. Gender sanity ──
  const gender = (data.gender || '').toUpperCase().trim();
  if (gender && gender !== 'M' && gender !== 'F') {
    warnings.push(`⚠️ gender "${data.gender}" is not M or F — defaulting to empty`);
    corrected.gender = '';
  }

  // ── 6. Future issue date check ──
  if (issueDate && issueDate > new Date()) {
    warnings.push(`🚨 issue_date is in the future — verify`);
  }

  // ── 7. Already expired check ──
  if (expiryDate && expiryDate < new Date()) {
    warnings.push(`⚠️ Passport is already EXPIRED (${data.expiry_date}) — flag for review`);
  }

  return { warnings, corrected };
}

// ─────────────────────────────────────────────────────
// VISION API CALLER
// ─────────────────────────────────────────────────────
async function callVision(
  apiKey: string,
  imageDataUrl: string,
  prompt: string,
  maxTokens = 1200,
  model = 'gpt-4o',
) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const data = await response.json();
  const raw: string = data?.choices?.[0]?.message?.content || '';
  // Extract JSON from response — handle markdown fences and leading text
  let cleaned = raw.trim();
  // Remove markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  // If there's text before the JSON, extract just the JSON object
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────────────
// BUILD PASSPORT PROMPT — MRZ-first extraction
// ─────────────────────────────────────────────────────
function buildPassportPrompt(): string {
  return `You are a passport OCR specialist. Your #1 job is to COPY text from the passport image exactly as printed.

══════════════════════════════════════════
PRIORITY 1: COPY THE MRZ LINES VERBATIM
══════════════════════════════════════════
The two lines of text at the very bottom of the passport page are the Machine Readable Zone (MRZ).
They look like this (44 characters each, using letters, digits, and < as filler):

Line 1: P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
Line 2: L898902C36UTO7408122F1204159ZE184226B<<<<<10

YOUR TASK: Copy each MRZ line CHARACTER BY CHARACTER into mrz_line_1 and mrz_line_2.
- Include every < character exactly as it appears
- Do NOT decode, interpret, or modify the MRZ — just copy it raw
- Each line should be exactly 44 characters (letters, digits, and < only)
- If the MRZ is not visible or unreadable, return "[UNREADABLE]" for that line

══════════════════════════════════════════
PRIORITY 2: READ THE PRINTED (VIZ) FIELDS
══════════════════════════════════════════
Read the following from the PRINTED text area (above the MRZ):
- Surname, given names: EXACTLY as printed, do not rearrange
- Issue date: read EXACTLY as printed, convert to DD/MM/YYYY
- Place of issue: read as printed
- Passport country, nationality, city/country of birth: as printed

CRITICAL DATE RULES:
- issue_date is NOT in the MRZ. Read it ONLY from the printed text.
- If you cannot clearly read issue_date, return "[UNREADABLE]". Do NOT calculate or guess it.
- For expiry_date and date_of_birth: read from printed text, convert to DD/MM/YYYY.
- Do NOT invent, calculate, or guess ANY date. Every digit must come from the document.
- For EACH date field, you MUST also return a confidence level:
  "HIGH" = every digit is clearly legible
  "MEDIUM" = some digits are partially obscured but you are fairly sure
  "LOW" = you are uncertain about one or more digits, or inferring from context

══════════════════════════════════════════
EXTRACTION RULES
══════════════════════════════════════════
- Copy text EXACTLY as printed. Do NOT correct spelling of names.
- ALL dates must be DD/MM/YYYY format.
- Gender: exactly "M" or "F" as printed in the Sex field.
- If a field is truly not visible, return "[UNREADABLE]".
- If a field does not exist on this passport type, return "".
- NEVER guess or fabricate. Every character must come from the document.
- If you are not 100% sure of a date, set the confidence to LOW and we will verify it.

Return ONLY a valid JSON object:
{
  "mrz_line_1": "full 44-char line 1 copied verbatim",
  "mrz_line_2": "full 44-char line 2 copied verbatim",
  "surname": "family name exactly as printed",
  "first_name": "first given name exactly as printed",
  "second_name": "second given name or empty string",
  "third_name": "third given name or empty string",
  "passport_number": "passport number as printed in the VIZ",
  "issue_date": "DD/MM/YYYY from printed text ONLY",
  "issue_date_confidence": "HIGH or MEDIUM or LOW",
  "place_of_issue": "issuing authority or city",
  "expiry_date": "DD/MM/YYYY from printed text",
  "expiry_date_confidence": "HIGH or MEDIUM or LOW",
  "passport_country": "issuing country",
  "nationality": "nationality as printed",
  "date_of_birth": "DD/MM/YYYY from printed text",
  "dob_confidence": "HIGH or MEDIUM or LOW",
  "city_of_birth": "city of birth",
  "country_of_birth": "country of birth",
  "gender": "M or F"
}

Output ONLY the JSON. No explanation, no markdown fences.`;
}

// ─────────────────────────────────────────────────────
// WORK PERMIT PROMPT
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
// GENERIC DOCUMENT PROMPT — for unknown document types
// ─────────────────────────────────────────────────────
function buildGenericDocumentPrompt(docName: string): string {
  return `You are an expert OCR specialist. Extract ALL text fields from this "${docName}" document image.

EXTRACTION RULES:
- Read every printed field label and its corresponding value.
- Return fields as key-value pairs where the key is a snake_case version of the field label.
- ALL dates must be converted to DD/MM/YYYY format.
- Copy text EXACTLY as printed. Do NOT correct spelling.
- If a field is not visible or unreadable, omit it entirely.
- Numbers, IDs, codes: extract as-is with all digits.
- Names: extract exactly as printed.
- If the document is in Arabic, transliterate names to English capital letters but keep numbers as-is.

Common fields to look for (include any you find):
- full_name, first_name, surname, father_name
- date_of_birth, gender, nationality, country
- document_number, id_number, civil_id
- issue_date, expiry_date, place_of_issue
- address, phone_number, mobile_number
- occupation, employer_name, sponsor_name
- Any other fields visible on the document

Return ONLY a valid JSON object with the extracted fields.
Example: { "full_name": "JOHN DOE", "document_number": "AB123456", "expiry_date": "15/03/2030" }

Output ONLY the JSON. No explanation, no markdown fences.`;
}

// ─────────────────────────────────────────────────────
// MAIN ROUTE HANDLER
// ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();

    const toDataUrl = async (file: File) => {
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      return `data:${file.type || 'image/jpeg'};base64,${b64}`;
    };

    // ── Check for new multi-document format (file_0, name_0, file_1, name_1...) ──
    const file0 = formData.get('file_0') as File | null;
    if (file0) {
      // New dynamic multi-document path
      const results: Record<string, Record<string, string>> = {};
      let i = 0;
      while (true) {
        const file = formData.get(`file_${i}`) as File | null;
        const name = formData.get(`name_${i}`) as string | null;
        if (!file) break;

        const docName = name || `Document ${i + 1}`;
        console.log(`[extract-manual] Processing document ${i}: "${docName}" (${file.name}, ${(file.size / 1024).toFixed(0)} KB)`);

        // Use specialized prompt for known document types
        const docNameLower = docName.toLowerCase();
        let extracted: Record<string, string>;

        if (docNameLower === 'passport') {
          // Full passport pipeline with MRZ + enhancement
          const passportBuf = Buffer.from(await file.arrayBuffer());
          const enhancement = await enhancePassportImage(
            passportBuf, file.name, file.type || 'image/jpeg',
          );
          const passportDataUrl = enhancement.dataUrl;

          const passportData = await callVision(apiKey, passportDataUrl, buildPassportPrompt(), 1500, 'gpt-4o');

          // MRZ parsing + override
          const mrz = parseMRZ(passportData.mrz_line_1, passportData.mrz_line_2);
          const mrzOverrides: Record<string, string> = {};

          if (mrz.dob && mrz.dobCheckOk === true) mrzOverrides.date_of_birth = formatDDMMYYYY(mrz.dob);
          if (mrz.expiry && mrz.expiryCheckOk === true) mrzOverrides.expiry_date = formatDDMMYYYY(mrz.expiry);
          if (mrz.gender) mrzOverrides.gender = mrz.gender;
          if (mrz.passportNumber && mrz.ppNumCheckOk === true) mrzOverrides.passport_number = mrz.passportNumber;

          const corrected = { ...passportData, ...mrzOverrides };
          delete corrected.mrz_line_1;
          delete corrected.mrz_line_2;
          delete corrected.issue_date_confidence;
          delete corrected.expiry_date_confidence;
          delete corrected.dob_confidence;

          // Validate
          const validation = validatePassportData(corrected);
          extracted = { ...corrected, ...validation.corrected };
        } else if (docNameLower === 'work permit' || docNameLower === 'labor card') {
          const dataUrl = await toDataUrl(file);
          extracted = await callVision(apiKey, dataUrl, buildWorkPermitPrompt(), 800, 'gpt-4o');
        } else {
          // Generic document extraction
          const dataUrl = await toDataUrl(file);
          extracted = await callVision(apiKey, dataUrl, buildGenericDocumentPrompt(docName), 1000, 'gpt-4o');
        }

        // Clean: ensure all values are strings
        const clean: Record<string, string> = {};
        Object.entries(extracted).forEach(([k, v]) => {
          if (v !== null && v !== undefined && String(v).trim() !== '' && !String(v).includes('UNREADABLE')) {
            clean[k] = String(v);
          }
        });

        results[docName] = clean;
        i++;
      }

      if (Object.keys(results).length === 0) {
        return NextResponse.json({ error: 'No documents provided.' }, { status: 400 });
      }

      return NextResponse.json(results);
    }

    // ── Legacy format: passport + optional work_permit ──
    const passportFile = formData.get('passport') as File | null;
    const workPermitFile = formData.get('work_permit') as File | null;
    const requestedModel = (formData.get('model') as string) || 'gpt-4o';

    const MODEL_MAP: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
    };
    const passportModel = MODEL_MAP[requestedModel] || 'gpt-4o';

    if (!passportFile) {
      return NextResponse.json({ error: 'No passport file provided.' }, { status: 400 });
    }

    // ── PASSPORT IMAGE ENHANCEMENT ──
    const passportBuf = Buffer.from(await passportFile.arrayBuffer());
    const enhancement = await enhancePassportImage(
      passportBuf,
      passportFile.name,
      passportFile.type || 'image/jpeg',
    );
    const passportDataUrl = enhancement.dataUrl;

    if (enhancement.wasEnhanced) {
      console.log(`[extract-manual] ✓ Passport image enhanced before LLM extraction`);
    } else {
      console.log(`[extract-manual] ⚠ Using raw image (processor unavailable or failed)`);
    }

    // ── Extract passport ──
    const passportData = await callVision(apiKey, passportDataUrl, buildPassportPrompt(), 1500, passportModel);

    // ── MRZ OVERRIDE ──
    const mrz = parseMRZ(passportData.mrz_line_1, passportData.mrz_line_2);
    const mrzOverrides: Record<string, string> = {};
    const mrzLog: string[] = [];
    const fieldVerification: Record<string, 'MRZ_VERIFIED' | 'MRZ_PARTIAL' | 'LLM_HIGH' | 'LLM_MEDIUM' | 'LLM_LOW' | 'COMPUTED' | 'UNVERIFIED'> = {};

    mrzLog.push(`📊 MRZ Quality: ${mrz.mrzQuality} | PP#✓=${mrz.ppNumCheckOk} | DOB✓=${mrz.dobCheckOk} | EXP✓=${mrz.expiryCheckOk} | Composite✓=${mrz.compositeCheckOk}`);

    if (mrz.dob && mrz.dobCheckOk === true) {
      const mrzDob = formatDDMMYYYY(mrz.dob);
      if (passportData.date_of_birth !== mrzDob) mrzLog.push(`🔄 DOB: LLM said "${passportData.date_of_birth}" → MRZ CHECKSUM-VERIFIED "${mrzDob}"`);
      mrzOverrides.date_of_birth = mrzDob;
      fieldVerification.date_of_birth = 'MRZ_VERIFIED';
    } else if (mrz.dob) {
      const mrzDob = formatDDMMYYYY(mrz.dob);
      const llmConf = (passportData.dob_confidence || 'HIGH').toUpperCase();
      if (llmConf === 'LOW') {
        mrzOverrides.date_of_birth = mrzDob;
        fieldVerification.date_of_birth = 'MRZ_PARTIAL';
      } else {
        fieldVerification.date_of_birth = llmConf === 'HIGH' ? 'LLM_HIGH' : 'LLM_MEDIUM';
      }
    } else {
      const llmConf = (passportData.dob_confidence || 'HIGH').toUpperCase();
      fieldVerification.date_of_birth = llmConf === 'HIGH' ? 'LLM_HIGH' : llmConf === 'MEDIUM' ? 'LLM_MEDIUM' : 'LLM_LOW';
    }

    if (mrz.expiry && mrz.expiryCheckOk === true) {
      const mrzExpiry = formatDDMMYYYY(mrz.expiry);
      if (passportData.expiry_date !== mrzExpiry) mrzLog.push(`🔄 EXPIRY: LLM said "${passportData.expiry_date}" → MRZ CHECKSUM-VERIFIED "${mrzExpiry}"`);
      mrzOverrides.expiry_date = mrzExpiry;
      fieldVerification.expiry_date = 'MRZ_VERIFIED';
    } else if (mrz.expiry) {
      const mrzExpiry = formatDDMMYYYY(mrz.expiry);
      const llmConf = (passportData.expiry_date_confidence || 'HIGH').toUpperCase();
      if (llmConf === 'LOW') {
        mrzOverrides.expiry_date = mrzExpiry;
        fieldVerification.expiry_date = 'MRZ_PARTIAL';
      } else {
        fieldVerification.expiry_date = llmConf === 'HIGH' ? 'LLM_HIGH' : 'LLM_MEDIUM';
      }
    } else {
      const llmConf = (passportData.expiry_date_confidence || 'HIGH').toUpperCase();
      fieldVerification.expiry_date = llmConf === 'HIGH' ? 'LLM_HIGH' : llmConf === 'MEDIUM' ? 'LLM_MEDIUM' : 'LLM_LOW';
    }

    if (mrz.gender) {
      if (passportData.gender !== mrz.gender) mrzLog.push(`🔄 GENDER: LLM said "${passportData.gender}" → MRZ says "${mrz.gender}"`);
      mrzOverrides.gender = mrz.gender;
      fieldVerification.gender = mrz.mrzQuality === 'VERIFIED' ? 'MRZ_VERIFIED' : 'MRZ_PARTIAL';
    }

    if (mrz.passportNumber && mrz.ppNumCheckOk === true) {
      const vizPP = (passportData.passport_number || '').replace(/[\s-]/g, '');
      if (vizPP !== mrz.passportNumber) mrzLog.push(`🔄 PP#: LLM said "${passportData.passport_number}" → MRZ CHECKSUM-VERIFIED "${mrz.passportNumber}"`);
      mrzOverrides.passport_number = mrz.passportNumber;
      fieldVerification.passport_number = 'MRZ_VERIFIED';
    } else if (mrz.passportNumber) {
      fieldVerification.passport_number = 'MRZ_PARTIAL';
      mrzOverrides.passport_number = mrz.passportNumber;
    }

    // Issue date triple-check
    const nat = mrz.nationality || '';
    const countryKey = MRZ_COUNTRY_MAP[nat] || '';
    const rules = countryKey ? PASSPORT_RULES[countryKey] : null;
    const effectiveExpiry = mrz.expiry || parseDDMMYYYY(mrzOverrides.expiry_date || passportData.expiry_date);
    const effectiveDob = mrz.dob || parseDDMMYYYY(mrzOverrides.date_of_birth || passportData.date_of_birth);
    const vizIssue = parseDDMMYYYY(passportData.issue_date);
    const issueConf = (passportData.issue_date_confidence || 'HIGH').toUpperCase();

    let computedIssue: Date | null = null;
    if (effectiveExpiry && rules && rules.validity.length === 1) {
      computedIssue = new Date(effectiveExpiry);
      computedIssue.setFullYear(computedIssue.getFullYear() - rules.validity[0]);
    }

    let issuePassesSanity = true;
    if (vizIssue) {
      const now = new Date();
      if (vizIssue > now) issuePassesSanity = false;
      if (effectiveExpiry && vizIssue >= effectiveExpiry) issuePassesSanity = false;
      if (effectiveDob && vizIssue <= effectiveDob) issuePassesSanity = false;
    }

    if (vizIssue && issuePassesSanity && computedIssue) {
      const diffDays = Math.abs(vizIssue.getTime() - computedIssue.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays <= 35) {
        fieldVerification.issue_date = issueConf === 'HIGH' ? 'LLM_HIGH' : 'LLM_MEDIUM';
      } else if (mrz.expiryCheckOk === true) {
        mrzOverrides.issue_date = formatDDMMYYYY(computedIssue);
        fieldVerification.issue_date = 'COMPUTED';
      } else if (issueConf === 'LOW') {
        mrzOverrides.issue_date = formatDDMMYYYY(computedIssue);
        fieldVerification.issue_date = 'COMPUTED';
      } else {
        fieldVerification.issue_date = issueConf === 'HIGH' ? 'LLM_HIGH' : 'LLM_MEDIUM';
      }
    } else if (!vizIssue && computedIssue) {
      mrzOverrides.issue_date = formatDDMMYYYY(computedIssue);
      fieldVerification.issue_date = 'COMPUTED';
    } else if (vizIssue && !issuePassesSanity && computedIssue) {
      mrzOverrides.issue_date = formatDDMMYYYY(computedIssue);
      fieldVerification.issue_date = 'COMPUTED';
    } else if (vizIssue && issuePassesSanity) {
      fieldVerification.issue_date = issueConf === 'HIGH' ? 'LLM_HIGH' : issueConf === 'MEDIUM' ? 'LLM_MEDIUM' : 'LLM_LOW';
    } else {
      fieldVerification.issue_date = 'UNVERIFIED';
    }

    const mrzCorrected = { ...passportData, ...mrzOverrides };
    delete mrzCorrected.mrz_line_1;
    delete mrzCorrected.mrz_line_2;
    delete mrzCorrected.issue_date_confidence;
    delete mrzCorrected.expiry_date_confidence;
    delete mrzCorrected.dob_confidence;

    if (mrzLog.length > 0) {
      console.log('VizEz MRZ Override Log:');
      mrzLog.forEach(l => console.log('  ', l));
    }

    const validation = validatePassportData(mrzCorrected);
    if (validation.warnings.length > 0) {
      console.log('VizEz Passport Validation Warnings:');
      validation.warnings.forEach(w => console.log('  ', w));
    }

    const correctedPassport = { ...mrzCorrected, ...validation.corrected };

    let workPermitData = null;
    if (workPermitFile) {
      const wpDataUrl = await toDataUrl(workPermitFile);
      workPermitData = await callVision(apiKey, wpDataUrl, buildWorkPermitPrompt(), 800, 'gpt-4o');
    }

    return NextResponse.json({
      passportData: correctedPassport,
      workPermitData,
      _validation: validation.warnings,
      _mrzOverrides: mrzLog,
      _fieldVerification: fieldVerification,
      _mrzQuality: mrz.mrzQuality,
      _enhancement: enhancement.wasEnhanced
        ? {
            enhanced: true,
            sourceFormat: enhancement.metrics?.sourceFormat,
            readyForExtraction: enhancement.metrics?.readyForExtraction,
            originalQuality: enhancement.metrics?.originalQuality,
            enhancedQuality: enhancement.metrics?.enhancedQuality,
            metadata: enhancement.metrics?.enhancementMetadata,
            enhancedImageUrl: enhancement.dataUrl,
          }
        : { enhanced: false },
    });
  } catch (error) {
    const err = error as Error;
    console.error('extract-manual route error:', err.message);
    return NextResponse.json({ error: err.message || 'Unknown server error.' }, { status: 500 });
  }
}

