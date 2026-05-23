// ── Portal Mapping Types ──

export type PortalStatus = 'active' | 'needs_remap' | 'needs_scan' | 'in_progress';

export type PortalType = 'visa' | 'web_form' | 'multi_visa';

export interface Portal {
  id: string;
  name: string;
  url_pattern: string;
  last_mapped: string;
  field_count: number;
  manual_count: number;
  status: PortalStatus;
  portal_type: PortalType;
  document_config: Array<{ type: string; required: boolean }>;
}

export type FieldType = 'text' | 'dropdown' | 'date' | 'checkbox' | 'radio' | 'textarea' | 'file';

export interface PortalField {
  portal_field: string;
  label: string;
  type: FieldType;
  required: boolean;
  source: string | null;
  source_label: string;
  value: string;
  mapped_option_value?: string;
  confidence: number;
  warnings: string[];
}

export type FieldReviewStatus = 'approved' | 'manual' | 'edited' | 'pending';

export interface ReviewedField extends PortalField {
  review_status: FieldReviewStatus;
  manual_value?: string;
  edited_source?: string;
  edited_source_label?: string;
}

export interface UploadedDocument {
  filename: string;
  type: string;
  verified: boolean;
  verification_label: string;
}

export interface ExtractedPreview {
  passport: Record<string, string>;
  work_permit: Record<string, string>;
}

export interface SourceField {
  key: string;
  document: string;
  field: string;
  value: string;
}

export interface DetectedPortalInfo {
  url: string;
  name: string;
  form_type: string;
  total_fields: number;
  required_fields: number;
  language: string;
  captcha_warning: string;
}

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;
