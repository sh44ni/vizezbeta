import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured on server.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in request.' }, { status: 400 });
    }

    // Convert file to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `You are a passport OCR specialist. Extract data from this passport image accurately.
The document may contain Arabic and English text. Fully support Arabic text extraction natively.
For names, if English and Arabic are both present, extract the English spelling, or use the MRZ for accuracy.

CRITICAL DATE EXTRACTION RULES:
- DATES MUST BE READ EXACTLY FROM THE DOCUMENT. Do NOT calculate, estimate, or guess any date.
- The EXPIRY DATE must be read directly from the passport's "Date of Expiry" field, NOT calculated from issue date.
- CROSS-VERIFY all dates against the MRZ (machine-readable zone) at the bottom of the passport.
- If the printed date and MRZ date conflict, USE THE MRZ DATE.
- If you cannot clearly read a date, return "[UNREADABLE]". NEVER fabricate a date.

CRITICAL GENERAL RULES:
- Extract ALL text EXACTLY as printed on the passport. Do NOT correct, alter, or "fix" any spelling.
- Names must be copied character-for-character as they appear on the document. Do NOT rearrange, capitalize differently, or modify the spelling in any way.
- If a field is not legible or you cannot confidently read it, return "[UNREADABLE]" for that field instead of guessing.
- Never invent or assume any data. Only return what is clearly visible.

Return ONLY a JSON object with these exact fields:
{
  "full_name": "last name then first name EXACTLY as spelled on passport - do NOT alter spelling",
  "passport_number": "exactly as shown",
  "nationality": "exactly as written on passport",
  "date_of_birth": "DD MMM YYYY - read from document, cross-verify with MRZ",
  "expiry_date": "DD MMM YYYY - MUST be read from passport or MRZ, NEVER calculated"
}
Use the MRZ zone at the bottom for accuracy if visible. Return nothing else. Output must be valid JSON only.`;

    // OpenAI vision endpoint
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      const message = errorBody?.error?.message || errorBody?.message || 'OpenAI API request failed';
      console.error('OpenAI API Error:', JSON.stringify(errorBody, null, 2));
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const data = await response.json();
    const rawText: string = data?.choices?.[0]?.message?.content || '';

    if (!rawText) {
      return NextResponse.json({ error: 'OpenAI returned an empty response.' }, { status: 500 });
    }

    // Strip markdown code fences if present
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (error) {
    const err = error as Error;
    console.error('Extraction route error:', err.message);
    return NextResponse.json({ error: err.message || 'Unknown server error.' }, { status: 500 });
  }
}
