'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader,
  X,
  CheckCircle,
  AlertTriangle,
  Download,
  ChevronRight,
  Eye,
  User,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AutoSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: any[];
  portalId: string;
}

/* ── Map applicant data → form fields (same logic as before, extracted for reuse) ── */
function buildApplicantData(data: Record<string, any>) {
  return {
    txtPassportNo: data.passport_number || '',
    txtIssueDate: data.issue_date || data.date_of_issue || '',
    txtPlaceOfIssue: (() => {
      // Prefer the issuing country name over the raw city/place string
      const raw = data.passport_country || data.nationality || data.place_of_issue || '';
      // Strip commas, parentheses and anything after them, then take only the first word
      const firstWord = raw.replace(/[,()]/g, ' ').trim().split(/\s+/)[0] || '';
      return firstWord.substring(0, 20);
    })(),
    txtExpiryDate: data.expiry_date || data.date_of_expiry || '',
    ddlIssueCountry: data.issuing_state || '',
    ddlNationality: data.nationality || '',
    txtSurname: data.surname || '',
    txtFirstName: data.first_name || '',
    txtSecondName: data.second_name || '',
    txtThirdName: data.third_name || '',
    txtFourthName: data.fourth_name || '',
    txtMotherName: data.mother_name || 'MRS',
    ddlGender: data.gender === 'M' ? '1' : '2',
    txtDOB: data.date_of_birth || '',
    txtBirthCity: data.place_of_birth || data.nationality || 'UNKNOWN',
    ddlBirthCountry: data.nationality || '',
    txtEmailAddress: data.email || '',
    txtSponsorName: data.sponsor_name || '',
    txtSponsorOfficeNo: data.phone_number || data.mobile_number || '',
    txtSponsorId: data.civil_id || '',
    txtSponsorAddress: data.sponsor_address || data.address || '',
    txtSponsorMobileNo: data.mobile_number || '',
    txtOccupationCode: data.occupation_code || '',
    txtOccupationDescription: data.occupation_description || '',
    txtClearanceNumber: data['PA Number'] || data.pa_number || data.clearance_number || '',
    txtSubmittedbyID: data.civil_id || '',
    txtSubmittedbyName: data.sponsor_name || '',
    txtSubmittedbyGSM: data.mobile_number || '',
  };
}

/* ── Labels for the preview ── */
const PREVIEW_SECTIONS = [
  {
    label: 'Passport Details',
    icon: <User className="w-3.5 h-3.5" />,
    color: 'text-[var(--accent)]',
    fields: [
      ['Passport No.', 'txtPassportNo'],
      ['Surname', 'txtSurname'],
      ['First Name', 'txtFirstName'],
      ['Second Name', 'txtSecondName'],
      ['Third Name', 'txtThirdName'],
      ['Date of Birth', 'txtDOB'],
      ['Gender', 'ddlGender'],
      ['Nationality', 'ddlNationality'],
      ['Issue Date', 'txtIssueDate'],
      ['Expiry Date', 'txtExpiryDate'],
      ['Issue Country', 'ddlIssueCountry'],
      ['Place of Issue', 'txtPlaceOfIssue'],
      ['Birth City', 'txtBirthCity'],
    ] as [string, string][],
  },
  {
    label: 'Sponsor / Work Permit',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
    fields: [
      ['Sponsor Name', 'txtSponsorName'],
      ['Civil ID', 'txtSponsorId'],
      ['Office No.', 'txtSponsorOfficeNo'],
      ['Mobile No.', 'txtSponsorMobileNo'],
      ['Address', 'txtSponsorAddress'],
      ['Occupation Code', 'txtOccupationCode'],
      ['Occupation', 'txtOccupationDescription'],
      ['PA / Clearance No.', 'txtClearanceNumber'],
    ] as [string, string][],
  },
];

export default function AutoSubmitModal({
  isOpen,
  onClose,
  applicants,
  portalId,
}: AutoSubmitModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<
    'preview' | 'fetching' | 'captcha' | 'submitting' | 'success' | 'error'
  >('preview');
  const [captchaBase64, setCaptchaBase64] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<{
    webApplicationNumber?: string;
    referenceKey?: string;
    pdfBase64?: string;
  } | null>(null);

  const currentApplicant = applicants[currentIndex];

  /* Reset to preview on open or when applicant changes */
  useEffect(() => {
    if (isOpen) {
      setStatus('preview');
      setResult(null);
      setErrorMsg('');
      setCaptchaAnswer('');
    }
  }, [isOpen, currentIndex]);

  const initSession = async () => {
    setStatus('fetching');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/rop/auto-submit/init`);
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
      const data = currentApplicant.data || {};
      const applicantData = buildApplicantData(data);

      const res = await fetch(`/api/rop/auto-submit/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, captchaAnswer, applicantData }),
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
      setStatus('preview');
      setResult(null);
    } else {
      onClose();
    }
  };

  const downloadPdf = () => {
    if (!result?.pdfBase64) return;
    const link = document.createElement('a');
    link.href = result.pdfBase64;
    const applicantName = currentApplicant?.data?._name
      ? currentApplicant.data._name.replace(/\s+/g, '_')
      : 'APPLICANT';
    link.download = `${applicantName}_WP_APPLICATION.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPhotoPdf = async () => {
    const photoFile = currentApplicant?.data?._photoFile as File | null | undefined;
    const photoDataUrlStored = currentApplicant?.data?._photoDataUrl as string | undefined;
    const photoPreviewUrl = currentApplicant?.data?._photoPreviewUrl as string | undefined;

    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const fileToDataUrl = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

    let photoDataUrl: string | null = null;
    try {
      if (photoDataUrlStored && photoDataUrlStored.startsWith('data:')) {
        photoDataUrl = photoDataUrlStored;
      } else if (photoFile && photoFile instanceof File && photoFile.size > 0) {
        photoDataUrl = await fileToDataUrl(photoFile);
      } else if (photoPreviewUrl && photoPreviewUrl.startsWith('data:')) {
        photoDataUrl = photoPreviewUrl;
      } else if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        const img = await loadImage(photoPreviewUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      }
    } catch {
      photoDataUrl = null;
    }

    if (!photoDataUrl) {
      alert('Photo is no longer available. Please re-upload the photo and try again.');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'a4' });
    const width = 1.94;
    const height = 2.263;
    const startX = 0.5;
    const startY = 0.5;
    const gap = 0.05;
    pdf.addImage(photoDataUrl, 'JPEG', startX, startY, width, height);
    pdf.addImage(photoDataUrl, 'JPEG', startX, startY + height + gap, width, height);
    const applicantName = currentApplicant?.data?._name
      ? currentApplicant.data._name.replace(/\s+/g, '_')
      : 'APPLICANT';
    pdf.save(`${applicantName}_PHOTOS_READY.pdf`);
  };

  /* ── Pre-submit preview content ── */
  const renderPreview = () => {
    const data = currentApplicant?.data || {};
    const mapped = buildApplicantData(data);

    return (
      <motion.div
        key="preview"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        {/* Section hint */}
        <div className="flex items-center gap-2 bg-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-2xl px-4 py-2.5 mb-5">
          <Eye className="w-4 h-4 text-[var(--accent)]/70 flex-shrink-0" />
          <p className="text-[12px] text-white/50 leading-snug">
            <span className="text-[var(--accent)]/80 font-semibold">Review before submitting</span> — these values will be sent to ROP. Go back to edit any field.
          </p>
        </div>

        {/* Scrollable field preview */}
        <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-1 mb-5 custom-scroll">
          {PREVIEW_SECTIONS.map((section) => {
            const filled = section.fields.filter(([, k]) => mapped[k as keyof typeof mapped]);
            if (filled.length === 0) return null;
            return (
              <div
                key={section.label}
                className="bg-[rgba(255,255,255,0.02)] border border-white/[0.07] rounded-2xl overflow-hidden"
              >
                <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] text-[11px] uppercase tracking-wider font-bold ${section.color}`}>
                  {section.icon} {section.label}
                </div>
                <div className="px-4 py-2 grid grid-cols-2 gap-x-4">
                  {section.fields.map(([label, key]) => {
                    const val = mapped[key as keyof typeof mapped];
                    if (!val) return null;
                    return (
                      <div key={key} className="py-2 border-b border-white/[0.04] last:border-0">
                        <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-0.5">{label}</p>
                        <p className="text-[13px] text-white font-medium leading-snug truncate">{val}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={initSession}
          className="w-full py-4 rounded-2xl font-bold text-[15px] bg-[var(--accent)] text-white flex items-center justify-center gap-2 shadow-[var(--accent-glow)] hover:bg-[var(--accent-hover)] transition-colors"
        >
          Looks Good — Continue <ChevronRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md mx-auto bg-[#0d0e12] rounded-t-[32px] border-t border-x border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Drag handle */}
            <div className="w-full flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pb-8 pt-2">
              {/* Header */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-white font-['Outfit'] tracking-tight">
                    Auto Submit
                  </h2>
                  {/* Step pills */}
                  <div className="ml-auto flex items-center gap-1">
                    {(['preview', 'fetching', 'captcha', 'submitting', 'success'] as const).map((s, idx) => (
                      <div
                        key={s}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          status === s
                            ? 'bg-[var(--accent)] w-4'
                            : ['success', 'error'].includes(status) && idx < ['preview', 'fetching', 'captcha', 'submitting', 'success'].indexOf(status)
                            ? 'bg-white/30'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-white/50">
                  Applicant {currentIndex + 1} of {applicants.length}:{' '}
                  <strong className="text-white font-medium">
                    {currentApplicant?.data?._name || 'Unknown'}
                  </strong>
                </p>
              </div>

              {/* State machine */}
              <AnimatePresence mode="wait">
                {status === 'preview' && renderPreview()}

                {status === 'fetching' && (
                  <motion.div
                    key="fetching"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-10"
                  >
                    <div className="relative w-16 h-16 mx-auto mb-5">
                      <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="text-[15px] font-semibold text-white mb-1">Connecting to ROP...</div>
                    <div className="text-sm text-white/50">Retrieving secure session & captcha</div>
                  </motion.div>
                )}

                {status === 'captcha' && (
                  <motion.div
                    key="captcha"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="mb-5">
                      <div className="text-sm font-semibold text-white/70 mb-3 text-center uppercase tracking-widest">
                        Security Check
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={captchaBase64}
                        alt="CAPTCHA"
                        className="mx-auto rounded-xl border border-white/10 shadow-inner bg-white/5"
                      />
                    </div>
                    <input
                      type="text"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      placeholder="Enter the code above"
                      className="w-full p-4 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] text-white text-center text-lg font-medium mb-5 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-white/20"
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                      autoFocus
                    />
                    <motion.button
                      whileTap={captchaAnswer ? { scale: 0.97 } : {}}
                      onClick={handleConfirm}
                      disabled={!captchaAnswer}
                      className={`w-full py-4 rounded-2xl font-bold text-[15px] transition-all ${
                        captchaAnswer
                          ? 'bg-[var(--accent)] text-white shadow-[var(--accent-glow)]'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      Confirm & Submit
                    </motion.button>
                  </motion.div>
                )}

                {status === 'submitting' && (
                  <motion.div
                    key="submitting"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-10"
                  >
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[var(--accent)]/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <div className="absolute inset-3 border-4 border-emerald-400/20 border-b-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.7s' }} />
                    </div>
                    <div className="text-[15px] font-semibold text-white mb-1">Submitting Application...</div>
                    <div className="text-sm text-white/50">Processing with Royal Oman Police</div>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center pt-2"
                  >
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold text-white mb-5 font-['Outfit']">
                      Submission Successful!
                    </div>

                    <div className="bg-[rgba(255,255,255,0.03)] p-4 rounded-2xl text-left mb-5 border border-white/[0.07]">
                      <div className="mb-3">
                        <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Application No.</div>
                        <div className="text-base font-bold text-white tracking-tight">
                          {result?.webApplicationNumber || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Reference Key</div>
                        <div className="text-base font-bold text-white tracking-tight">
                          {result?.referenceKey || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mb-5">
                      {result?.pdfBase64 ? (
                        <button
                          onClick={downloadPdf}
                          className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> App PDF
                        </button>
                      ) : (
                        <div className="flex-1 py-3 text-xs text-amber-400 flex items-center justify-center bg-amber-400/10 rounded-xl border border-amber-400/20">
                          ⚠️ PDF unavailable
                        </div>
                      )}
                      {currentApplicant?.data?._photoFile && (
                        <button
                          onClick={downloadPhotoPdf}
                          className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Photos
                        </button>
                      )}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleNext}
                      className="w-full py-4 rounded-2xl font-bold text-[15px] bg-[var(--accent)] text-white flex items-center justify-center gap-2 shadow-[var(--accent-glow)] hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      {currentIndex < applicants.length - 1 ? 'Next Applicant' : 'Done'}{' '}
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center pt-2"
                  >
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <div className="text-xl font-bold text-white mb-4 font-['Outfit']">Submission Failed</div>
                    <div className="text-sm text-red-200 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-left leading-relaxed">
                      {errorMsg}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleNext}
                        className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-colors"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => setStatus('preview')}
                        className="flex-[2] py-4 rounded-2xl bg-[var(--accent)] text-white font-bold shadow-[var(--accent-glow)] hover:bg-[var(--accent-hover)] transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
