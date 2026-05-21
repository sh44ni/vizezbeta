'use client';

import React, { useState, useCallback } from 'react';
import WizardStepper from './WizardStepper';
import Step1Connect from './Step1Connect';
import Step2Detected from './Step2Detected';
import Step3Upload from './Step3Upload';
import Step4Review from './Step4Review';
import Step5Complete from './Step5Complete';
import type { WizardStep } from '../portal-types';

/* ── Scan result shape from extension ── */
export interface ScanField {
  selector: string;
  label: string;
  type: string;
  required: boolean;
  name: string;
  id: string;
  placeholder: string;
  value: string;
  options: string[];
  sort_order: number;
}

export interface ScanResult {
  url: string;
  title: string;
  total_fields: number;
  required_fields: number;
  language: string;
  fields: ScanField[];
}

/* ── Extracted document data from /api/extract-manual ── */
export type ExtractedData = Record<string, Record<string, string>>;

/* ── Reviewed / mapped field ── */
export interface MappedField {
  portal_selector: string;
  portal_label: string;
  field_type: string;
  source_key: string | null;
  fill_method: 'value';
  required: boolean;
  sort_order: number;
  review_status: 'approved';
  confidence: number;
}

/* ── Portal type detection ── */
const VISA_TYPE_KEYWORDS = [
  'visa type',
  'application type',
  'service type',
  'category',
  'permit type',
  'visa category',
];

function detectPortalType(fields: ScanField[]): {
  portalType: 'single' | 'multi';
  triggerFields: ScanField[];
} {
  const triggerFields: ScanField[] = [];

  fields.forEach((field) => {
    if (field.type !== 'select') return;

    const label = (field.label || field.name || field.id || '').toLowerCase();

    // Check if label contains visa-type keywords
    const hasKeyword = VISA_TYPE_KEYWORDS.some((kw) => label.includes(kw));

    // Check if it has many options that look like visa categories
    const hasManyOptions = field.options && field.options.length > 3;

    if (hasKeyword || (hasManyOptions && label)) {
      // For many-option selects without keywords, do a secondary check:
      // the options should contain words that sound like visa categories
      if (!hasKeyword && hasManyOptions) {
        const visaCategoryWords = [
          'visa', 'permit', 'residence', 'transit', 'tourist', 'work',
          'employment', 'family', 'visit', 'entry', 'renewal', 'new',
        ];
        const optionsText = field.options.join(' ').toLowerCase();
        const matchCount = visaCategoryWords.filter((w) => optionsText.includes(w)).length;
        if (matchCount >= 2) {
          triggerFields.push(field);
        }
      } else if (hasKeyword) {
        triggerFields.push(field);
      }
    }
  });

  return {
    portalType: triggerFields.length > 0 ? 'multi' : 'single',
    triggerFields,
  };
}

export default function NewPortalPage() {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 → 2: scan result from extension
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Portal type detection
  const [portalType, setPortalType] = useState<'single' | 'multi' | null>(null);
  const [triggerFields, setTriggerFields] = useState<ScanField[]>([]);

  // Step 2: editable portal metadata
  const [portalName, setPortalName] = useState('');
  const [urlPattern, setUrlPattern] = useState('');

  // Step 3: extracted document data (dynamic shape)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // Step 4: reviewed field mappings
  const [mappedFields, setMappedFields] = useState<MappedField[]>([]);

  // Step 5: saved portal id
  const [savedPortalId, setSavedPortalId] = useState<string | null>(null);

  // Document types configured during Step 3
  const [documentConfig, setDocumentConfig] = useState<string[]>([]);

  const goTo = useCallback((s: WizardStep) => setStep(s), []);
  const next = useCallback(() => setStep(s => Math.min(s + 1, 5) as WizardStep), []);
  const back = useCallback(() => setStep(s => Math.max(s - 1, 1) as WizardStep), []);

  const handleScanComplete = useCallback((result: ScanResult) => {
    setScanResult(result);

    // Detect portal type
    const detection = detectPortalType(result.fields);
    setPortalType(detection.portalType);
    setTriggerFields(detection.triggerFields);

    // Auto-fill portal name from page title
    if (!portalName) setPortalName(result.title || '');
    // Auto-generate URL pattern from URL
    if (!urlPattern) {
      try {
        const u = new URL(result.url);
        setUrlPattern(`${u.hostname}/*`);
      } catch {
        setUrlPattern(result.url);
      }
    }
    setStep(2);
  }, [portalName, urlPattern]);

  const handleRescan = useCallback(() => {
    setScanResult(null);
    setPortalType(null);
    setTriggerFields([]);
    setStep(1);
  }, []);

  const handleExtractComplete = useCallback((data: ExtractedData) => {
    setExtractedData(data);
    // Track configured document types from what user uploaded
    setDocumentConfig(Object.keys(data));
    next();
  }, [next]);

  const handleMappingComplete = useCallback((fields: MappedField[]) => {
    setMappedFields(fields);
    next();
  }, [next]);

  const resetWizard = useCallback(() => {
    setStep(1);
    setScanResult(null);
    setPortalType(null);
    setTriggerFields([]);
    setPortalName('');
    setUrlPattern('');
    setExtractedData(null);
    setMappedFields([]);
    setSavedPortalId(null);
    setDocumentConfig([]);
  }, []);

  return (
    <>
      <WizardStepper currentStep={step} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px 64px' }}>
          {step === 1 && (
            <Step1Connect onScanComplete={handleScanComplete} />
          )}
          {step === 2 && scanResult && (
            <Step2Detected
              scanResult={scanResult}
              portalType={portalType || 'single'}
              triggerFields={triggerFields}
              portalName={portalName}
              setPortalName={setPortalName}
              urlPattern={urlPattern}
              setUrlPattern={setUrlPattern}
              onNext={next}
              onBack={handleRescan}
              onRescan={handleRescan}
            />
          )}
          {step === 3 && (
            <Step3Upload
              onExtractComplete={handleExtractComplete}
              onBack={back}
            />
          )}
          {step === 4 && scanResult && (
            <Step4Review
              scanFields={scanResult.fields}
              extractedData={extractedData}
              onComplete={handleMappingComplete}
              onBack={back}
            />
          )}
          {step === 5 && (
            <Step5Complete
              portalName={portalName}
              urlPattern={urlPattern}
              mappedFields={mappedFields}
              documentConfig={documentConfig}
              onSavedId={setSavedPortalId}
              savedPortalId={savedPortalId}
              onTrainAnother={resetWizard}
            />
          )}
        </div>
      </main>
    </>
  );
}
