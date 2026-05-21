'use client';

import React from 'react';
import { Check } from 'lucide-react';

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { num: 0, label: 'Type' },
  { num: 1, label: 'Connect' },
  { num: 2, label: 'Detect' },
  { num: 3, label: 'Upload' },
  { num: 4, label: 'Review' },
  { num: 5, label: 'Done' },
];

export default function WizardStepper({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 32px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: '#000000',
      gap: '0',
    }}>
      {STEPS.map((s, i) => {
        const isDone = currentStep > s.num;
        const isCurrent = currentStep === s.num;
        return (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div style={{
                width: '48px',
                height: '1px',
                margin: '0 8px',
                background: isDone ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.06)',
                transition: 'background 0.3s ease',
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                transition: 'all 0.2s ease',
                ...(isCurrent
                  ? { background: '#7c5cfc', color: '#ffffff', boxShadow: '0 0 0 3px rgba(124,92,252,0.15)' }
                  : isDone
                  ? { background: '#1a1a1a', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.08)' }),
              }}>
                {isDone ? <Check size={12} /> : s.num}
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? '#ffffff' : isDone ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.30)',
                transition: 'color 0.2s ease',
              }}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
