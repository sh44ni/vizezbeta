'use client';

import React, { useState } from 'react';
import { X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EarlyAccessRequest({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/early-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit request');
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setCompany('');
    setMessage('');
    setError('');
    setSubmitted(false);
    setLoading(false);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '440px',
          margin: '0 20px',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px 36px 36px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.70)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.40)';
          }}
        >
          <X size={16} />
        </button>

        {submitted ? (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(74,222,128,0.10)',
                border: '1px solid rgba(74,222,128,0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle size={28} style={{ color: '#4ade80' }} />
            </div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 8px',
                fontFamily: "'Outfit', 'Inter', sans-serif",
              }}
            >
              Request Submitted!
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.50)',
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}
            >
              We&apos;ll notify you when approved. Keep an eye on your inbox.
            </p>
            <button
              onClick={handleClose}
              style={{
                padding: '10px 28px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#111111',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#111111'; }}
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <>
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 6px',
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                }}
              >
                Request Early Access
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                Fill out the form below and we&apos;ll get back to you shortly.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="ea-name" style={labelStyle}>
                  Name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  id="ea-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7c5cfc';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="ea-email" style={labelStyle}>
                  Email <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  id="ea-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7c5cfc';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Company */}
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="ea-company" style={labelStyle}>
                  Company <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>optional</span>
                </label>
                <input
                  id="ea-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company name"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7c5cfc';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="ea-message" style={labelStyle}>
                  Why do you want access? <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>optional</span>
                </label>
                <textarea
                  id="ea-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your use case..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '72px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7c5cfc';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Request Access
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
