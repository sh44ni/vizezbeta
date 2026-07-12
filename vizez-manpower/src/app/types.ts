export interface ExtractedData {
  full_name: string;
  passport_number: string;
  nationality: string;
  date_of_birth: string;
  expiry_date: string;
}

export interface PassportItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'extracting' | 'extracted' | 'error';
  progress: number;
  extractedData?: ExtractedData;
  errorMsg?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

// ── Manual Visa Module Types ──

export interface ManualPassportData {
  surname: string;
  first_name: string;
  second_name: string;
  third_name: string;
  passport_number: string;
  issue_date: string;       // DD/MM/YYYY
  place_of_issue: string;
  expiry_date: string;      // DD/MM/YYYY
  passport_country: string;
  nationality: string;
  date_of_birth: string;    // DD/MM/YYYY
  city_of_birth: string;
  country_of_birth: string;
  gender: string;           // M or F
}

export interface ManualWorkPermitData {
  // Employer / Sponsor fields
  sponsor_name: string;          // Employer Name (txtSponsorName)
  civil_id: string;              // Civil Number – 9 digits (txtSponsorId)
  phone_number: string;          // Phone / Office Number (txtSponsorOfficeNo)
  mobile_number: string;         // Mobile Number (txtSponsorMobileNo)
  address: string;               // Address if visible (txtSponsorAddress)
  relationship: string;          // Relationship to Applicant (txtSponsorRelationship)

  // Occupation fields
  occupation_code: string;       // Occupation Code (txtOccupationCode)
  occupation_description: string;// Occupation Description (txtOccupationDescription)
  pa_number: string;             // PA Number from permit header (txtClearanceNumber)

  // Permit metadata
  wfpa_number: string;           // WFPA Number
  expiry_date: string;           // Permit Expiry Date DD/MM/YYYY
}

export interface ManualVisaItem {
  id: string;
  passportFile: File | null;
  workPermitFile: File | null;
  photoFile: File | null;
  passportPreviewUrl: string;
  workPermitPreviewUrl: string;
  photoPreviewUrl: string;
  status: 'pending' | 'extracting' | 'extracted' | 'error';
  /** Current pipeline stage for live UI feedback */
  extractionStage?: 'enhancing' | 'uploading' | 'reading' | 'validating' | 'done';
  progress: number;
  passportData?: ManualPassportData;
  workPermitData?: ManualWorkPermitData;
  errorMsg?: string;
  // Base64 data URLs for document preview in extension
  passportImageDataUrl?: string;
  workPermitImageDataUrl?: string;
  photoImageDataUrl?: string;
  // Validation warnings from server-side cross-checks
  validationWarnings?: string[];
  // Field verification status from MRZ checksum validation
  fieldVerification?: Record<string, 'MRZ_VERIFIED' | 'MRZ_PARTIAL' | 'LLM_HIGH' | 'LLM_MEDIUM' | 'LLM_LOW' | 'COMPUTED' | 'UNVERIFIED'>;
  // Overall MRZ quality grade
  mrzQuality?: 'VERIFIED' | 'PARTIAL' | 'FAILED' | 'UNREADABLE';
  // Enhanced passport image from the processor
  enhancedImageUrl?: string;
  // Preview-only enhanced image (before extraction)
  enhancePreviewUrl?: string;
  // Enhancement metrics from preview step
  enhancePreviewMetrics?: Record<string, unknown> | null;
}
