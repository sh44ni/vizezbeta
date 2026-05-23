// routes/analyze-fields.js — AI-powered field analysis
// Takes raw DOM scan data → GPT-4o → returns only real form fields

/**
 * POST /api/portals/analyze-fields
 * Body: { url, title, fields: [{ selector, label, type, required, options?, tagName?, ... }] }
 * Returns: { fields: [...filtered & enriched fields], removed: [...noise fields], analysis: string }
 */
export async function handleAnalyzeFields(req, res, body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(res, 500, { error: 'OPENAI_API_KEY not configured.' });
  }

  try {
    const data = JSON.parse(body);
    const { url = '', title = '', fields = [] } = data;

    if (!fields.length) {
      return json(res, 400, { error: 'No fields provided for analysis.' });
    }

    // Build a concise field summary for the AI
    const fieldSummary = fields.map((f, i) => ({
      index: i,
      selector: f.selector || '',
      label: (f.label || '').trim(),
      type: f.type || 'text',
      required: !!f.required,
      tagName: f.tagName || '',
      options: f.options ? f.options.slice(0, 8).map(o => o.text || o.value || o) : undefined,
      placeholder: f.placeholder || '',
      name: f.name || '',
      id: f.id || '',
    }));

    const prompt = buildAnalysisPrompt(url, title, fieldSummary);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
    }

    const aiResponse = await response.json();
    const raw = aiResponse?.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }

    const analysis = JSON.parse(cleaned);

    // Map AI results back to original field data, keeping only the ones AI says are real
    const keptIndices = new Set((analysis.form_fields || []).map(f => f.index));
    const removedIndices = new Set((analysis.noise_fields || []).map(f => f.index));

    const realFields = (analysis.form_fields || []).map(af => {
      const original = fields[af.index] || {};
      return {
        ...original,
        // AI-enhanced label (better than raw DOM scrape)
        label: af.clean_label || original.label || '',
        // AI-suggested source key
        suggested_source: af.source_key || null,
        suggested_source_label: af.source_label || '',
        // AI confidence
        ai_confidence: af.confidence || 0,
        // Keep original data
        original_label: original.label || '',
        selector: original.selector || af.selector || '',
        type: af.field_type || original.type || 'text',
        required: af.required !== undefined ? af.required : original.required,
      };
    });

    const removedFields = (analysis.noise_fields || []).map(nf => ({
      index: nf.index,
      label: fields[nf.index]?.label || '',
      reason: nf.reason || 'Not a form field',
    }));

    console.log(`[analyze-fields] ${url}`);
    console.log(`  Raw fields: ${fields.length} → Real form fields: ${realFields.length} (removed ${removedFields.length} noise)`);
    removedFields.forEach(r => console.log(`    ✕ "${r.label}" — ${r.reason}`));

    return json(res, 200, {
      url,
      title,
      total_fields: realFields.length,
      required_fields: realFields.filter(f => f.required).length,
      fields: realFields,
      removed: removedFields,
      language: analysis.language || 'en',
    });
  } catch (error) {
    console.error('[analyze-fields] Error:', error.message);
    return json(res, 500, { error: error.message || 'Field analysis failed.' });
  }
}

/**
 * Build the GPT-4o prompt for intelligent field analysis
 */
function buildAnalysisPrompt(url, title, fields) {
  const fieldJSON = JSON.stringify(fields, null, 2);

  return `You are an expert at analyzing web forms. You've been given raw DOM scan data from a web page and need to determine which elements are actual APPLICATION FORM FIELDS vs. UI noise (navigation, search bars, login inputs, filters, etc.)

═══════════════════════════════════════
PAGE CONTEXT
═══════════════════════════════════════
URL: ${url}
Page Title: ${title}

═══════════════════════════════════════
RAW SCANNED FIELDS (from DOM)
═══════════════════════════════════════
${fieldJSON}

═══════════════════════════════════════
YOUR TASK
═══════════════════════════════════════

1. CLASSIFY each field as either a REAL FORM FIELD or NOISE:
   - REAL FORM FIELDS: inputs that an applicant/user must fill to submit an application, visa, booking, insurance, etc. These are fields like: name, nationality, passport number, date of birth, gender, address, phone, employer, etc.
   - NOISE: navigation search bars, login forms, site-wide filters, CAPTCHA, hidden fields, submit/cancel buttons disguised as inputs, internal IDs, session tokens, etc.

2. For each REAL form field, provide:
   - A clean, human-readable label (fix any garbled OCR labels, missing labels, or cryptic IDs)
   - The correct field type (text, select, date, checkbox, radio, textarea, file)
   - Whether it's truly required for form submission
   - A suggested source_key mapping to common document fields:
      Passport fields: passport.surname, passport.given_names, passport.passport_number, passport.nationality, passport.date_of_birth, passport.sex, passport.place_of_birth, passport.city_of_birth, passport.country_of_birth, passport.issue_date, passport.expiry_date, passport.place_of_issue, passport.country, passport.second_name, passport.third_name, passport.mother_name, passport.father_name
      Work Permit fields: work_permit.employer, work_permit.pa_number, work_permit.civil_id, work_permit.occupation_code, work_permit.occupation_desc, work_permit.wfpa_number, work_permit.sponsor_phone, work_permit.sponsor_mobile, work_permit.sponsor_address, work_permit.sponsor_type, work_permit.relationship, work_permit.salary
      Applicant fields: applicant.religion, applicant.marital_status, applicant.education, applicant.email, applicant.phone, applicant.mobile
      Application fields: application.purpose, application.arrival_date, application.duration, application.visa_type, application.prev_visa
      Submitter fields: submitter.name, submitter.civil_id, submitter.phone
      If no mapping exists, use null.
   - Confidence (0.0-1.0) in the mapping

3. For each NOISE field, explain why it was excluded (e.g., "Navigation search bar", "Login field", "Hidden CSRF token")

═══════════════════════════════════════
CLASSIFICATION HINTS
═══════════════════════════════════════
- Search inputs at the top of the page are almost always navigation, not form fields
- If the selector path includes "nav", "header", "footer", "search", "login", "auth" → likely noise
- If the field has no label OR a generic label like "search", "q", "query" → likely noise
- Form fields inside <fieldset> or <form> elements with semantic names → likely real
- Fields with IDs/names like "nationality", "passport", "dob", "gender", "given_name" → definitely real
- Date fields, country dropdowns, gender selects → almost always real form fields
- Consider the page context (visa portal, booking form, etc.) when deciding

═══════════════════════════════════════
OUTPUT FORMAT (JSON only, no explanation)
═══════════════════════════════════════
{
  "language": "en or ar or detected language code",
  "form_fields": [
    {
      "index": 0,
      "selector": "original CSS selector",
      "clean_label": "Human Readable Label",
      "field_type": "text|select|date|checkbox|radio|textarea|file",
      "required": true,
      "source_key": "passport.surname or null",
      "source_label": "Passport → Surname or empty",
      "confidence": 0.95
    }
  ],
  "noise_fields": [
    {
      "index": 3,
      "reason": "Navigation search bar — not part of the application form"
    }
  ]
}`;
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
