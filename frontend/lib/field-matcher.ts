// field-matcher.ts — Client-side AI field matching
// Matches scanned portal field labels → VizEz source keys

export interface SourceKeyOption {
  key: string;
  document: string;
  field: string;
  aliases: string[];
}

export interface MatchResult {
  source_key: string | null;
  source_label: string;
  confidence: number;
  fill_method: 'value' | 'select_by_text' | 'masked_keypress' | 'checkbox' | 'manual';
}

// All known source keys with aliases for fuzzy matching
const SOURCE_KEYS: SourceKeyOption[] = [
  { key: 'passport.full_name', document: 'Passport', field: 'Full Name', aliases: ['full name', 'name as in passport', 'applicant name', 'name in full'] },
  { key: 'passport.surname', document: 'Passport', field: 'Surname', aliases: ['surname', 'last name', 'family name'] },
  { key: 'passport.given_names', document: 'Passport', field: 'Given Names', aliases: ['given names', 'first name', 'given name', 'forename'] },
  { key: 'passport.passport_number', document: 'Passport', field: 'Passport Number', aliases: ['passport number', 'passport no', 'document number', 'travel doc'] },
  { key: 'passport.nationality', document: 'Passport', field: 'Nationality', aliases: ['nationality', 'citizen', 'citizenship', 'country of citizenship'] },
  { key: 'passport.date_of_birth', document: 'Passport', field: 'Date of Birth', aliases: ['date of birth', 'dob', 'birth date', 'birthday'] },
  { key: 'passport.sex', document: 'Passport', field: 'Sex', aliases: ['sex', 'gender'] },
  { key: 'passport.place_of_birth', document: 'Passport', field: 'Place of Birth', aliases: ['place of birth', 'birth place', 'born in'] },
  { key: 'passport.issue_date', document: 'Passport', field: 'Issue Date', aliases: ['issue date', 'passport issue', 'date of issue', 'issued on'] },
  { key: 'passport.expiry_date', document: 'Passport', field: 'Expiry Date', aliases: ['expiry date', 'passport expiry', 'date of expiry', 'expires', 'valid until', 'expiration'] },
  { key: 'passport.place_of_issue', document: 'Passport', field: 'Place of Issue', aliases: ['place of issue', 'issuing place', 'issued at'] },
  { key: 'passport.issuing_authority', document: 'Passport', field: 'Issuing Authority', aliases: ['issuing authority', 'authority', 'issued by'] },
  { key: 'passport.country', document: 'Passport', field: 'Country', aliases: ['country', 'passport country', 'country of birth'] },
  { key: 'passport.mrz_line1', document: 'Passport', field: 'MRZ Line 1', aliases: ['mrz'] },
  { key: 'work_permit.employer', document: 'Work Permit', field: 'Employer', aliases: ['employer', 'sponsor name', 'company', 'sponsor', 'employer name', 'sponsoring company'] },
  { key: 'work_permit.pa_number', document: 'Work Permit', field: 'PA Number', aliases: ['pa number', 'clearance', 'clearance number', 'permit number', 'labor clearance'] },
  { key: 'work_permit.civil_id', document: 'Work Permit', field: 'Civil ID', aliases: ['civil id', 'sponsor id', 'sponsor civil', 'id number'] },
  { key: 'work_permit.occupation_code', document: 'Work Permit', field: 'Occupation Code', aliases: ['occupation code', 'job code', 'profession code'] },
  { key: 'work_permit.occupation_desc', document: 'Work Permit', field: 'Occupation Description', aliases: ['occupation', 'job title', 'profession', 'occupation description'] },
  { key: 'work_permit.wfpa_number', document: 'Work Permit', field: 'WFPA Number', aliases: ['wfpa', 'wfpa number', 'workforce'] },
  { key: 'work_permit.sponsor_phone', document: 'Work Permit', field: 'Sponsor Phone', aliases: ['sponsor phone', 'office phone', 'sponsor tel'] },
  { key: 'work_permit.sponsor_mobile', document: 'Work Permit', field: 'Sponsor Mobile', aliases: ['sponsor mobile', 'mobile number', 'sponsor cell'] },
  { key: 'work_permit.sponsor_address', document: 'Work Permit', field: 'Sponsor Address', aliases: ['sponsor address', 'company address', 'employer address'] },
  { key: 'work_permit.expiry_date', document: 'Work Permit', field: 'Permit Expiry', aliases: ['permit expiry', 'work permit expiry', 'wp expiry'] },
  { key: 'passport.city_of_birth', document: 'Passport', field: 'City of Birth', aliases: ['city of birth', 'birth city', 'born in city'] },
  { key: 'passport.country_of_birth', document: 'Passport', field: 'Country of Birth', aliases: ['country of birth', 'birth country', 'born in country'] },
  { key: 'passport.second_name', document: 'Passport', field: 'Second Name', aliases: ['second name', 'middle name', 'second given name'] },
  { key: 'passport.third_name', document: 'Passport', field: 'Third Name', aliases: ['third name', 'third given name'] },
  { key: 'passport.mother_name', document: 'Passport', field: "Mother's Name", aliases: ['mother name', 'mothers name', 'mother'] },
  { key: 'passport.father_name', document: 'Passport', field: "Father's Name", aliases: ['father name', 'fathers name', 'father'] },
  { key: 'applicant.religion', document: 'Applicant', field: 'Religion', aliases: ['religion', 'faith', 'religious affiliation'] },
  { key: 'applicant.marital_status', document: 'Applicant', field: 'Marital Status', aliases: ['marital status', 'marital', 'married', 'single'] },
  { key: 'applicant.education', document: 'Applicant', field: 'Education Level', aliases: ['education', 'education level', 'qualification', 'highest education'] },
  { key: 'applicant.email', document: 'Applicant', field: 'Email', aliases: ['email', 'email address', 'e-mail', 'electronic mail'] },
  { key: 'applicant.phone', document: 'Applicant', field: 'Phone', aliases: ['phone', 'phone number', 'telephone', 'tel', 'contact number'] },
  { key: 'applicant.mobile', document: 'Applicant', field: 'Mobile', aliases: ['mobile', 'mobile number', 'cell phone', 'cell', 'mobile phone'] },
  { key: 'application.purpose', document: 'Application', field: 'Purpose of Visit', aliases: ['purpose of visit', 'purpose', 'reason for visit', 'travel purpose'] },
  { key: 'application.arrival_date', document: 'Application', field: 'Arrival Date', aliases: ['arrival date', 'entry date', 'date of arrival', 'travel date'] },
  { key: 'application.duration', document: 'Application', field: 'Duration of Stay', aliases: ['duration of stay', 'duration', 'length of stay', 'stay period'] },
  { key: 'application.visa_type', document: 'Application', field: 'Visa Type', aliases: ['visa type', 'type of visa', 'visa category'] },
  { key: 'application.prev_visa', document: 'Application', field: 'Previous Visa Number', aliases: ['previous visa', 'prior visa', 'old visa number'] },
  { key: 'work_permit.sponsor_type', document: 'Work Permit', field: 'Sponsor Type', aliases: ['sponsor type', 'sponsorship type', 'individual or company'] },
  { key: 'work_permit.relationship', document: 'Work Permit', field: 'Relationship', aliases: ['relationship', 'relation', 'sponsor relation', 'relation to sponsor'] },
  { key: 'work_permit.salary', document: 'Work Permit', field: 'Salary', aliases: ['salary', 'wage', 'income', 'monthly salary'] },
  { key: 'submitter.name', document: 'Submitter', field: 'Submitter Name', aliases: ['submitter name', 'submitted by', 'applicant name submitter', 'applying person'] },
  { key: 'submitter.civil_id', document: 'Submitter', field: 'Submitter ID', aliases: ['submitter id', 'submitted by id', 'applicant id'] },
  { key: 'submitter.phone', document: 'Submitter', field: 'Submitter Phone', aliases: ['submitter phone', 'submitter mobile', 'submitter gsm'] },
];

/**
 * Match a portal field label to the best VizEz source key
 */
export function matchField(label: string, fieldType: string): MatchResult {
  const normalized = label.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (!normalized) {
    return { source_key: null, source_label: 'Not matched', confidence: 0, fill_method: determineFillMethod(fieldType, false) };
  }

  let bestKey: SourceKeyOption | null = null;
  let bestScore = 0;

  for (const sk of SOURCE_KEYS) {
    // Check exact alias match
    for (const alias of sk.aliases) {
      if (normalized === alias) {
        return {
          source_key: sk.key,
          source_label: `${sk.document} → ${sk.field}`,
          confidence: 0.99,
          fill_method: determineFillMethod(fieldType, true),
        };
      }
    }

    // Check contains match
    for (const alias of sk.aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        const score = similarity(normalized, alias);
        if (score > bestScore) {
          bestScore = score;
          bestKey = sk;
        }
      }
    }

    // Levenshtein fallback
    for (const alias of sk.aliases) {
      const score = similarity(normalized, alias);
      if (score > bestScore && score > 0.45) {
        bestScore = score;
        bestKey = sk;
      }
    }
  }

  if (bestKey && bestScore >= 0.45) {
    return {
      source_key: bestKey.key,
      source_label: `${bestKey.document} → ${bestKey.field}`,
      confidence: Math.min(bestScore, 0.99),
      fill_method: determineFillMethod(fieldType, true),
    };
  }

  // Known manual fields
  if (isKnownManual(normalized)) {
    return { source_key: null, source_label: 'Manual entry required', confidence: 0, fill_method: 'manual' };
  }

  return { source_key: null, source_label: 'Not matched — review needed', confidence: 0, fill_method: determineFillMethod(fieldType, false) };
}

/**
 * Batch match all scanned fields
 */
export function matchAllFields(fields: Array<{ label: string; type: string; selector: string; required: boolean; options?: any[] }>) {
  return fields.map((f, i) => {
    const match = matchField(f.label, f.type);
    return {
      portal_selector: f.selector,
      portal_label: f.label,
      type: f.type,
      required: f.required,
      source_key: match.source_key,
      source_label: match.source_label,
      fill_method: match.fill_method,
      confidence: match.confidence,
      options: f.options,
      sort_order: i,
      review_status: match.confidence >= 0.85 ? 'approved' as const : 'pending' as const,
    };
  });
}

function determineFillMethod(type: string, hasSource: boolean): MatchResult['fill_method'] {
  if (!hasSource) return 'manual';
  switch (type) {
    case 'select': return 'select_by_text';
    case 'checkbox': return 'checkbox';
    default: return 'value';
  }
}

function isKnownManual(label: string): boolean {
  const manualPatterns = [
    'captcha', 'verification code',
    'photograph', 'personal photo', 'upload photo',
    'signature',
  ];
  return manualPatterns.some(p => label.includes(p));
}

/**
 * Similarity score between two strings (0-1) using trigram overlap
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const trigramsA = trigrams(a);
  const trigramsB = trigrams(b);

  let matches = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) matches++;
  }

  return (2 * matches) / (trigramsA.size + trigramsB.size);
}

function trigrams(str: string): Set<string> {
  const s = ` ${str} `;
  const result = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) {
    result.add(s.slice(i, i + 3));
  }
  return result;
}
