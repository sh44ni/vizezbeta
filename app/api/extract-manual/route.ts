import { NextRequest, NextResponse } from 'next/server';

async function callVision(
  apiKey: string,
  imageDataUrl: string,
  prompt: string,
  maxTokens = 600,
  model = 'gpt-4o-mini',
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
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const data = await response.json();
  const raw: string = data?.choices?.[0]?.message?.content || '';
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const passportFile = formData.get('passport') as File | null;
    const workPermitFile = formData.get('work_permit') as File | null;

    if (!passportFile) {
      return NextResponse.json({ error: 'No passport file provided.' }, { status: 400 });
    }

    const toDataUrl = async (file: File) => {
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      return `data:${file.type || 'image/jpeg'};base64,${b64}`;
    };

    const passportDataUrl = await toDataUrl(passportFile);

    const passportPrompt = `You are an expert passport OCR specialist for the Royal Oman Police eVisa portal.
Extract ALL fields from this passport image with maximum accuracy.
The document may contain Arabic and English text. Fully support Arabic text extraction natively. 
For names, if English and Arabic are both present, extract the English spelling, or use the MRZ for accuracy.
Use the MRZ (machine-readable zone) at the bottom for verification.
Convert all dates to DD/MM/YYYY format.
For gender, return only "M" or "F".

CRITICAL RULES:
- Extract ALL text EXACTLY as printed on the passport. Do NOT correct, alter, or "fix" any spelling.
- Names must be copied character-for-character as they appear on the document. Do NOT rearrange, capitalize differently, or modify the spelling in any way.
- If a field is not legible or you cannot confidently read it, return "[UNREADABLE]" for that field instead of guessing.
- Never invent or assume any data. Only return what is clearly visible.
- If a field is not present or not visible, return an empty string "".

Return ONLY a valid JSON object with exactly these fields:
{
  "surname": "family/last name EXACTLY as spelled on passport - do NOT alter",
  "first_name": "first given name EXACTLY as spelled",
  "second_name": "second given name if exists, else empty string",
  "third_name": "third given name if exists, else empty string",
  "passport_number": "exactly as shown",
  "issue_date": "DD/MM/YYYY",
  "place_of_issue": "city or authority that issued the passport",
  "expiry_date": "DD/MM/YYYY",
  "passport_country": "country that issued the passport",
  "nationality": "nationality exactly as written on passport",
  "date_of_birth": "DD/MM/YYYY",
  "city_of_birth": "city of birth",
  "country_of_birth": "country of birth",
  "gender": "M or F"
}

Return nothing else. Output must be valid JSON only.`;

    const passportData = await callVision(apiKey, passportDataUrl, passportPrompt, 700);

    let workPermitData = null;
    if (workPermitFile) {
      const wpDataUrl = await toDataUrl(workPermitFile);
      const wpPrompt = `You are an expert OCR specialist for Omani Work Permit / Labour Authorisation documents (ترخيص العمل / تصريح العمل) issued by the Oman Ministry of Labour (وزارة العمل).

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

Return ONLY a valid JSON object with exactly these fields. Values are in whatever language appears on the document:
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

Return nothing else. Output must be valid JSON only.`;
      // Use gpt-4o for work permits — significantly better Arabic OCR than gpt-4o-mini
      workPermitData = await callVision(apiKey, wpDataUrl, wpPrompt, 700, 'gpt-4o');
    }

    return NextResponse.json({ passportData, workPermitData });
  } catch (error) {
    const err = error as Error;
    console.error('extract-manual route error:', err.message);
    return NextResponse.json({ error: err.message || 'Unknown server error.' }, { status: 500 });
  }
}
