'use client';

import React, { useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';

// All available VizEz source keys for manual field assignment
const SOURCE_FIELDS = [
  // ── Passport ──
  { key: 'passport.full_name', document: 'Passport', field: 'Full Name' },
  { key: 'passport.surname', document: 'Passport', field: 'Surname' },
  { key: 'passport.given_names', document: 'Passport', field: 'Given Names' },
  { key: 'passport.second_name', document: 'Passport', field: 'Second Name' },
  { key: 'passport.third_name', document: 'Passport', field: 'Third Name' },
  { key: 'passport.passport_number', document: 'Passport', field: 'Passport Number' },
  { key: 'passport.nationality', document: 'Passport', field: 'Nationality' },
  { key: 'passport.date_of_birth', document: 'Passport', field: 'Date of Birth' },
  { key: 'passport.sex', document: 'Passport', field: 'Sex' },
  { key: 'passport.place_of_birth', document: 'Passport', field: 'Place of Birth' },
  { key: 'passport.city_of_birth', document: 'Passport', field: 'City of Birth' },
  { key: 'passport.country_of_birth', document: 'Passport', field: 'Country of Birth' },
  { key: 'passport.issue_date', document: 'Passport', field: 'Issue Date' },
  { key: 'passport.expiry_date', document: 'Passport', field: 'Expiry Date' },
  { key: 'passport.place_of_issue', document: 'Passport', field: 'Place of Issue' },
  { key: 'passport.issuing_authority', document: 'Passport', field: 'Issuing Authority' },
  { key: 'passport.country', document: 'Passport', field: 'Country' },
  { key: 'passport.mother_name', document: 'Passport', field: "Mother's Name" },
  { key: 'passport.father_name', document: 'Passport', field: "Father's Name" },
  // ── Work Permit ──
  { key: 'work_permit.employer', document: 'Work Permit', field: 'Employer' },
  { key: 'work_permit.pa_number', document: 'Work Permit', field: 'PA Number' },
  { key: 'work_permit.civil_id', document: 'Work Permit', field: 'Civil ID' },
  { key: 'work_permit.occupation_code', document: 'Work Permit', field: 'Occupation Code' },
  { key: 'work_permit.occupation_desc', document: 'Work Permit', field: 'Occupation Description' },
  { key: 'work_permit.wfpa_number', document: 'Work Permit', field: 'WFPA Number' },
  { key: 'work_permit.sponsor_phone', document: 'Work Permit', field: 'Sponsor Phone' },
  { key: 'work_permit.sponsor_mobile', document: 'Work Permit', field: 'Sponsor Mobile' },
  { key: 'work_permit.sponsor_address', document: 'Work Permit', field: 'Sponsor Address' },
  { key: 'work_permit.expiry_date', document: 'Work Permit', field: 'Permit Expiry' },
  { key: 'work_permit.sponsor_type', document: 'Work Permit', field: 'Sponsor Type' },
  { key: 'work_permit.relationship', document: 'Work Permit', field: 'Relationship' },
  { key: 'work_permit.salary', document: 'Work Permit', field: 'Salary' },
  // ── Applicant ──
  { key: 'applicant.religion', document: 'Applicant', field: 'Religion' },
  { key: 'applicant.marital_status', document: 'Applicant', field: 'Marital Status' },
  { key: 'applicant.education', document: 'Applicant', field: 'Education Level' },
  { key: 'applicant.email', document: 'Applicant', field: 'Email' },
  { key: 'applicant.phone', document: 'Applicant', field: 'Phone' },
  { key: 'applicant.mobile', document: 'Applicant', field: 'Mobile' },
  // ── Application ──
  { key: 'application.purpose', document: 'Application', field: 'Purpose of Visit' },
  { key: 'application.arrival_date', document: 'Application', field: 'Arrival Date' },
  { key: 'application.duration', document: 'Application', field: 'Duration of Stay' },
  { key: 'application.visa_type', document: 'Application', field: 'Visa Type' },
  { key: 'application.prev_visa', document: 'Application', field: 'Previous Visa Number' },
  // ── Submitter ──
  { key: 'submitter.name', document: 'Submitter', field: 'Submitter Name' },
  { key: 'submitter.civil_id', document: 'Submitter', field: 'Submitter ID' },
  { key: 'submitter.phone', document: 'Submitter', field: 'Submitter Phone' },
];

interface Props {
  currentLabel: string;
  onSelect: (key: string, label: string) => void;
  onClose: () => void;
}

export default function ChangeSourceModal({ currentLabel, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [teachEquiv, setTeachEquiv] = useState(true);

  const filtered = SOURCE_FIELDS.filter(s =>
    s.field.toLowerCase().includes(query.toLowerCase()) ||
    s.document.toLowerCase().includes(query.toLowerCase()) ||
    s.key.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="source-modal-overlay" onClick={onClose}>
      <div className="source-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Outfit', 'Inter', sans-serif", margin: 0 }}>
            Change Source
          </h3>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ position: 'relative' }}>
            <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="clean-input"
              placeholder="Search document fields..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
          {filtered.map(s => (
            <button
              key={s.key}
              className="source-item"
              onClick={() => onSelect(s.key, `${s.document} → ${s.field}`)}
              style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {s.document} → {s.field}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>{s.key}</div>
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No matching fields found
            </div>
          )}
        </div>

        {/* Teach equivalence */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <input
            type="checkbox"
            checked={teachEquiv}
            onChange={e => setTeachEquiv(e.target.checked)}
            style={{ marginTop: '3px', accentColor: 'var(--accent)' }}
          />
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Teach equivalence: &ldquo;{currentLabel}&rdquo; on this portal = selected field on documents
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>
              (apply this learning to future portals)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
