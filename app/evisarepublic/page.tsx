'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './evisa.css';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DIGITAL REPUBLIC OF EZVIZ — E-VISA PORTAL v4.2.1
   Multi-Step Application Wizard (Form IMM-7B Rev.3)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── DATA ARRAYS ── */

const NATIONALITIES = [
  'Select Nationality...', 'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan',
  'Antiguan', 'Argentine', 'Armenian', 'Australian', 'Austrian', 'Azerbaijani', 'Bahamian',
  'Bahraini', 'Bangladeshi', 'Barbadian', 'Belarusian', 'Belgian', 'Belizean', 'Beninese',
  'Bhutanese', 'Bolivian', 'Bosnian', 'Botswanan', 'Brazilian', 'British', 'Bruneian',
  'Bulgarian', 'Burkinabe', 'Burmese', 'Burundian', 'Cambodian', 'Cameroonian', 'Canadian',
  'Cape Verdean', 'Central African', 'Chadian', 'Chilean', 'Chinese', 'Colombian', 'Comoran',
  'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech', 'Danish', 'Djiboutian',
  'Dominican', 'Dutch', 'Ecuadorean', 'Egyptian', 'Emirian', 'Equatorial Guinean', 'Eritrean',
  'Estonian', 'Ethiopian', 'Fijian', 'Filipino', 'Finnish', 'French', 'Gabonese', 'Gambian',
  'Georgian', 'German', 'Ghanaian', 'Greek', 'Grenadian', 'Guatemalan', 'Guinean', 'Guyanese',
  'Haitian', 'Honduran', 'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Iraqi',
  'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakhstani',
  'Kenyan', 'Kiribati', 'Korean (North)', 'Korean (South)', 'Kuwaiti', 'Kyrgyz', 'Laotian',
  'Latvian', 'Lebanese', 'Liberian', 'Libyan', 'Liechtenstein', 'Lithuanian', 'Luxembourgish',
  'Macedonian', 'Malagasy', 'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese',
  'Marshallese', 'Mauritanian', 'Mauritian', 'Mexican', 'Micronesian', 'Moldovan', 'Monacan',
  'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican', 'Namibian', 'Nauruan', 'Nepalese',
  'New Zealander', 'Nicaraguan', 'Nigerien', 'Nigerian', 'Norwegian', 'Omani', 'Pakistani',
  'Palauan', 'Palestinian', 'Panamanian', 'Papua New Guinean', 'Paraguayan', 'Peruvian',
  'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saint Lucian',
  'Salvadoran', 'Samoan', 'Saudi', 'Senegalese', 'Serbian', 'Seychellois', 'Sierra Leonean',
  'Singaporean', 'Slovak', 'Slovenian', 'Solomon Islander', 'Somali', 'South African',
  'South Sudanese', 'Spanish', 'Sri Lankan', 'Sudanese', 'Surinamese', 'Swazi', 'Swedish',
  'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Timorese', 'Togolese',
  'Tongan', 'Trinidadian', 'Tunisian', 'Turkish', 'Turkmen', 'Tuvaluan', 'Ugandan',
  'Ukrainian', 'Uruguayan', 'Uzbek', 'Vanuatuan', 'Venezuelan', 'Vietnamese', 'Yemeni',
  'Zambian', 'Zimbabwean',
];

const VISA_TYPES = [
  'Select Visa Type...', 'Tourist Visa (TV-30)', 'Tourist Visa Extended (TV-90)',
  'Business Visa (BV-14)', 'Business Visa Extended (BV-60)', 'Transit Visa (TR-72H)',
  'Student Visa (SV-365)', 'Work Visa (WV-180)', 'Diplomatic Visa (DV-SPEC)',
  'Medical Visa (MV-30)', 'Conference Visa (CV-14)', 'Journalist Visa (JV-30)',
  'e-Visa on Arrival (eVOA-30)', 'Investor Visa (IV-365)', 'Crew Visa (CW-14)',
];

const ENTRY_PORTS = [
  'Select Port of Entry...', 'EZV-INT-001 — EzViz International Airport (Terminal A)',
  'EZV-INT-001 — EzViz International Airport (Terminal B)',
  'EZV-INT-001 — EzViz International Airport (Terminal C — Charter Only)',
  'EZV-SEA-002 — Port EzHarbour (Passenger Terminal)',
  'EZV-SEA-003 — Southern Bay Seaport',
  'EZV-LND-004 — Northern Border Crossing (Highway 7)',
  'EZV-LND-005 — Eastern Border Checkpoint (Rail)',
  'EZV-LND-006 — Western Frontier Gate',
  'EZV-DPL-007 — Diplomatic Entry (By Appointment)',
];

const PURPOSES = [
  'Select Purpose...', 'Tourism / Leisure', 'Business Meetings', 'Conference / Seminar',
  'Academic Research', 'Employment (Pre-Approved)', 'Family Visit', 'Medical Treatment',
  'Religious Pilgrimage', 'Sports Event', 'Cultural Exchange', 'Transit Only',
  'Government Invitation', 'Journalism / Media', 'Volunteer Work',
  'Internship / Training', 'Other (Specify Below)',
];

const STEP_LABELS = [
  'Personal Info', 'Travel Document', 'Journey Details', 'Contacts', 'Submit',
];

/* ── CAPTCHA ── */

function generateCaptcha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

/* ── INITIAL FORM STATE ── */

function getInitialFormData() {
  return {
    // Step 1 — Personal
    surname: '', givenNames: '', middleName: '', dateOfBirth: '', placeOfBirth: '',
    gender: '', nationality: '', nationalityAtBirth: '', nationalIdNumber: '',
    maritalStatus: '', occupation: '', fatherFullName: '', motherFullName: '',
    // Step 2 — Passport
    passportNumber: '', documentType: '', dateOfIssue: '', dateOfExpiry: '',
    issuingAuthority: '', placeOfIssue: '',
    // Step 3 — Travel
    visaType: '', purposeOfVisit: '', arrivalDate: '', departureDate: '',
    durationOfStay: '', portOfEntry: '', flightVesselNumber: '', numberOfEntries: '',
    previousVisits: '', addressDuringStay: '',
    // Step 4 — Contact & Emergency
    permanentAddress: '', email: '', phone: '', alternativePhone: '',
    employerName: '', employerAddress: '',
    emergencyName: '', emergencyRelationship: '', emergencyPhone: '', emergencyEmail: '',
    hostName: '', hostPhone: '', hostAddress: '',
    // Step 5 — Declaration
    refusedVisa: '', deported: '', criminalConviction: '',
    declarationDetails: '', additionalRemarks: '',
  };
}

/* ━━━━━━━━━━━━━━━━━━━ MAIN COMPONENT ━━━━━━━━━━━━━━━━━━━ */

export default function EvisaRepublicPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(getInitialFormData);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [showError, setShowError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ── Generic handler ── */
  const handleField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /* ── Captcha drawing ── */
  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Noisy background
    ctx.fillStyle = '#e8e4d9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 150}, ${Math.random() * 150}, ${Math.random() * 100}, 0.3)`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
    // Random lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${80 + Math.random() * 100}, ${80 + Math.random() * 60}, ${Math.random() * 80}, 0.5)`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }
    // Draw chars
    const fonts = ['serif', 'Georgia', 'Times New Roman', 'Courier'];
    for (let i = 0; i < code.length; i++) {
      ctx.save();
      const font = fonts[Math.floor(Math.random() * fonts.length)];
      ctx.font = `${22 + Math.random() * 10}px ${font}`;
      ctx.fillStyle = `rgb(${30 + Math.random() * 50}, ${20 + Math.random() * 40}, ${20 + Math.random() * 40})`;
      ctx.translate(22 + i * 28, 28 + Math.random() * 10);
      ctx.rotate((Math.random() - 0.5) * 0.6);
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    const code = generateCaptcha();
    setCaptchaCode(code);
    setTimeout(() => drawCaptcha(code), 100);
  }, [drawCaptcha]);

  function refreshCaptcha() {
    const code = generateCaptcha();
    setCaptchaCode(code);
    setCaptchaInput('');
    setTimeout(() => drawCaptcha(code), 50);
  }

  /* ── Navigation ── */
  function goNext() {
    setShowError('');
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goBack() {
    setShowError('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ── Submit ── */
  function handleSubmit() {
    if (captchaInput.toUpperCase() !== captchaCode) {
      setShowError('Incorrect CAPTCHA code. Please verify the characters and try again. (Error Code: CAPTCHA_MISMATCH_7B)');
      refreshCaptcha();
      return;
    }
    if (!termsAccepted) {
      setShowError('You must accept the Declaration & Terms of Submission before proceeding. (Error Code: TERMS_NOT_ACCEPTED)');
      return;
    }

    const hasYes = formData.refusedVisa === 'Yes (provide details below)' ||
      formData.deported === 'Yes (provide details below)' ||
      formData.criminalConviction === 'Yes (provide details below)';
    if (hasYes && !formData.declarationDetails.trim()) {
      setShowError('You indicated "Yes" to one or more declaration questions. Please provide details in the text area below. (Error Code: DECL_DETAILS_REQUIRED)');
      return;
    }

    const ref = `EVZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setRefNumber(ref);
    setSubmitted(true);
  }

  /* ━━━ SUCCESS PAGE ━━━ */
  if (submitted) {
    return (
      <div className="evisa-page">
        <div className="evisa-header-bar">
          <div className="evisa-header-inner">
            <div className="evisa-coat-of-arms">🏛️</div>
            <div className="evisa-header-text">
              <div className="evisa-header-title">DIGITAL REPUBLIC OF EZVIZ</div>
              <div className="evisa-header-subtitle">Ministry of Immigration &amp; Border Control — e-Visa Division</div>
            </div>
          </div>
        </div>
        <div className="evisa-success-wrapper">
          <div className="evisa-success-icon">✅</div>
          <h2 className="evisa-success-title">Application Submitted Successfully</h2>
          <p className="evisa-success-text">
            Your e-Visa application has been received and is being processed by the
            Ministry of Immigration &amp; Border Control.
          </p>
          <div className="evisa-success-ref">{refNumber}</div>
          <p className="evisa-success-text">
            Estimated processing time: <strong>3–7 business days</strong> (subject to verification and security clearance).<br />
            Please check your email at <strong>{formData.email || 'your registered address'}</strong> for further instructions and status updates.
          </p>
          <div className="evisa-success-notice">
            <strong>⚠ IMPORTANT NOTICE:</strong> Do not submit duplicate applications. Multiple submissions
            for the same travel period may result in automatic rejection per Article 17(b) of the Immigration
            &amp; Border Control Act (Amendment 2024). For status inquiries, contact evisa-support@gov.ezviz (response
            time: 5–10 business days). Quote your reference number in all correspondence.
          </div>
        </div>
        <div className="evisa-main-content">
          <Footer />
        </div>
      </div>
    );
  }

  /* ━━━ MAIN FORM PAGE ━━━ */
  const progressPercent = ((currentStep - 1) / 4) * 100;

  return (
    <div className="evisa-page">
      {/* ── MAINTENANCE BANNER ── */}
      <div className="evisa-maintenance-banner">
        ⚠ SYSTEM MAINTENANCE NOTICE: Portal may experience intermittent downtime between 02:00-04:00 UTC daily. [Ref: SYS-MAINT-2024-0847]
      </div>

      {/* ── HEADER ── */}
      <div className="evisa-header-bar">
        <div className="evisa-header-inner">
          <div className="evisa-coat-of-arms">🏛️</div>
          <div className="evisa-header-text">
            <div className="evisa-header-title">DIGITAL REPUBLIC OF EZVIZ</div>
            <div className="evisa-header-subtitle">Ministry of Immigration &amp; Border Control — e-Visa Division</div>
          </div>
          <div className="evisa-header-session">
            Portal v4.2.1<br />
            Secure Session Active
          </div>
        </div>
      </div>

      {/* ── SECONDARY NAV ── */}
      <div className="evisa-secondary-nav">
        {['Home', 'e-Visa Application', 'Track Status', 'Fee Schedule', 'Embassy Contacts', 'FAQs', 'Regulations'].map((item, i) => (
          <div key={item} className={`evisa-nav-item ${i === 1 ? 'evisa-nav-item--active' : ''}`}>
            {item}
          </div>
        ))}
      </div>

      {/* ── BREADCRUMB ── */}
      <div className="evisa-breadcrumb">
        Home &gt; Immigration Services &gt; e-Visa Application &gt; <strong>New Application (Form IMM-7B Rev.3)</strong>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="evisa-main-content">

        {/* ── Page Title ── */}
        <div className="evisa-page-title-wrapper">
          <h1 className="evisa-page-title">E-VISA APPLICATION FORM</h1>
          <div className="evisa-page-title-sub">
            Form IMM-7B (Revised 2024) — Immigration &amp; Border Control Act, Chapter 14, Section 3(a)
          </div>
          <div className="evisa-page-title-required">
            All fields marked with <span className="evisa-req">*</span> are mandatory. Incomplete applications will be automatically rejected.
          </div>
        </div>

        {/* ── STEPPER ── */}
        <div className="evisa-stepper">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            const circleClass = isCompleted
              ? 'evisa-stepper-circle evisa-stepper-circle--completed'
              : isActive
                ? 'evisa-stepper-circle evisa-stepper-circle--active'
                : 'evisa-stepper-circle evisa-stepper-circle--upcoming';
            const labelClass = isCompleted
              ? 'evisa-stepper-label evisa-stepper-label--completed'
              : isActive
                ? 'evisa-stepper-label evisa-stepper-label--active'
                : 'evisa-stepper-label';
            const connectorClass = isCompleted
              ? 'evisa-stepper-connector evisa-stepper-connector--completed'
              : isActive
                ? 'evisa-stepper-connector evisa-stepper-connector--active'
                : 'evisa-stepper-connector';

            return (
              <div key={label} className="evisa-stepper-step">
                <div className={circleClass}>
                  {isCompleted ? '✓' : stepNum}
                </div>
                <div className={labelClass}>{label}</div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={connectorClass} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Progress bar ── */}
        <div className="evisa-progress-bar-track">
          <div className="evisa-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* ── Step indicator ── */}
        <div className="evisa-step-indicator">Step {currentStep} of 5</div>

        {/* ══════════════════════ STEP 1 ══════════════════════ */}
        {currentStep === 1 && (
          <fieldset className="evisa-fieldset">
            <legend className="evisa-legend">SECTION A — PERSONAL PARTICULARS (As per travel document)</legend>

            <div className="evisa-row-3">
              <div className="evisa-field-group">
                <label className="evisa-label">Surname / Family Name <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="As shown in passport" value={formData.surname} onChange={e => handleField('surname', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Given Names <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="All given names" value={formData.givenNames} onChange={e => handleField('givenNames', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Middle Name(s)</label>
                <input className="evisa-input" placeholder="If applicable" value={formData.middleName} onChange={e => handleField('middleName', e.target.value)} />
              </div>
            </div>

            <div className="evisa-row-3">
              <div className="evisa-field-group">
                <label className="evisa-label">Date of Birth <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="date" value={formData.dateOfBirth} onChange={e => handleField('dateOfBirth', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Place of Birth <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="City, Country" value={formData.placeOfBirth} onChange={e => handleField('placeOfBirth', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Gender <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.gender} onChange={e => handleField('gender', e.target.value)} required>
                  <option value="">Select Gender...</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other (Specify in remarks)</option>
                </select>
              </div>
            </div>

            <div className="evisa-row-3">
              <div className="evisa-field-group">
                <label className="evisa-label">Nationality <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.nationality} onChange={e => handleField('nationality', e.target.value)} required>
                  {NATIONALITIES.map(n => <option key={n} value={n === 'Select Nationality...' ? '' : n}>{n}</option>)}
                </select>
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Nationality at Birth (if different)</label>
                <select className="evisa-select" value={formData.nationalityAtBirth} onChange={e => handleField('nationalityAtBirth', e.target.value)}>
                  {NATIONALITIES.map(n => <option key={n} value={n === 'Select Nationality...' ? '' : n}>{n}</option>)}
                </select>
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">National ID Number</label>
                <input className="evisa-input" placeholder="If applicable" value={formData.nationalIdNumber} onChange={e => handleField('nationalIdNumber', e.target.value)} />
              </div>
            </div>

            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Marital Status <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.maritalStatus} onChange={e => handleField('maritalStatus', e.target.value)} required>
                  <option value="">Select Status...</option>
                  <option>Single / Never Married</option>
                  <option>Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                  <option>Separated</option>
                  <option>Civil Partnership</option>
                </select>
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Occupation / Profession <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="Current occupation" value={formData.occupation} onChange={e => handleField('occupation', e.target.value)} required />
              </div>
            </div>

            <div className="evisa-field-group">
              <label className="evisa-label">{"Father's Full Name"} <span className="evisa-req">*</span></label>
              <input className="evisa-input" placeholder="Full name as per official records" value={formData.fatherFullName} onChange={e => handleField('fatherFullName', e.target.value)} required />
            </div>
            <div className="evisa-field-group">
              <label className="evisa-label">{"Mother's Full Name (including maiden name)"} <span className="evisa-req">*</span></label>
              <input className="evisa-input" placeholder="Full name as per official records" value={formData.motherFullName} onChange={e => handleField('motherFullName', e.target.value)} required />
            </div>
          </fieldset>
        )}

        {/* ══════════════════════ STEP 2 ══════════════════════ */}
        {currentStep === 2 && (
          <fieldset className="evisa-fieldset">
            <legend className="evisa-legend">SECTION B — PASSPORT &amp; TRAVEL DOCUMENT INFORMATION</legend>

            <div className="evisa-row-3">
              <div className="evisa-field-group">
                <label className="evisa-label">Passport Number <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="e.g. AB1234567" value={formData.passportNumber} onChange={e => handleField('passportNumber', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Date of Issue <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="date" value={formData.dateOfIssue} onChange={e => handleField('dateOfIssue', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Date of Expiry <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="date" value={formData.dateOfExpiry} onChange={e => handleField('dateOfExpiry', e.target.value)} required />
              </div>
            </div>

            <div className="evisa-field-group">
              <label className="evisa-label">Document Type <span className="evisa-req">*</span></label>
              <select className="evisa-select" value={formData.documentType} onChange={e => handleField('documentType', e.target.value)} required>
                <option value="">Select Document Type...</option>
                <option>Ordinary Passport</option>
                <option>Diplomatic Passport</option>
                <option>Official / Service Passport</option>
                <option>Emergency Travel Document</option>
                <option>Laissez-Passer</option>
                <option>Refugee Travel Document (1951 Convention)</option>
              </select>
            </div>

            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Issuing Authority <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="e.g. Passport Office, Country" value={formData.issuingAuthority} onChange={e => handleField('issuingAuthority', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Place of Issue <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="City / Country" value={formData.placeOfIssue} onChange={e => handleField('placeOfIssue', e.target.value)} required />
              </div>
            </div>

            <div className="evisa-note">
              <strong>Note:</strong> Passport must be valid for at least 6 months beyond the intended date of departure
              from the Digital Republic of EzViz, as per Regulation 12.4(c) of the Immigration Act. Expired or soon-to-expire
              documents will result in automatic rejection of this application.
            </div>
          </fieldset>
        )}

        {/* ══════════════════════ STEP 3 ══════════════════════ */}
        {currentStep === 3 && (
          <fieldset className="evisa-fieldset">
            <legend className="evisa-legend">SECTION C — JOURNEY INFORMATION</legend>

            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Visa Type Requested <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.visaType} onChange={e => handleField('visaType', e.target.value)} required>
                  {VISA_TYPES.map(v => <option key={v} value={v === 'Select Visa Type...' ? '' : v}>{v}</option>)}
                </select>
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Purpose of Visit <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.purposeOfVisit} onChange={e => handleField('purposeOfVisit', e.target.value)} required>
                  {PURPOSES.map(p => <option key={p} value={p === 'Select Purpose...' ? '' : p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="evisa-row-3">
              <div className="evisa-field-group">
                <label className="evisa-label">Intended Date of Arrival <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="date" value={formData.arrivalDate} onChange={e => handleField('arrivalDate', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Intended Date of Departure <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="date" value={formData.departureDate} onChange={e => handleField('departureDate', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Duration of Stay (days) <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="number" placeholder="e.g. 14" min="1" max="365" value={formData.durationOfStay} onChange={e => handleField('durationOfStay', e.target.value)} required />
              </div>
            </div>

            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Port of Entry <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.portOfEntry} onChange={e => handleField('portOfEntry', e.target.value)} required>
                  {ENTRY_PORTS.map(p => <option key={p} value={p === 'Select Port of Entry...' ? '' : p}>{p}</option>)}
                </select>
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Flight / Vessel Number</label>
                <input className="evisa-input" placeholder="e.g. EZ 4721" value={formData.flightVesselNumber} onChange={e => handleField('flightVesselNumber', e.target.value)} />
              </div>
            </div>

            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Number of Entries Requested <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.numberOfEntries} onChange={e => handleField('numberOfEntries', e.target.value)} required>
                  <option value="">Select...</option>
                  <option>Single Entry</option>
                  <option>Double Entry</option>
                  <option>Multiple Entry (requires additional documentation)</option>
                </select>
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Previous Visits to EzViz</label>
                <select className="evisa-select" value={formData.previousVisits} onChange={e => handleField('previousVisits', e.target.value)}>
                  <option value="">Select...</option>
                  <option>No previous visits</option>
                  <option>1–2 previous visits</option>
                  <option>3–5 previous visits</option>
                  <option>More than 5 visits</option>
                </select>
              </div>
            </div>

            <div className="evisa-field-group">
              <label className="evisa-label">Address During Stay in EzViz <span className="evisa-req">*</span></label>
              <textarea className="evisa-textarea" placeholder="Full address of hotel / residence including postal code" value={formData.addressDuringStay} onChange={e => handleField('addressDuringStay', e.target.value)} required rows={3} />
            </div>
          </fieldset>
        )}

        {/* ══════════════════════ STEP 4 ══════════════════════ */}
        {currentStep === 4 && (
          <fieldset className="evisa-fieldset">
            <legend className="evisa-legend">SECTION D — CONTACT INFORMATION &amp; EMERGENCY DETAILS</legend>

            <div className="evisa-field-group">
              <label className="evisa-label">Permanent Address <span className="evisa-req">*</span></label>
              <textarea className="evisa-textarea" placeholder="Full residential address in country of residence" value={formData.permanentAddress} onChange={e => handleField('permanentAddress', e.target.value)} required rows={2} />
            </div>

            <div className="evisa-row-3">
              <div className="evisa-field-group">
                <label className="evisa-label">Email Address <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="email" placeholder="your@email.com" value={formData.email} onChange={e => handleField('email', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Phone (with country code) <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="tel" placeholder="+1 555 123 4567" value={formData.phone} onChange={e => handleField('phone', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Alternative Phone</label>
                <input className="evisa-input" type="tel" placeholder="Optional" value={formData.alternativePhone} onChange={e => handleField('alternativePhone', e.target.value)} />
              </div>
            </div>

            <div className="evisa-field-group">
              <label className="evisa-label">Employer / Institution Name</label>
              <input className="evisa-input" placeholder="Current employer or educational institution" value={formData.employerName} onChange={e => handleField('employerName', e.target.value)} />
            </div>
            <div className="evisa-field-group">
              <label className="evisa-label">Employer / Institution Address</label>
              <textarea className="evisa-textarea" placeholder="Full address" value={formData.employerAddress} onChange={e => handleField('employerAddress', e.target.value)} rows={2} />
            </div>

            {/* Emergency Contact */}
            <div className="evisa-section-divider">Emergency Contact</div>

            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Emergency Contact Name <span className="evisa-req">*</span></label>
                <input className="evisa-input" placeholder="Full name" value={formData.emergencyName} onChange={e => handleField('emergencyName', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Relationship <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.emergencyRelationship} onChange={e => handleField('emergencyRelationship', e.target.value)} required>
                  <option value="">Select...</option>
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Sibling</option>
                  <option>Child</option>
                  <option>Friend</option>
                  <option>Employer</option>
                  <option>Legal Guardian</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Emergency Contact Phone <span className="evisa-req">*</span></label>
                <input className="evisa-input" type="tel" placeholder="+XX XXX XXXX" value={formData.emergencyPhone} onChange={e => handleField('emergencyPhone', e.target.value)} required />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Emergency Contact Email</label>
                <input className="evisa-input" type="email" placeholder="Optional" value={formData.emergencyEmail} onChange={e => handleField('emergencyEmail', e.target.value)} />
              </div>
            </div>

            {/* Host / Sponsor */}
            <div className="evisa-section-divider">Host / Sponsor in EzViz</div>
            <div className="evisa-note evisa-note--info">
              <strong>Host / Sponsor Information</strong> — Required for Business (BV), Work (WV), and Student (SV) visas.
              Leave blank for Tourist visas unless you have a local contact. Failure to provide this information for
              applicable visa types will result in processing delays.
            </div>
            <div className="evisa-row-2">
              <div className="evisa-field-group">
                <label className="evisa-label">Host / Sponsor Name in EzViz</label>
                <input className="evisa-input" placeholder="Individual or organization" value={formData.hostName} onChange={e => handleField('hostName', e.target.value)} />
              </div>
              <div className="evisa-field-group">
                <label className="evisa-label">Host / Sponsor Phone</label>
                <input className="evisa-input" type="tel" placeholder="Local phone number" value={formData.hostPhone} onChange={e => handleField('hostPhone', e.target.value)} />
              </div>
            </div>
            <div className="evisa-field-group">
              <label className="evisa-label">Host / Sponsor Address in EzViz</label>
              <textarea className="evisa-textarea" placeholder="Full address" value={formData.hostAddress} onChange={e => handleField('hostAddress', e.target.value)} rows={2} />
            </div>
          </fieldset>
        )}

        {/* ══════════════════════ STEP 5 ══════════════════════ */}
        {currentStep === 5 && (
          <>
            <fieldset className="evisa-fieldset">
              <legend className="evisa-legend">SECTION E — DECLARATION &amp; VERIFICATION</legend>

              <div className="evisa-declaration-question">
                <label className="evisa-label">Have you ever been refused a visa or entry to any country? <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.refusedVisa} onChange={e => handleField('refusedVisa', e.target.value)} required>
                  <option value="">Select...</option>
                  <option>No</option>
                  <option>Yes (provide details below)</option>
                </select>
              </div>
              <div className="evisa-declaration-question">
                <label className="evisa-label">Have you ever been deported or removed from any country? <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.deported} onChange={e => handleField('deported', e.target.value)} required>
                  <option value="">Select...</option>
                  <option>No</option>
                  <option>Yes (provide details below)</option>
                </select>
              </div>
              <div className="evisa-declaration-question">
                <label className="evisa-label">Have you ever been convicted of a criminal offense? <span className="evisa-req">*</span></label>
                <select className="evisa-select" value={formData.criminalConviction} onChange={e => handleField('criminalConviction', e.target.value)} required>
                  <option value="">Select...</option>
                  <option>No</option>
                  <option>Yes (provide details below)</option>
                </select>
              </div>

              {(formData.refusedVisa.includes('Yes') || formData.deported.includes('Yes') || formData.criminalConviction.includes('Yes')) && (
                <div className="evisa-field-group">
                  <label className="evisa-label">If you answered YES to any question above, provide details: <span className="evisa-req">*</span></label>
                  <textarea className="evisa-textarea" placeholder="Include dates, countries, and circumstances. Provide as much detail as possible..." value={formData.declarationDetails} onChange={e => handleField('declarationDetails', e.target.value)} rows={4} />
                </div>
              )}

              <div className="evisa-field-group">
                <label className="evisa-label">Additional Remarks / Special Requests</label>
                <textarea className="evisa-textarea" placeholder="Any additional information relevant to your application..." value={formData.additionalRemarks} onChange={e => handleField('additionalRemarks', e.target.value)} rows={3} />
              </div>
            </fieldset>

            {/* ── CAPTCHA & TERMS ── */}
            <fieldset className="evisa-fieldset evisa-fieldset--security">
              <legend className="evisa-legend evisa-legend--security">SECURITY VERIFICATION — REQUIRED</legend>

              <div className="evisa-captcha-wrapper">
                <div className="evisa-captcha-canvas-wrapper">
                  <label className="evisa-captcha-label">Enter the characters shown below <span className="evisa-req">*</span></label>
                  <canvas ref={canvasRef} width={200} height={44} className="evisa-captcha-canvas" />
                </div>
                <div className="evisa-captcha-input-wrapper">
                  <input
                    className="evisa-input evisa-input--captcha"
                    placeholder="Type CAPTCHA"
                    value={captchaInput}
                    onChange={e => setCaptchaInput(e.target.value)}
                    maxLength={6}
                    required
                  />
                  <button type="button" onClick={refreshCaptcha} className="evisa-refresh-btn">
                    🔄 Can&apos;t read? Refresh CAPTCHA
                  </button>
                </div>
              </div>

              {showError && (
                <div className="evisa-error-block">
                  <strong>Error:</strong> {showError}
                </div>
              )}

              {/* Terms */}
              <div className="evisa-terms-box">
                <strong>DECLARATION &amp; TERMS OF SUBMISSION</strong><br /><br />
                I hereby declare that all information provided in this application is true, complete, and correct
                to the best of my knowledge and belief. I understand that any willful misrepresentation or suppression
                of material facts may render this application invalid and may result in refusal of the visa, cancellation
                of an existing visa, or deportation from the Digital Republic of EzViz in accordance with the
                Immigration &amp; Border Control Act (2019, as amended 2024), Chapters 14-17. False declarations
                constitute an offense under Section 22(1) of the said Act, punishable by a fine not exceeding
                EZV $50,000 and/or imprisonment for a term not exceeding 12 months.
                <br /><br />
                I consent to the processing of my personal data by the Ministry of Immigration &amp; Border Control
                for the purpose of this visa application, in compliance with the EzViz Data Protection Regulation
                (EDPR) 2023, Articles 6(1)(b) and 9(2)(g). I acknowledge that my biometric data (if applicable)
                may be collected, stored, and processed for a period not exceeding 10 years, as stipulated under
                Regulation 42(3)(b). Data may be shared with relevant security agencies in accordance with
                the National Security Information Sharing Protocol (NSISP) 2022.
                <br /><br />
                I further acknowledge that the visa fee is non-refundable regardless of the outcome of this
                application, as per Fee Schedule Circular IMM-FEE-2024/Q1 published by the Revenue Division,
                Ministry of Finance. Processing times are estimates only and not guaranteed. The Ministry reserves
                the right to request additional documentation, schedule interviews, or conduct background checks
                as deemed necessary under Article 31 of the Immigration Regulations (2020).
                <br /><br />
                Submission of this form constitutes acceptance of these terms under Article 23 of the e-Government
                Services Act (2021). Any disputes arising from this application shall be governed by the laws
                of the Digital Republic of EzViz and subject to the exclusive jurisdiction of the EzViz
                Administrative Tribunal, in accordance with the Administrative Justice Act (2018), Part VII.
              </div>

              <label className="evisa-terms-checkbox-label">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="evisa-terms-checkbox" />
                <span>I have read and agree to the Declaration &amp; Terms of Submission above, and I certify that all information provided is accurate. <span className="evisa-req">*</span></span>
              </label>
            </fieldset>

            {/* ── Fee Info ── */}
            <div className="evisa-fee-info">
              Application fee: <strong>USD 75.00</strong> (Tourist/Transit) / <strong>USD 150.00</strong> (Business/Work) / <strong>USD 200.00</strong> (Multiple Entry) — payable upon approval notification.
              Processing: 3–7 business days. Express processing available for additional USD 50.00.
              Fees are non-refundable per Circular IMM-FEE-2024/Q1.
            </div>
          </>
        )}

        {/* ── NAVIGATION BAR ── */}
        <div className="evisa-nav-bar">
          <div className="evisa-nav-left">
            {currentStep > 1 && (
              <button type="button" className="evisa-btn-back" onClick={goBack}>
                ← Back
              </button>
            )}
            <span className="evisa-step-counter">Step {currentStep} of 5</span>
          </div>
          <div className="evisa-nav-right">
            {currentStep < 5 ? (
              <button type="button" className="evisa-btn-primary" onClick={goNext}>
                Continue →
              </button>
            ) : (
              <button type="button" className="evisa-btn-primary" onClick={handleSubmit}>
                Submit Application →
              </button>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <Footer />
      </div>
    </div>
  );
}

/* ━━━ FOOTER COMPONENT ━━━ */

function Footer() {
  return (
    <div className="evisa-footer">
      <div className="evisa-footer-columns">
        <div>
          <strong>Ministry of Immigration &amp; Border Control</strong><br />
          Government Complex, Block C, 4th Floor<br />
          Constitution Avenue, EzViz Capital District 10001<br />
          Tel: +999 (2) 555-0100 | Fax: +999 (2) 555-0199<br />
          Email: evisa-support@gov.ezviz
        </div>
        <div className="evisa-footer-right">
          <strong>Portal Information</strong><br />
          Version: 4.2.1 (Build 2024.03.17)<br />
          Last Updated: March 17, 2024<br />
          Compatible Browsers: Chrome 90+, Firefox 88+, Edge 90+<br />
          © 2024 Digital Republic of EzViz. All rights reserved.
        </div>
      </div>
      <div className="evisa-footer-bottom">
        This portal is a property of the Digital Republic of EzViz Government. Unauthorized access or misuse
        is prohibited under the Cyber Crimes Act (2022), Section 4. System monitored 24/7.
      </div>
    </div>
  );
}
