'use client';

import React, { useState } from 'react';
import { Shield, FileText, Layers, X, Mail, Loader, CheckCircle } from 'lucide-react';
import type { PortalType } from '../portal-types';

interface Props {
  onSelect: (type: PortalType) => void;
}

const TYPE_CARDS = [
  {
    type: 'visa' as PortalType,
    icon: Shield,
    iconColor: '#7c5cfc',
    iconBg: 'rgba(124, 92, 252, 0.1)',
    title: 'Visa Portal',
    emoji: '🛂',
    description: 'For government visa application portals that handle one visa type at a time.',
    examples: 'ROP Oman, ICA UAE, Absher Saudi',
    available: true,
  },
  {
    type: 'web_form' as PortalType,
    icon: FileText,
    iconColor: '#38bdf8',
    iconBg: 'rgba(56, 189, 248, 0.1)',
    title: 'General Web Form',
    emoji: '📋',
    description: 'For any other web form an agency uses — ticketing systems, insurance forms, employment applications, anything with fields to fill.',
    examples: 'Booking portals, HR systems, insurance forms',
    available: true,
  },
  {
    type: 'multi_visa' as PortalType,
    icon: Layers,
    iconColor: '#6e6a99',
    iconBg: 'rgba(110, 106, 153, 0.08)',
    title: 'Multi-Visa Portal',
    emoji: '🔄',
    description: 'For portals where multiple visa types share one form and switch fields dynamically.',
    examples: 'Coming in a future update',
    available: false,
  },
];

export default function Step0PortalType({ onSelect }: Props) {
  const [showNotify, setShowNotify] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const handleNotifySubmit = () => {
    if (!notifyEmail.trim()) return;
    // Client-side only for now — just show confirmation
    setNotifySubmitted(true);
    setTimeout(() => {
      setShowNotify(false);
      setNotifySubmitted(false);
      setNotifyEmail('');
    }, 2000);
  };

  return (
    <div className="animate-card-appear" style={{ textAlign: 'center', paddingTop: '40px' }}>
      {/* Header */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '24px',
        background: 'var(--accent-subtle)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <span style={{ fontSize: '36px' }}>🎯</span>
      </div>

      <h2 style={{
        fontSize: '26px', fontWeight: 800, margin: '0 0 12px',
        fontFamily: "'Outfit', 'Inter', sans-serif", color: 'var(--text-primary)',
      }}>
        What are you training?
      </h2>
      <p style={{
        fontSize: '15px', color: 'var(--text-muted)', maxWidth: '520px',
        margin: '0 auto 40px', lineHeight: 1.7,
      }}>
        Choose the type of portal you want VizEz to learn. This determines how fields are scanned and mapped.
      </p>

      {/* Type Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
        maxWidth: '780px', margin: '0 auto',
      }}>
        {TYPE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.type} style={{ display: 'flex', flexDirection: 'column' }}>
              <button
                onClick={() => card.available && onSelect(card.type)}
                disabled={!card.available}
                style={{
                  padding: '32px 20px 28px', borderRadius: 'var(--radius-xl)',
                  background: 'var(--card-bg)',
                  border: `2px solid ${card.available ? 'var(--border)' : 'var(--border)'}`,
                  cursor: card.available ? 'pointer' : 'not-allowed',
                  textAlign: 'center', color: 'inherit',
                  fontFamily: 'inherit',
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  opacity: card.available ? 1 : 0.5,
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
                onMouseEnter={e => {
                  if (!card.available) return;
                  e.currentTarget.style.borderColor = card.iconColor;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `var(--shadow-md), 0 0 30px ${card.iconBg}`;
                }}
                onMouseLeave={e => {
                  if (!card.available) return;
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: card.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Icon className="w-7 h-7" style={{ color: card.iconColor }} />
                </div>

                {/* Title */}
                <div style={{
                  fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)',
                  marginBottom: '8px', display: 'flex', alignItems: 'center',
                  gap: '6px', justifyContent: 'center',
                }}>
                  <span>{card.emoji}</span> {card.title}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6,
                  marginBottom: '12px', flex: 1,
                }}>
                  {card.description}
                </div>

                {/* Examples / Status */}
                <div style={{
                  fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic',
                  marginBottom: '12px',
                }}>
                  {card.examples}
                </div>

                {/* Badge */}
                <div style={{
                  fontSize: '11px', fontWeight: 600, padding: '4px 12px',
                  borderRadius: '99px',
                  background: card.available ? 'rgba(52,211,153,0.1)' : 'rgba(110,106,153,0.1)',
                  color: card.available ? 'var(--success)' : 'var(--text-muted)',
                  display: 'inline-block',
                }}>
                  {card.available ? 'Available' : 'Coming Soon'}
                </div>
              </button>

              {/* Notify link for disabled card */}
              {!card.available && (
                <button
                  onClick={() => setShowNotify(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--accent)', fontSize: '12px', fontWeight: 600,
                    marginTop: '10px', fontFamily: 'inherit',
                    textDecoration: 'underline', textDecorationColor: 'rgba(124,92,252,0.3)',
                    textUnderlineOffset: '3px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
                >
                  Notify me when this launches →
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Notify Modal */}
      {showNotify && (
        <div
          onClick={() => { setShowNotify(false); setNotifySubmitted(false); setNotifyEmail(''); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', animation: 'fade-in 0.2s ease-out forwards',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-card-appear"
            style={{
              width: '100%', maxWidth: '400px',
              background: 'var(--surface-solid)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)', padding: '32px', textAlign: 'center',
            }}
          >
            {notifySubmitted ? (
              <>
                <div className="success-icon-animate" style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'var(--gradient-success)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle className="w-7 h-7" style={{ color: '#fff' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
                  You&apos;re on the list!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  We&apos;ll email you when Multi-Visa Portal support launches.
                </p>
              </>
            ) : (
              <>
                {/* Close */}
                <button
                  onClick={() => setShowNotify(false)}
                  style={{
                    position: 'absolute', top: '12px', right: '12px',
                    width: '28px', height: '28px', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'transparent',
                    cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
                <h3 style={{
                  fontSize: '18px', fontWeight: 700, margin: '0 0 8px',
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  Get notified
                </h3>
                <p style={{
                  fontSize: '13px', color: 'var(--text-muted)',
                  margin: '0 0 20px', lineHeight: 1.6,
                }}>
                  Multi-Visa Portal support is under development. Leave your email and we&apos;ll let you know when it&apos;s ready.
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Mail className="w-4 h-4" style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }} />
                    <input
                      className="clean-input"
                      type="email"
                      placeholder="you@agency.com"
                      value={notifyEmail}
                      onChange={e => setNotifyEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleNotifySubmit()}
                      autoFocus
                      style={{ paddingLeft: '36px', fontSize: '14px' }}
                    />
                  </div>
                  <button
                    className="btn-friendly"
                    onClick={handleNotifySubmit}
                    disabled={!notifyEmail.trim()}
                    style={{ fontSize: '13px', padding: '10px 20px', whiteSpace: 'nowrap' }}
                  >
                    Notify Me
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
