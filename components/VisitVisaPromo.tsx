'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Brain, FileCheck, FileText, Sparkles, Zap, Clock,
  Users, ArrowRight, ChevronRight, Shield, Eye, Wand2,
  Scan, Stamp, LayoutTemplate, Play, CheckCircle2, Cpu,
  MousePointerClick,
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
}

/* ═══════════════════════════════════════════════
   ANIMATED COUNTER HOOK
═══════════════════════════════════════════════ */
function useCounter(end: number, duration = 2000, startOnMount = false) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(startOnMount);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started) {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
        { threshold: 0.3 },
      );
      if (ref.current) obs.observe(ref.current);
      return () => obs.disconnect();
    }
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const step = end / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) { setValue(end); clearInterval(timer); }
      else setValue(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return { value, ref };
}

/* ═══════════════════════════════════════════════
   WORKFLOW STEPS
═══════════════════════════════════════════════ */
const WORKFLOW = [
  {
    icon: Upload,
    num: '01',
    title: 'Upload Passports',
    desc: 'Drag & drop any number of passport photos. Supports JPG, PNG, WEBP — no limit on quantity.',
    color: '#7c5cfc',
    glow: 'rgba(124, 92, 252, 0.2)',
  },
  {
    icon: Brain,
    num: '02',
    title: 'AI Extracts Data',
    desc: 'GPT-4 Vision reads each passport in seconds — names, numbers, nationalities, dates — all extracted automatically.',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.2)',
  },
  {
    icon: Eye,
    num: '03',
    title: 'Review & Edit',
    desc: 'Verify extracted data in a clean review grid. Edit any field inline — the AI gets it right 99% of the time.',
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.2)',
  },
  {
    icon: FileText,
    num: '04',
    title: 'Generate Letters',
    desc: 'Provide your letterhead, stamp & signature once — letters generate instantly with your company branding.',
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.2)',
  },
];

/* ═══════════════════════════════════════════════
   FEATURE CARDS
═══════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: Scan,
    title: 'AI-Powered Extraction',
    desc: 'Upload passport photos and let GPT-4 Vision do the work. Names, passport numbers, dates of birth, expiry dates — all extracted in seconds with near-perfect accuracy.',
    gradient: 'linear-gradient(135deg, rgba(124,92,252,0.12), rgba(56,189,248,0.08))',
    borderColor: 'rgba(124,92,252,0.2)',
    iconBg: 'linear-gradient(135deg, #7c5cfc, #38bdf8)',
  },
  {
    icon: Stamp,
    title: 'Smart Letter Builder',
    desc: 'Upload your letterhead background, stamp, and signature once. The system handles formatting, positioning, and generates professional renewal letters for every passport.',
    gradient: 'linear-gradient(135deg, rgba(244,114,182,0.1), rgba(124,92,252,0.08))',
    borderColor: 'rgba(244,114,182,0.2)',
    iconBg: 'linear-gradient(135deg, #f472b6, #7c5cfc)',
  },
  {
    icon: Zap,
    title: 'Batch Processing',
    desc: 'Process unlimited passports at once. Every 10 passports auto-groups into a single PDF. What took a team hours now takes one person minutes.',
    gradient: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(56,189,248,0.08))',
    borderColor: 'rgba(52,211,153,0.2)',
    iconBg: 'linear-gradient(135deg, #34d399, #38bdf8)',
  },
];

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function VisitVisaPromo({ onGetStarted }: Props) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  const passportsCounter = useCounter(500, 2200);
  const timeCounter = useCounter(95, 1800);
  const accuracyCounter = useCounter(99, 1600);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0px',
      maxWidth: '920px', margin: '0 auto', width: '100%',
    }}>

      {/* ══════════════════════════════════════════
         HERO SECTION
      ══════════════════════════════════════════ */}
      <div style={{
        textAlign: 'center',
        padding: '20px 20px 48px',
        opacity: heroVisible ? 1 : 0,
        transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* AI badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '99px',
          background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(56,189,248,0.1))',
          border: '1px solid rgba(124,92,252,0.25)',
          marginBottom: '24px',
          animation: 'glow-breathe 3s ease-in-out infinite',
        }}>
          <Sparkles style={{ width: 14, height: 14, color: '#a78bfa' }} />
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase' as const, color: '#a78bfa',
          }}>
            Powered by AI
          </span>
        </div>

        {/* Main heading */}
        <h1 style={{
          fontSize: '42px', fontWeight: 800, lineHeight: 1.15,
          fontFamily: "'Outfit', 'Inter', sans-serif",
          margin: '0 0 16px 0', letterSpacing: '-1px',
          color: 'var(--text-primary)',
        }}>
          Visit Visa
          <br />
          <span className="gradient-text" style={{ fontSize: '44px' }}>
            Automation
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '16px', lineHeight: 1.7, color: 'var(--text-secondary)',
          maxWidth: '560px', margin: '0 auto 32px',
        }}>
          Upload passport photos, AI extracts all the data, and generates
          professional renewal letters with your branding — <strong style={{ color: 'var(--text-primary)' }}>automatically</strong>.
        </p>

        {/* CTA + secondary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={onGetStarted}
            className="btn-primary"
            style={{
              padding: '14px 36px', fontSize: '15px', fontWeight: 700,
              borderRadius: '14px', gap: '10px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.04)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
            }}
          >
            <Play style={{ width: 16, height: 16 }} />
            Start Processing
          </button>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '13.5px', fontWeight: 500, color: 'var(--text-muted)',
              textDecoration: 'none', cursor: 'pointer',
              padding: '14px 20px', borderRadius: '14px',
              border: '1px solid var(--border)',
              background: 'var(--glass-bg)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
            }}
          >
            See how it works
            <ChevronRight style={{ width: 14, height: 14 }} />
          </a>
        </div>

        {/* Impact stat bar */}
        <div style={{
          marginTop: '40px', display: 'inline-flex', alignItems: 'center', gap: '0',
          padding: '4px', borderRadius: '16px',
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(20px)',
        }}>
          {[
            { icon: Users, label: '10→1 staff', color: '#7c5cfc' },
            { icon: Clock, label: '95% faster', color: '#38bdf8' },
            { icon: Shield, label: '99% accuracy', color: '#34d399' },
          ].map((stat, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <stat.icon style={{ width: 14, height: 14, color: stat.color }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
         FEATURE CARDS
      ══════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        padding: '0 0 48px',
      }}>
        {FEATURES.map((feat, i) => {
          const Icon = feat.icon;
          const isHovered = hoveredFeature === i;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                position: 'relative',
                padding: '28px 24px',
                borderRadius: 'var(--radius-lg)',
                background: feat.gradient,
                border: `1px solid ${isHovered ? feat.borderColor : 'var(--glass-border)'}`,
                cursor: 'default',
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0)',
                boxShadow: isHovered
                  ? `var(--shadow-md), 0 0 40px ${feat.borderColor}`
                  : 'var(--shadow-sm)',
                overflow: 'hidden',
              }}
            >
              {/* Shimmer overlay on hover */}
              {isHovered && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, transparent 55%)',
                  backgroundSize: '200% 100%',
                  animation: 'glass-shimmer 1.5s ease-in-out',
                  pointerEvents: 'none',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: feat.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '18px',
                boxShadow: isHovered ? `0 0 25px ${feat.borderColor}` : 'none',
                transition: 'box-shadow 0.3s ease',
              }}>
                <Icon style={{ width: 22, height: 22, color: '#fff' }} />
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: '15.5px', fontWeight: 700, margin: '0 0 8px',
                fontFamily: "'Outfit', 'Inter', sans-serif",
                color: 'var(--text-primary)', letterSpacing: '-0.3px',
              }}>
                {feat.title}
              </h3>

              {/* Desc */}
              <p style={{
                fontSize: '12.5px', lineHeight: 1.7, margin: 0,
                color: 'var(--text-secondary)',
              }}>
                {feat.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
         HOW IT WORKS — WORKFLOW TIMELINE
      ══════════════════════════════════════════ */}
      <div id="how-it-works" style={{ padding: '16px 0 48px' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', borderRadius: '99px',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            marginBottom: '16px',
          }}>
            <Cpu style={{ width: 12, height: 12, color: 'var(--accent)' }} />
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase' as const, color: 'var(--text-muted)',
            }}>
              Workflow
            </span>
          </div>
          <h2 style={{
            fontSize: '28px', fontWeight: 800, margin: '0 0 8px',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            color: 'var(--text-primary)', letterSpacing: '-0.5px',
          }}>
            How It Works
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Four steps. Fully automated. Zero manual data entry.
          </p>
        </div>

        {/* Timeline */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0',
          position: 'relative',
        }}>
          {/* Connector line */}
          <div style={{
            position: 'absolute',
            top: '32px', left: '12%', right: '12%',
            height: '2px',
            background: 'var(--border)',
            zIndex: 0,
          }}>
            <div style={{
              height: '100%', width: '100%',
              background: 'var(--gradient-primary)',
              opacity: 0.3,
              borderRadius: '99px',
            }} />
          </div>

          {WORKFLOW.map((step, i) => {
            const Icon = step.icon;
            const isHovered = hoveredStep === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', padding: '0 12px', position: 'relative', zIndex: 1,
                }}
              >
                {/* Circle */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '20px',
                  background: isHovered
                    ? `linear-gradient(135deg, ${step.color}, ${step.color}dd)`
                    : 'var(--surface-2)',
                  border: `2px solid ${isHovered ? step.color : 'var(--border-bright)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                  transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                  boxShadow: isHovered ? `0 0 30px ${step.glow}` : 'none',
                }}>
                  <Icon style={{
                    width: 26, height: 26,
                    color: isHovered ? '#fff' : step.color,
                    transition: 'color 0.2s ease',
                  }} />
                </div>

                {/* Step number */}
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
                  color: step.color, marginBottom: '6px',
                  opacity: 0.7,
                }}>
                  STEP {step.num}
                </span>

                {/* Title */}
                <h4 style={{
                  fontSize: '14px', fontWeight: 700, margin: '0 0 6px',
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                  color: 'var(--text-primary)',
                }}>
                  {step.title}
                </h4>

                {/* Desc */}
                <p style={{
                  fontSize: '11.5px', lineHeight: 1.6, margin: 0,
                  color: 'var(--text-muted)',
                }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════
         STATS ROW
      ══════════════════════════════════════════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px', padding: '0 0 48px',
      }}>
        {[
          {
            ref: passportsCounter.ref,
            value: passportsCounter.value + '+',
            label: 'Passports Processed',
            sub: 'and counting',
            icon: FileCheck,
            color: '#7c5cfc',
            gradient: 'linear-gradient(135deg, rgba(124,92,252,0.1), rgba(124,92,252,0.03))',
          },
          {
            ref: timeCounter.ref,
            value: timeCounter.value + '%',
            label: 'Time Saved',
            sub: 'vs manual processing',
            icon: Clock,
            color: '#38bdf8',
            gradient: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.03))',
          },
          {
            ref: accuracyCounter.ref,
            value: accuracyCounter.value + '%',
            label: 'Extraction Accuracy',
            sub: 'GPT-4 Vision powered',
            icon: Wand2,
            color: '#34d399',
            gradient: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(52,211,153,0.03))',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              ref={stat.ref}
              style={{
                padding: '28px 24px', borderRadius: 'var(--radius-lg)',
                background: stat.gradient,
                border: '1px solid var(--glass-border)',
                textAlign: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.borderColor = `${stat.color}33`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
              }}
            >
              <Icon style={{ width: 20, height: 20, color: stat.color, marginBottom: '12px' }} />
              <div style={{
                fontSize: '36px', fontWeight: 800,
                fontFamily: "'Outfit', 'Inter', sans-serif",
                color: stat.color, letterSpacing: '-1px',
                lineHeight: 1,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                marginTop: '8px',
              }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {stat.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
         BOTTOM CTA
      ══════════════════════════════════════════ */}
      <div style={{
        padding: '36px 40px', borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, rgba(124,92,252,0.12), rgba(56,189,248,0.08), rgba(244,114,182,0.06))',
        border: '1px solid rgba(124,92,252,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '24px', marginBottom: '24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-50%', right: '-10%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'rgba(124,92,252,0.08)', filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Sparkles style={{ width: 18, height: 18, color: '#a78bfa' }} />
            <h3 style={{
              fontSize: '20px', fontWeight: 800, margin: 0,
              fontFamily: "'Outfit', 'Inter', sans-serif",
              color: 'var(--text-primary)', letterSpacing: '-0.3px',
            }}>
              Ready to automate?
            </h3>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            The work that needed <strong style={{ color: 'var(--text-primary)' }}>10 employees</strong> can now be done by <strong style={{ color: '#7c5cfc' }}>1 person</strong>. Start processing passports now.
          </p>
        </div>

        <button
          onClick={onGetStarted}
          className="btn-primary"
          style={{
            padding: '14px 32px', fontSize: '14px', fontWeight: 700,
            borderRadius: '12px', gap: '8px', flexShrink: 0,
            position: 'relative', zIndex: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.04)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
          }}
        >
          <MousePointerClick style={{ width: 16, height: 16 }} />
          Get Started
          <ArrowRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  );
}
