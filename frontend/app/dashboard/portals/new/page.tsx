'use client';

import React, { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import WizardStepper from './WizardStepper';
import Step0PortalType from './Step0PortalType';
import Step1Connect from './Step1Connect';
import Step2Detected from './Step2Detected';
import Step3Upload from './Step3Upload';
import Step4Review from './Step4Review';
import Step5Complete from './Step5Complete';
import type { WizardStep } from '../portal-types';
import type { PortalType } from '../portal-types';

interface ScanResult {
  url: string;
  title: string;
  total_fields: number;
  required_fields: number;
  language: string;
  fields: any[];
}

interface ExtractedData {
  passportData: Record<string, any>;
  workPermitData: Record<string, any> | null;
  _mrzQuality?: string;
  _validation?: string[];
}

export default function NewPortalPage() {
  const [step, setStep] = useState<WizardStep>(0);
  const [portalType, setPortalType] = useState<PortalType | null>(null);
  const [portalName, setPortalName] = useState('');
  const [urlPattern, setUrlPattern] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [documentConfig, setDocumentConfig] = useState<Array<{type: string; required: boolean}>>([]);
  const [savedPortalId, setSavedPortalId] = useState('');
  const [savedFieldCount, setSavedFieldCount] = useState(0);

  // Whether we have real scanned fields (extension mode) or just a URL (URL mode)
  const hasScannedFields = (scanResult?.fields?.length ?? 0) > 0;

  const next = useCallback(() => setStep(s => Math.min(s + 1, 5) as WizardStep), []);
  const back = useCallback(() => setStep(s => Math.max(s - 1, 0) as WizardStep), []);

  // Step 0 handler — portal type selected
  const handleTypeSelect = useCallback((type: PortalType) => {
    setPortalType(type);
    setStep(1);
  }, []);

  // URL mode: Step 3 → skip Step 4 → go to Step 5
  // Extension mode: Step 3 → Step 4 (review) → Step 5
  const handleStep3Next = useCallback(async () => {
    if (hasScannedFields) {
      // Extension mode — go to field review
      setStep(4);
    } else {
      // URL mode — save portal without field mappings, go to complete
      await savePortal([]);
      setStep(5);
    }
  }, [hasScannedFields]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save portal to backend
  const savePortal = useCallback(async (fields: any[]) => {
    const id = (portalName || 'portal')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);

    try {
      const resp = await apiFetch('/api/portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: portalName,
          url_pattern: urlPattern,
          portal_type: portalType || 'visa',
          document_config: documentConfig,
          status: fields.length > 0 ? 'active' : 'needs_scan',
          fields,
        }),
      });
      const data = await resp.json();
      setSavedPortalId(data.id || id);
      setSavedFieldCount(data.field_count || fields.length);
    } catch (err) {
      console.error('Failed to save portal:', err);
      setSavedPortalId(id);
      setSavedFieldCount(fields.length);
    }
  }, [portalName, urlPattern, portalType, documentConfig]);

  // Called when field review is complete (extension mode)
  const handleFieldsReviewed = useCallback(async (fields: any[]) => {
    await savePortal(fields);
  }, [savePortal]);

  return (
    <>
      <WizardStepper currentStep={step} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px 64px' }}>
          {step === 0 && (
            <Step0PortalType onSelect={handleTypeSelect} />
          )}
          {step === 1 && (
            <Step1Connect
              onNext={next}
              onScanResult={setScanResult}
            />
          )}
          {step === 2 && (
            <Step2Detected
              onNext={next}
              onBack={back}
              portalName={portalName}
              setPortalName={setPortalName}
              urlPattern={urlPattern}
              setUrlPattern={setUrlPattern}
              scanResult={scanResult}
              portalType={portalType}
            />
          )}
          {step === 3 && (
            <Step3Upload
              onNext={handleStep3Next}
              onBack={back}
              onExtractedData={setExtractedData}
              onDocumentConfig={setDocumentConfig}
              extractedData={extractedData}
              portalType={portalType}
            />
          )}
          {step === 4 && (
            <Step4Review
              onNext={next}
              onBack={back}
              scannedFields={scanResult?.fields || []}
              onFieldsReviewed={handleFieldsReviewed}
            />
          )}
          {step === 5 && (
            <Step5Complete
              portalName={portalName || 'New Portal'}
              portalId={savedPortalId}
              fieldCount={savedFieldCount}
              isUrlMode={!hasScannedFields}
            />
          )}
        </div>
      </main>
    </>
  );
}
