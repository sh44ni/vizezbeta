import { NextRequest, NextResponse } from 'next/server';

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
// BUILD PASSPORT PROMPT — the expert-level prompt
// ─────────────────────────────────────────────────────
function buildPassportPrompt(): string {
  return `You are a SENIOR passport OCR analyst with 20 years of experience processing passports for the Royal Oman Police eVisa portal. You process passports from Nepal, India, Bangladesh, Sri Lanka, Pakistan, Philippines, Indonesia, Ethiopia, Egypt, Uganda, Kenya, Tanzania, Vietnam, Myanmar, and other countries daily.

Your job is to extract data with 100% accuracy. Before returning ANY field, you must REASON about whether the value makes sense.

══════════════════════════════════════════
STEP 1: READ THE MRZ FIRST
══════════════════════════════════════════
The Machine Readable Zone (MRZ) at the bottom of the passport is the MOST RELIABLE source.
MRZ Line 1: P<COUNTRY_CODE<<SURNAME<<GIVEN<NAMES<<<<<<<<<<<<
MRZ Line 2: PASSPORT_NO_CHECK_DOB_CHECK_SEX_EXPIRY_CHECK_...

Decode MRZ Line 2 character positions (0-indexed):
- Positions 0-8: Passport number (9 chars, may include a filler <)
- Position 9: Passport number check digit
- Positions 10-12: Nationality (3-letter country code)
- Positions 13-18: Date of birth (YYMMDD)
- Position 19: DOB check digit
- Position 20: Sex (M or F)
- Positions 21-26: Expiry date (YYMMDD)
- Position 27: Expiry check digit

ALWAYS cross-verify the printed (VIZ) fields against the MRZ. If they conflict, USE THE MRZ.

══════════════════════════════════════════
STEP 2: COUNTRY-SPECIFIC PASSPORT KNOWLEDGE
══════════════════════════════════════════
Apply these rules to VERIFY your extraction:

NEPAL (NPL):
- Passport validity: ALWAYS 10 years. If expiry - issue ≠ 10 years, re-read the dates.
- Passport number: Old format = 8 digits. MRP format = 2 letters + 7 digits (e.g. "PA1234567"). Total 8-9 chars.
- MRZ nationality code: NPL

INDIA (IND):
- Passport validity: ALWAYS 10 years (for adults over 18). Minors = 5 years.
- Passport number: 1 uppercase letter + 7 digits (e.g. "T1234567"). Always exactly 8 chars.
- MRZ nationality code: IND

BANGLADESH (BGD):
- Passport validity: 5 years (old MRP) or 10 years (e-passport, since ~2020).
- Passport number: 2 letters + 7 digits (e.g. "BK0234567"). Always 9 chars.
- MRZ nationality code: BGD

SRI LANKA (LKA):
- Passport validity: 10 years.
- Passport number: 1 letter + 7 digits (e.g. "N1234567"). Always 8 chars.
- MRZ nationality code: LKA

PAKISTAN (PAK):
- Passport validity: 5 years (old) or 10 years (new).
- Passport number: 2 letters + 7 digits (e.g. "AB1234567"). Always 9 chars.
- MRZ nationality code: PAK

PHILIPPINES (PHL):
- Passport validity: 5 or 10 years.
- Passport number: 2 letters + 7 digits (e.g. "EC1234567") or varies. Typically 8-9 chars.
- MRZ nationality code: PHL

INDONESIA (IDN):
- Passport validity: 5 years (old) or 10 years (since 2022).
- Passport number: 1-2 letters + digits. Typically 8 chars.
- MRZ nationality code: IDN

ETHIOPIA (ETH):
- Passport validity: 5 years.
- Passport number: "EP" + 7 digits (e.g. "EP1234567"). Always 9 chars.
- MRZ nationality code: ETH

EGYPT (EGY):
- Passport validity: 7 years.
- Passport number: 1 letter + 7-8 digits. 8-9 chars total.
- MRZ nationality code: EGY

UGANDA (UGA): validity 10 years, passport 8-9 chars.
KENYA (KEN): validity 10 years, passport 8-9 chars.
TANZANIA (TZA): validity 5 or 10 years, passport 9 chars.
VIETNAM (VNM): validity 10 years, 1 letter + 8 digits = 9 chars.
MYANMAR (MMR): validity 5 years, 2 letters + 6 digits = 8 chars.

══════════════════════════════════════════
STEP 3: SELF-VERIFICATION CHECKLIST
══════════════════════════════════════════
Before outputting your JSON, verify EVERY field:

□ PASSPORT NUMBER: Count the digits/letters. Does the character count match the expected format for this country?
□ DATES: Are ALL dates in DD/MM/YYYY? Is expiry_date > issue_date? Does (expiry - issue) match the known validity period?
□ DOB: Is the person's age reasonable (typically 18-60 for work visa applicants)?
□ GENDER: Read from the passport Sex/Gender field AND verify against MRZ position 20. Return only "M" or "F".
□ NAMES: Are the names copied EXACTLY as printed, character-for-character? Do NOT rearrange or modify them.
□ NATIONALITY vs COUNTRY: These are read separately — nationality from the "Nationality" field, country from issuing authority.

══════════════════════════════════════════
EXTRACTION RULES
══════════════════════════════════════════
- Extract text EXACTLY as printed. Do NOT correct spelling of names.
- ALL dates must be DD/MM/YYYY format.
- Gender: exactly "M" or "F".
- If a field is truly not visible or unreadable, return "[UNREADABLE]".
- If a field does not exist on this passport type, return "".
- NEVER guess or fabricate data. Every character must come from the document.

Return ONLY a valid JSON object:
{
  "surname": "family name exactly as printed",
  "first_name": "first given name exactly as printed",
  "second_name": "second given name or empty string",
  "third_name": "third given name or empty string",
  "passport_number": "exact passport number after verification",
  "issue_date": "DD/MM/YYYY",
  "place_of_issue": "issuing authority or city",
  "expiry_date": "DD/MM/YYYY",
  "passport_country": "issuing country",
  "nationality": "nationality as printed",
  "date_of_birth": "DD/MM/YYYY",
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
// MAIN ROUTE HANDLER
// ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const passportFile = formData.get('passport') as File | null;
    const workPermitFile = formData.get('work_permit') as File | null;
    const requestedModel = (formData.get('model') as string) || 'gpt-4o';

    // Map frontend model IDs to actual API model names
    const MODEL_MAP: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      // 'sonnet-4': 'claude-sonnet-4' — coming soon
    };
    const passportModel = MODEL_MAP[requestedModel] || 'gpt-4o';

    if (!passportFile) {
      return NextResponse.json({ error: 'No passport file provided.' }, { status: 400 });
    }

    const toDataUrl = async (file: File) => {
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      return `data:${file.type || 'image/jpeg'};base64,${b64}`;
    };

    // ── Extract passport ──
    const passportDataUrl = await toDataUrl(passportFile);
    const passportData = await callVision(apiKey, passportDataUrl, buildPassportPrompt(), 1200, passportModel);

    // ── Post-extraction validation ──
    const validation = validatePassportData(passportData);
    if (validation.warnings.length > 0) {
      console.log('VizEz Passport Validation Warnings:');
      validation.warnings.forEach(w => console.log('  ', w));
    }

    // Apply auto-corrections (e.g. expiry date recalculated from country rules)
    const correctedPassport = { ...passportData, ...validation.corrected };

    // ── Extract work permit ──
    let workPermitData = null;
    if (workPermitFile) {
      const wpDataUrl = await toDataUrl(workPermitFile);
      workPermitData = await callVision(apiKey, wpDataUrl, buildWorkPermitPrompt(), 800, 'gpt-4o');
    }

    return NextResponse.json({
      passportData: correctedPassport,
      workPermitData,
      _validation: validation.warnings, // expose warnings to frontend
    });
  } catch (error) {
    const err = error as Error;
    console.error('extract-manual route error:', err.message);
    return NextResponse.json({ error: err.message || 'Unknown server error.' }, { status: 500 });
  }
}
