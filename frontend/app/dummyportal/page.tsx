'use client';

import React, { useState, useEffect } from 'react';

const COUNTRIES = [
  '', 'AFGHANISTAN', 'ALBANIA', 'ALGERIA', 'ARGENTINA', 'AUSTRALIA', 'AUSTRIA',
  'BAHRAIN', 'BANGLADESH', 'BELGIUM', 'BRAZIL', 'CANADA', 'CHINA', 'COLOMBIA',
  'CZECH REPUBLIC', 'DENMARK', 'EGYPT', 'ETHIOPIA', 'FINLAND', 'FRANCE',
  'GERMANY', 'GREECE', 'HONG KONG', 'HUNGARY', 'INDIA', 'INDONESIA', 'IRAN',
  'IRAQ', 'IRELAND', 'ITALY', 'JAPAN', 'JORDAN', 'KENYA', 'KUWAIT',
  'LEBANON', 'MALAYSIA', 'MEXICO', 'MOROCCO', 'NEPAL', 'NETHERLANDS',
  'NEW ZEALAND', 'NIGERIA', 'NORWAY', 'OMAN', 'PAKISTAN', 'PHILIPPINES',
  'POLAND', 'PORTUGAL', 'QATAR', 'ROMANIA', 'RUSSIA', 'SAUDI ARABIA',
  'SINGAPORE', 'SOUTH AFRICA', 'SOUTH KOREA', 'SPAIN', 'SRI LANKA',
  'SWEDEN', 'SWITZERLAND', 'SYRIA', 'THAILAND', 'TURKEY', 'UAE',
  'UNITED KINGDOM', 'UNITED STATES', 'VIETNAM', 'YEMEN',
];

const DOC_TYPES = ['', 'Passport', 'Travel Document', 'Diplomatic Passport', 'Official Passport'];
const GENDERS = ['', 'Male', 'Female'];

const TABS = [
  'Apply for a Visa',
  'Travel Document Details',
  'Additional Details',
  'Required Documents',
  'Confirm Applicant Details',
  'Application Summary',
  'Submission Summary',
];

export default function DummyPortalPage() {
  const [activeTab, setActiveTab] = useState(1);

  // Travel Document Details
  const [nationality, setNationality] = useState('');
  const [issuingState, setIssuingState] = useState('');
  const [travelDocNumber, setTravelDocNumber] = useState('');
  const [travelDocType, setTravelDocType] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');

  // Applicant Details
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [countryOfBirth, setCountryOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');

  const handleClear = () => {
    setNationality(''); setIssuingState(''); setTravelDocNumber('');
    setTravelDocType(''); setIssueDate(''); setExpiryDate('');
    setPlaceOfIssue(''); setGivenName(''); setFamilyName('');
    setGender(''); setDob(''); setCountryOfBirth(''); setPlaceOfBirth('');
  };

  // Listen for autofill from VizEz extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const d = event.data;
      if (!d || d.type !== 'VIZEZ_AUTOFILL_DATA') return;
      const p = d.payload || {};

      // Map extracted passport keys → React state
      if (p['passport.nationality'] || p['passport.passport_country']) setNationality((p['passport.nationality'] || p['passport.passport_country'] || '').toUpperCase());
      if (p['passport.nationality'] || p['passport.passport_country']) setIssuingState((p['passport.nationality'] || p['passport.passport_country'] || '').toUpperCase());
      if (p['passport.passport_number']) setTravelDocNumber(p['passport.passport_number']);
      if (p['passport.issue_date']) setIssueDate(isoDate(p['passport.issue_date']));
      if (p['passport.expiry_date']) setExpiryDate(isoDate(p['passport.expiry_date']));
      if (p['passport.place_of_issue']) setPlaceOfIssue(p['passport.place_of_issue']);
      if (p['passport.first_name']) setGivenName(p['passport.first_name']);
      if (p['passport.surname']) setFamilyName(p['passport.surname']);
      if (p['passport.gender']) setGender(p['passport.gender'] === 'M' || p['passport.gender']?.toLowerCase() === 'male' ? 'Male' : p['passport.gender'] === 'F' || p['passport.gender']?.toLowerCase() === 'female' ? 'Female' : '');
      if (p['passport.date_of_birth']) setDob(isoDate(p['passport.date_of_birth']));
      if (p['passport.country_of_birth']) setCountryOfBirth((p['passport.country_of_birth'] || '').toUpperCase());
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Convert DD/MM/YYYY or YYYY-MM-DD to YYYY-MM-DD for HTML date inputs
  function isoDate(val: string): string {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const parts = val.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (y?.length === 4) return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return val;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#333' }}>
      {/* ═══ TOP HEADER BAR ═══ */}
      <div style={{
        background: 'linear-gradient(180deg, #1a3a8a 0%, #0d2669 100%)',
        padding: '8px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Oman Emblem */}
          <div style={{
            width: '60px', height: '70px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px',
          }}>
            🏛️
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px' }}>
              Sultanate of Oman
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
              Royal Oman Police
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            placeholder="search"
            style={{
              padding: '4px 10px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', width: '120px',
              outline: 'none',
            }}
          />
          <div style={{
            color: '#fff', fontSize: '22px', fontWeight: 800,
            fontFamily: 'Georgia, serif', fontStyle: 'italic',
          }}>
            eVisa
          </div>
        </div>
      </div>

      {/* ═══ BLUE NAVIGATION BAR ═══ */}
      <div style={{
        background: '#2255bb',
        padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: '0',
        borderBottom: '2px solid #1a4490',
      }}>
        {['Home', 'About ROP', 'Services', 'Information', 'Multimedia', 'Career', 'Contact Us', 'Other ROP sites'].map(item => (
          <button
            key={item}
            style={{
              padding: '8px 14px', background: 'transparent', border: 'none',
              color: '#fff', fontSize: '12px', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {item}
          </button>
        ))}
      </div>

      {/* ═══ USER BAR ═══ */}
      <div style={{
        background: '#e8e8e8', padding: '6px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #ccc',
      }}>
        <div style={{ fontSize: '12px' }}>
          <strong>User:</strong> <span style={{ color: '#1a3a8a', fontWeight: 600 }}>KAMAL PATEL</span>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Date: <strong>17-01-2016</strong>
        </div>
      </div>

      {/* ═══ STEP TABS ═══ */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '8px 14px', fontSize: '11px', fontWeight: 600,
                border: '1px solid #999', borderBottom: activeTab === i ? '2px solid #fff' : '1px solid #999',
                borderRadius: '4px 4px 0 0',
                background: activeTab === i ? '#2255bb' : '#d0d0d0',
                color: activeTab === i ? '#fff' : '#333',
                cursor: 'pointer', fontFamily: 'inherit',
                marginBottom: activeTab === i ? '-1px' : '0',
                position: 'relative', zIndex: activeTab === i ? 2 : 1,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ FORM CONTENT ═══ */}
      <div style={{
        margin: '0 20px 20px', padding: '20px',
        background: '#fff', border: '1px solid #999',
        minHeight: '500px',
      }}>
        {/* Visa Type Header */}
        <div style={{
          background: '#dde8f8', padding: '6px 12px',
          borderBottom: '1px solid #aac',
          fontSize: '12px', fontWeight: 600, color: '#1a3a8a',
          marginBottom: '4px',
        }}>
          Visa type : 26A Tourist Visit Visa
        </div>
        <div style={{ fontSize: '11px', color: '#c00', marginBottom: '16px', fontStyle: 'italic' }}>
          Fields marked with * are mandatory
        </div>

        {/* ── TRAVEL DOCUMENT DETAILS SECTION ── */}
        <fieldset style={{
          border: '1px solid #999', borderRadius: '4px',
          padding: '16px 20px', marginBottom: '20px',
        }}>
          <legend style={{
            fontSize: '13px', fontWeight: 700, color: '#333',
            padding: '0 8px',
          }}>
            Travel Document Details
          </legend>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 40px' }}>
            {/* Nationality */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="nationality" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Nationality <span style={{ color: '#c00' }}>*</span>
              </label>
              <select
                id="nationality"
                name="nationality"
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                required
                style={selectStyle}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c || '-- Select --'}</option>)}
              </select>
            </div>

            {/* Issuing State */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="issuing_state" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Issuing State <span style={{ color: '#c00' }}>*</span>
              </label>
              <select
                id="issuing_state"
                name="issuing_state"
                value={issuingState}
                onChange={e => setIssuingState(e.target.value)}
                required
                style={selectStyle}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c || '-- Select --'}</option>)}
              </select>
            </div>

            {/* Travel Document Number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="travel_document_number" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Travel Document Number <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="travel_document_number"
                name="travel_document_number"
                type="text"
                value={travelDocNumber}
                onChange={e => setTravelDocNumber(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Travel Document Type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="travel_document_type" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Travel Document Type <span style={{ color: '#c00' }}>*</span>
              </label>
              <select
                id="travel_document_type"
                name="travel_document_type"
                value={travelDocType}
                onChange={e => setTravelDocType(e.target.value)}
                required
                style={selectStyle}
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t || '-- Select --'}</option>)}
              </select>
            </div>

            {/* Issue Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="issue_date" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Issue Date <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="issue_date"
                name="issue_date"
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Expiry Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="expiry_date" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Expiry Date <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="expiry_date"
                name="expiry_date"
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Place of Issue */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="place_of_issue" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Place of Issue <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="place_of_issue"
                name="place_of_issue"
                type="text"
                value={placeOfIssue}
                onChange={e => setPlaceOfIssue(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>
        </fieldset>

        {/* ── APPLICANT DETAILS SECTION ── */}
        <fieldset style={{
          border: '1px solid #999', borderRadius: '4px',
          padding: '16px 20px', marginBottom: '20px',
        }}>
          <legend style={{
            fontSize: '13px', fontWeight: 700, color: '#333',
            padding: '0 8px',
          }}>
            Applicant Details
          </legend>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 40px' }}>
            {/* Given Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="given_name" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Given Name(s) <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="given_name"
                name="given_name"
                type="text"
                value={givenName}
                onChange={e => setGivenName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Family Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="family_name" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Family Name <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="family_name"
                name="family_name"
                type="text"
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Gender */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="gender" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Gender <span style={{ color: '#c00' }}>*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={gender}
                onChange={e => setGender(e.target.value)}
                required
                style={selectStyle}
              >
                {GENDERS.map(g => <option key={g} value={g}>{g || '-- Select --'}</option>)}
              </select>
            </div>

            {/* Date of Birth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="date_of_birth" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Date of Birth <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Country of Birth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="country_of_birth" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Country of Birth <span style={{ color: '#c00' }}>*</span>
              </label>
              <select
                id="country_of_birth"
                name="country_of_birth"
                value={countryOfBirth}
                onChange={e => setCountryOfBirth(e.target.value)}
                required
                style={selectStyle}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c || '-- Select --'}</option>)}
              </select>
            </div>

            {/* Place of Birth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="place_of_birth" style={{ width: '180px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                Place of Birth <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                id="place_of_birth"
                name="place_of_birth"
                type="text"
                value={placeOfBirth}
                onChange={e => setPlaceOfBirth(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>
        </fieldset>

        {/* ── ACTION BUTTONS ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
          paddingTop: '12px', borderTop: '1px solid #ddd',
        }}>
          <button style={btnStyle}>Cancel</button>
          <button onClick={handleClear} style={btnStyle}>Clear</button>
          <button style={btnStyle}>Save and Exit</button>
          <button style={{ ...btnStyle, background: '#2255bb', color: '#fff', borderColor: '#1a4490' }}>Next</button>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{
        background: '#1a3a8a', padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '3px solid #ffd700',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {['Copyright', 'Privacy Policy', 'Disclaimer', 'Contact Us', 'Sitemap'].map(link => (
            <span key={link} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', cursor: 'pointer' }}>
              {link}
            </span>
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
          eGovernment Portal — eOman
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ──
const inputStyle: React.CSSProperties = {
  flex: 1, padding: '5px 8px', fontSize: '12px',
  border: '1px solid #999', borderRadius: '2px',
  background: '#fff', color: '#333',
  fontFamily: 'Arial, Helvetica, sans-serif',
  outline: 'none', minWidth: 0,
};

const selectStyle: React.CSSProperties = {
  flex: 1, padding: '4px 6px', fontSize: '12px',
  border: '1px solid #999', borderRadius: '2px',
  background: '#fff', color: '#333',
  fontFamily: 'Arial, Helvetica, sans-serif',
  outline: 'none', minWidth: 0,
};

const btnStyle: React.CSSProperties = {
  padding: '6px 16px', fontSize: '12px', fontWeight: 600,
  border: '1px solid #999', borderRadius: '3px',
  background: '#e8e8e8', color: '#333',
  cursor: 'pointer', fontFamily: 'inherit',
};
