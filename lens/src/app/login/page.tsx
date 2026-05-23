'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_key: secret }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error — please try again');
      setLoading(false);
    }
  }

  return (
    <div className="lens-login-page">
      {/* Animated grid background */}
      <div className="lens-login-grid" />

      <motion.form
        className="lens-login-card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo & Branding */}
        <div className="lens-login-logo">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#00e5c8"
              strokeWidth="2"
              opacity="0.3"
            />
            <circle
              cx="32"
              cy="32"
              r="20"
              stroke="#00e5c8"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <circle cx="32" cy="32" r="12" stroke="#00e5c8" strokeWidth="3" />
            <circle cx="32" cy="32" r="5" fill="#00e5c8" />
            {/* Aperture blades */}
            <line x1="32" y1="4" x2="32" y2="12" stroke="#00e5c8" strokeWidth="1.5" opacity="0.4" />
            <line x1="32" y1="52" x2="32" y2="60" stroke="#00e5c8" strokeWidth="1.5" opacity="0.4" />
            <line x1="4" y1="32" x2="12" y2="32" stroke="#00e5c8" strokeWidth="1.5" opacity="0.4" />
            <line x1="52" y1="32" x2="60" y2="32" stroke="#00e5c8" strokeWidth="1.5" opacity="0.4" />
            <line x1="11.2" y1="11.2" x2="16.9" y2="16.9" stroke="#00e5c8" strokeWidth="1.5" opacity="0.3" />
            <line x1="47.1" y1="47.1" x2="52.8" y2="52.8" stroke="#00e5c8" strokeWidth="1.5" opacity="0.3" />
            <line x1="52.8" y1="11.2" x2="47.1" y2="16.9" stroke="#00e5c8" strokeWidth="1.5" opacity="0.3" />
            <line x1="16.9" y1="47.1" x2="11.2" y2="52.8" stroke="#00e5c8" strokeWidth="1.5" opacity="0.3" />
          </svg>
          <h1 className="lens-login-title">VizEz Lens</h1>
          <p className="lens-login-subtitle">Document Intelligence Dashboard</p>
        </div>

        {/* Access Key Field */}
        <div className="lens-login-field">
          <label htmlFor="login-access-key" className="lens-login-label">
            Access Key
          </label>
          <input
            id="login-access-key"
            className="lens-login-input"
            type="password"
            placeholder="Enter your secret key…"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoFocus
            required
          />
        </div>

        {/* Submit */}
        <button
          id="login-submit-btn"
          className="lens-login-btn"
          type="submit"
          disabled={loading || !secret.trim()}
        >
          {loading ? 'Authenticating…' : 'Authenticate'}
        </button>

        {/* Error */}
        {error && (
          <motion.div
            className="lens-login-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}
      </motion.form>
    </div>
  );
}
