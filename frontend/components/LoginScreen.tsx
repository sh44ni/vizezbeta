'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in both fields to continue');
      triggerShake();
      return;
    }

    setLoading(true);
    const ok = await login(username.trim(), password);
    if (!ok) {
      setError("Incorrect username or password.");
      setLoading(false);
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
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

  return (
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
              Beta
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            AI Portal Mapping &amp; Auto-Fill Platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: '14px' }}>
            <label
              htmlFor="login-username"
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
              Username
            </label>
            <input
              id="login-username"
              ref={userRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter username"
              style={inputBase}
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

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="login-password"
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
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                style={{ ...inputBase, paddingRight: '44px' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#7c5cfc';
                  e.currentTarget.style.boxShadow = '0 0 0 1px #7c5cfc';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)', margin: '20px 0 0', textAlign: 'center' }}>
          Need access? Contact your admin.
        </p>
      </div>
    </div>
  );
}
