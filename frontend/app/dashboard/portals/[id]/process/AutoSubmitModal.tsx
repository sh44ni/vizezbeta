'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch, apiPost } from '@/lib/api';
import { Loader, X, CheckCircle, AlertTriangle, Download, ChevronRight } from 'lucide-react';

interface AutoSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: any[];
  portalId: string;
}

export default function AutoSubmitModal({ isOpen, onClose, applicants, portalId }: AutoSubmitModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'init' | 'fetching' | 'captcha' | 'submitting' | 'success' | 'error'>('init');
  const [captchaBase64, setCaptchaBase64] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<{ webApplicationNumber?: string, referenceKey?: string, pdfBase64?: string } | null>(null);

  const currentApplicant = applicants[currentIndex];

  useEffect(() => {
    if (isOpen && status === 'init' && currentApplicant) {
      initSession();
    }
  }, [isOpen, status, currentApplicant]);

  const initSession = async () => {
    setStatus('fetching');
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/rop/auto-submit/init');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to initialize session');
      const data = await res.json();
      setSessionId(data.sessionId);
      setCaptchaBase64(data.captchaBase64);
      setStatus('captcha');
      setCaptchaAnswer('');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleConfirm = async () => {
    if (!captchaAnswer) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      // Prepare applicant data
      const data = currentApplicant.data || {};
      
      const applicantData = {
        txtPassportNo: data.passport_number || '',
        txtIssueDate: data.date_of_issue || '',
        txtPlaceOfIssue: data.place_of_issue || '',
        txtExpiryDate: data.date_of_expiry || '',
        ddlIssueCountry: data.issuing_state || '',
        ddlNationality: data.nationality || '',
        
        txtSurname: data.surname || '',
        txtFirstName: data.first_name || '',
        txtSecondName: data.second_name || '',
        txtThirdName: data.third_name || '',
        txtFourthName: data.fourth_name || '',
        txtMotherName: data.mother_name || '',
        ddlGender: data.sex === 'M' ? '1' : '2',
        txtDOB: data.date_of_birth || '',
        txtBirthCity: data.place_of_birth || '',
        ddlBirthCountry: data.nationality || '', // fallback
        txtEmailAddress: data.email || '',
        
        txtSponsorName: data.sponsor_name || '',
        txtSponsorOfficeNo: data.sponsor_office_no || '',
        txtSponsorId: data.sponsor_id || '',
        txtSponsorAddress: data.sponsor_address || '',
        txtSponsorMobileNo: data.sponsor_mobile || '',
        txtOccupationCode: data.occupation_code || '',
        txtOccupationDescription: data.occupation_description || '',
        txtClearanceNumber: data.clearance_number || '',
        
        txtSubmittedbyID: data.sponsor_id || '',
        txtSubmittedbyName: data.sponsor_name || '',
        txtSubmittedbyGSM: data.sponsor_mobile || '',
      };

      const res = await apiPost('/api/rop/auto-submit/confirm', {
        sessionId,
        captchaAnswer,
        applicantData
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit application');
      const resData = await res.json();
      setResult(resData);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleNext = () => {
    if (currentIndex < applicants.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setStatus('init');
      setResult(null);
    } else {
      onClose();
    }
  };

  const downloadPdf = () => {
    if (!result?.pdfBase64) return;
    const link = document.createElement('a');
    link.href = result.pdfBase64;
    link.download = `ROP_Visa_${result.webApplicationNumber || 'Application'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
    }}>
      <div className="animate-card-appear" style={{
        background: 'var(--surface-1)', borderRadius: 'var(--radius-xl)', width: '500px', maxWidth: '90vw',
        padding: '32px', position: 'relative', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
        }}>
          <X className="w-5 h-5" />
        </button>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', fontFamily: "'Outfit', sans-serif" }}>
            Auto Submit Mode
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Applicant {currentIndex + 1} of {applicants.length}: <strong style={{ color: 'var(--text-primary)' }}>{currentApplicant?.data?._name || 'Unknown'}</strong>
          </p>
        </div>

        {status === 'fetching' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader className="w-8 h-8 animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Fetching ROP Portal...</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Retrieving session and CAPTCHA</div>
          </div>
        )}

        {status === 'captcha' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Please enter the CAPTCHA</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={captchaBase64} alt="CAPTCHA" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', margin: '0 auto' }} />
            </div>
            <input
              type="text"
              value={captchaAnswer}
              onChange={e => setCaptchaAnswer(e.target.value)}
              placeholder="Enter code here"
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: '16px', textAlign: 'center', marginBottom: '24px'
              }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
            <button className="btn-friendly" onClick={handleConfirm} disabled={!captchaAnswer} style={{ width: '100%', padding: '14px' }}>
              Confirm & Submit
            </button>
          </div>
        )}

        {status === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Loader className="w-8 h-8 animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Submitting to ROP Portal...</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This may take a moment. Do not close this window.</div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle className="w-12 h-12" style={{ margin: '0 auto 16px', color: 'var(--success)' }} />
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Submission Successful!</div>
            
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Web Application Number</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{result?.webApplicationNumber || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reference Key</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{result?.referenceKey || 'N/A'}</div>
              </div>
            </div>

            {result?.pdfBase64 ? (
              <button className="btn-ghost" onClick={downloadPdf} style={{ width: '100%', padding: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Download className="w-4 h-4" /> Download Application PDF
              </button>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: '16px' }}>
                ⚠️ Application succeeded, but PDF could not be downloaded automatically. Please note the keys above.
              </div>
            )}

            <button className="btn-friendly" onClick={handleNext} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {currentIndex < applicants.length - 1 ? 'Next Applicant' : 'Finish'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <AlertTriangle className="w-12 h-12" style={{ margin: '0 auto 16px', color: 'var(--error)' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--error)' }}>Submission Failed</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', padding: '12px', background: 'var(--error-bg)', borderRadius: 'var(--radius-md)' }}>
              {errorMsg}
            </div>
            <button className="btn-friendly" onClick={initSession} style={{ width: '100%', padding: '14px', marginBottom: '12px' }}>
              Retry
            </button>
            <button className="btn-ghost" onClick={handleNext} style={{ width: '100%', padding: '14px' }}>
              Skip to Next Applicant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
