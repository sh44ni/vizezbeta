import type {
  Portal,
  PortalField,
  UploadedDocument,
  ExtractedPreview,
  SourceField,
  DetectedPortalInfo,
} from './portal-types';

export const mockPortals: Portal[] = [
  { id: 'rop-oman-new-visa', name: 'ROP Oman — New Visa Application', url_pattern: 'evisa.rop.gov.om/*', last_mapped: '2026-05-03', field_count: 47, manual_count: 5, status: 'active' },
  { id: 'ica-uae-visit', name: 'ICA UAE — Visit Visa', url_pattern: 'smartservices.ica.gov.ae/*', last_mapped: '2026-04-28', field_count: 32, manual_count: 3, status: 'needs_remap' },
  { id: 'absher-saudi-employment', name: 'Absher Saudi — Employment Visa', url_pattern: 'absher.sa/*', last_mapped: '2026-04-15', field_count: 54, manual_count: 8, status: 'active' },
];

export const mockDetectedPortal: DetectedPortalInfo = {
  url: 'https://evisa.rop.gov.om/visa/apply',
  name: 'Royal Oman Police — New Visa Application',
  form_type: 'Multi-step wizard (5 steps detected)',
  total_fields: 47,
  required_fields: 28,
  language: 'English',
  captcha_warning: 'CAPTCHA detected on final step — will require manual entry',
};

export const mockDocuments: UploadedDocument[] = [
  { filename: 'passport_sundash_tamang.jpg', type: 'Nepali Passport', verified: true, verification_label: 'MRZ Verified' },
  { filename: 'work_permit_alhassan_llc.pdf', type: 'Oman Work Permit', verified: true, verification_label: 'Verified' },
];

export const mockExtractedPreview: ExtractedPreview = {
  passport: { 'Full Name': 'SUNDASH TAMANG', 'Passport Number': 'PA0685869', 'Nationality': 'NEPAL', 'Date of Birth': '07/03/1994', 'Sex': 'M', 'Place of Birth': 'KATHMANDU' },
  work_permit: { 'Employer': 'AL HASSAN LLC', 'PA Number': 'AB/12345', 'Occupation Code': '5120', 'Sponsor ID': '12345678' },
};

export const mockSourceFields: SourceField[] = [
  { key: 'passport.full_name', document: 'Passport', field: 'Full Name', value: 'SUNDASH TAMANG' },
  { key: 'passport.surname', document: 'Passport', field: 'Surname', value: 'TAMANG' },
  { key: 'passport.given_names', document: 'Passport', field: 'Given Names', value: 'SUNDASH' },
  { key: 'passport.number', document: 'Passport', field: 'Passport Number', value: 'PA0685869' },
  { key: 'passport.nationality', document: 'Passport', field: 'Nationality', value: 'NEPAL' },
  { key: 'passport.date_of_birth', document: 'Passport', field: 'Date of Birth', value: '07/03/1994' },
  { key: 'passport.sex', document: 'Passport', field: 'Sex', value: 'M' },
  { key: 'passport.place_of_birth', document: 'Passport', field: 'Place of Birth', value: 'KATHMANDU' },
  { key: 'passport.issue_date', document: 'Passport', field: 'Issue Date', value: '15/06/2020' },
  { key: 'passport.expiry_date', document: 'Passport', field: 'Expiry Date', value: '14/06/2030' },
  { key: 'passport.issuing_authority', document: 'Passport', field: 'Issuing Authority', value: 'DEPT OF IMMIGRATION' },
  { key: 'work_permit.employer', document: 'Work Permit', field: 'Employer', value: 'AL HASSAN LLC' },
  { key: 'work_permit.pa_number', document: 'Work Permit', field: 'PA Number', value: 'AB/12345' },
  { key: 'work_permit.occupation_code', document: 'Work Permit', field: 'Occupation Code', value: '5120' },
  { key: 'work_permit.occupation_desc', document: 'Work Permit', field: 'Occupation Description', value: 'CONSTRUCTION WORKER' },
  { key: 'work_permit.sponsor_id', document: 'Work Permit', field: 'Sponsor ID', value: '12345678' },
  { key: 'work_permit.wfpa_number', document: 'Work Permit', field: 'WFPA Number', value: 'WFPA/2026/001234' },
  { key: 'work_permit.expiry_date', document: 'Work Permit', field: 'Permit Expiry', value: '31/12/2027' },
  { key: 'work_permit.sponsor_phone', document: 'Work Permit', field: 'Sponsor Phone', value: '+968 2412 3456' },
  { key: 'work_permit.sponsor_mobile', document: 'Work Permit', field: 'Sponsor Mobile', value: '+968 9876 5432' },
  { key: 'work_permit.sponsor_address', document: 'Work Permit', field: 'Sponsor Address', value: 'P.O. Box 123, Muscat, Oman' },
];
