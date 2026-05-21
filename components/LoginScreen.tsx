'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, ArrowRight, AlertCircle, Loader2, CheckCircle, KeyRound, ArrowLeft } from 'lucide-react';
import EarlyAccessRequest from '@/components/EarlyAccessRequest';

export default function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();

  // Step: 'email' or 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'email') {
      emailRef.current?.focus();
    } else {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      triggerShake();
      return;
    }

    setLoading(true);
    const result = await requestOtp(email.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to send access code');
      triggerShake();
      return;
    }

    setSuccess('Access code sent to your email');
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => {
      setStep('otp');
      setSuccess('');
    }, 800);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    setSuccess('');
    setLoading(true);
    const result = await requestOtp(email.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to resend code');
      triggerShake();
      return;
    }

    setSuccess('New code sent to your email');
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
    otpRefs.current[0]?.focus();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleVerify = useCallback(async (code: string) => {
    setError('');
    setLoading(true);
    const result = await verifyOtp(email.trim(), code);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid code. Please try again.');
      triggerShake();
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
    // If success, the AuthContext will update and redirect
  }, [email, verifyOtp]);

  const handleOtpChange = (index: number, value: string) => {
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();

      // Auto-submit if all filled
      if (newOtp.every((d) => d !== '')) {
        handleVerify(newOtp.join(''));
      }
      return;
    }

    // Single digit
    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all filled
    if (newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      pasted.split('').forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const focusIdx = Math.min(pasted.length, 5);
      otpRefs.current[focusIdx]?.focus();

      if (newOtp.every((d) => d !== '')) {
        handleVerify(newOtp.join(''));
      }
    }
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#111111',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const otpBoxStyle: React.CSSProperties = {
    width: '48px',
    height: '56px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#111111',
    color: '#ffffff',
    fontSize: '24px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontWeight: 700,
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    caretColor: '#7c5cfc',
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Subtle top glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '300px',
          background: 'radial-gradient(ellipse at top, rgba(124,92,252,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Bottom glow */}
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '250px',
          background: 'radial-gradient(ellipse at bottom, rgba(124,92,252,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div
          className={`animate-slide-up ${shaking ? 'login-shake' : ''}`}
          style={{
            width: '100%',
            maxWidth: '400px',
            margin: '0 20px',
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '40px 36px 36px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Logo + brand */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo_logo for darkBG.svg"
                alt="VizEz"
                style={{ height: '28px', width: 'auto' }}
              />
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: '99px',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.45)',
              }}>
                Open Beta
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              AI Portal Mapping &amp; Auto-Fill Platform
            </p>
          </div>

          {step === 'email' ? (
            /* Step 1: Email */
            <form onSubmit={handleSendOtp}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@company.com"
                    style={{ ...inputBase, paddingLeft: '40px' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#7c5cfc';
                      e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '13px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.25)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Success */}
              {success && (
                <div
                  className="animate-slide-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(74,222,128,0.08)',
                    border: '1px solid rgba(74,222,128,0.20)',
                    color: '#4ade80',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle size={15} style={{ flexShrink: 0 }} />
                  {success}
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="animate-slide-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.20)',
                    color: '#f87171',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: loading ? '#1a1a1a' : '#7c5cfc',
                  color: loading ? 'rgba(255,255,255,0.35)' : '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = '#9b85ff';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = '#7c5cfc';
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail size={15} />
                    Send Access Code
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: OTP Verification */
            <div>
              {/* Back button */}
              <button
                onClick={() => {
                  setStep('email');
                  setError('');
                  setSuccess('');
                  setOtp(['', '', '', '', '', '']);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.40)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '0',
                  marginBottom: '20px',
                  transition: 'color 0.15s ease',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
              >
                <ArrowLeft size={14} />
                Change email
              </button>

              <div style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(124,92,252,0.10)',
                      border: '1px solid rgba(124,92,252,0.20)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <KeyRound size={16} style={{ color: '#7c5cfc' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>
                      Enter access code
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: '0 0 20px' }}>
                  We sent a 6-digit code to{' '}
                  <span style={{ color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>{email}</span>
                </p>
              </div>

              {/* OTP Boxes */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    style={{
                      ...otpBoxStyle,
                      borderColor: digit ? 'rgba(124,92,252,0.40)' : 'rgba(255,255,255,0.08)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#7c5cfc';
                      e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = digit ? 'rgba(124,92,252,0.40)' : 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {/* Success */}
              {success && (
                <div
                  className="animate-slide-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(74,222,128,0.08)',
                    border: '1px solid rgba(74,222,128,0.20)',
                    color: '#4ade80',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle size={15} style={{ flexShrink: 0 }} />
                  {success}
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="animate-slide-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.20)',
                    color: '#f87171',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Verify button */}
              <button
                onClick={() => {
                  const code = otp.join('');
                  if (code.length < 6) {
                    setError('Please enter the full 6-digit code');
                    triggerShake();
                    return;
                  }
                  handleVerify(code);
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: loading ? '#1a1a1a' : '#7c5cfc',
                  color: loading ? 'rgba(255,255,255,0.35)' : '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  marginBottom: '14px',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = '#9b85ff';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = '#7c5cfc';
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    Verify
                  </>
                )}
              </button>

              {/* Resend */}
              <div style={{ textAlign: 'center' }}>
                {countdown > 0 ? (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)' }}>
                    Resend code in{' '}
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {countdown}s
                    </span>
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7c5cfc',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: 0,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#9b85ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#7c5cfc'; }}
                  >
                    Resend access code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)' }}>
              Don&apos;t have access?
            </span>
            <button
              onClick={() => setEarlyAccessOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7c5cfc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#9b85ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7c5cfc'; }}
            >
              Request Early Access
            </button>
          </div>
        </div>
      </div>

      <EarlyAccessRequest
        isOpen={earlyAccessOpen}
        onClose={() => setEarlyAccessOpen(false)}
      />
    </>
  );
}
