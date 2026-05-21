'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import ManualVisaModule from '@/components/ManualVisaModule';
import SettingsPanel from '@/components/SettingsPanel';
import UserManagement from '@/components/UserManagement';
import PassportLogsPanel from '@/components/PassportLogsPanel';
import { Check } from 'lucide-react';
import Link from 'next/link';
import type { LogEntry } from '@/app/types';

const MANUAL_VISA_STEPS = ['Upload', 'Extract', 'Review'];

export default function RopEvisaPage() {
  const [manualLogs, setManualLogs] = useState<LogEntry[]>([]);
  const [manualStep, setManualStep] = useState<1 | 2 | 3>(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const addManualLog = useCallback((level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setManualLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, timestamp, level, message }]);
  }, []);

  const STEP_EMOJIS = ['📤', '⚡', '✅'];

  return (
    <>
      <AppShell
        onSettingsOpen={() => setSettingsOpen(true)}
        onAccessOpen={() => setAccessOpen(true)}
        onLogsOpen={() => setLogsOpen(true)}
      >
        <div className="mesh-bg"><div className="mesh-bg-extra" /></div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Back link */}
          <div style={{ padding: '16px 32px 0', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
            <Link
              href="/addons"
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.35)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              ← Back to Addons
            </Link>
          </div>

          {/* Step Wizard Bar */}
          <div className="wizard-bar" style={{ flexDirection: 'column', gap: '0' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <h1 style={{
                fontSize: '22px', fontWeight: 800,
                color: 'var(--text-primary)', margin: 0,
                fontFamily: "'Outfit', 'Inter', sans-serif",
                letterSpacing: '-0.3px',
              }}>
                ROP eVisa Manual Filler
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Upload passports &amp; work permits, extract data, and fill the ROP eVisa portal
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {MANUAL_VISA_STEPS.map((label, i) => {
                const stepNum = i + 1;
                const isDone = manualStep > stepNum;
                const isCurrent = manualStep === stepNum;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && (
                      <div style={{
                        width: '100px', height: '3px', margin: '0 8px', borderRadius: '99px',
                        background: isDone ? 'var(--success)' : 'var(--border)',
                        transition: 'background 0.4s ease',
                      }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div className={`step-dot ${isCurrent ? 'step-dot--active' : isDone ? 'step-dot--done' : 'step-dot--pending'}`}>
                        {isDone ? <Check className="w-5 h-5" /> : <span>{STEP_EMOJIS[i]}</span>}
                      </div>
                      <span style={{
                        fontSize: '13px', fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? 'var(--text-primary)' : isDone ? 'var(--success)' : 'var(--text-muted)',
                      }}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <main style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 32px 48px' }}>
              <ManualVisaModule
                logs={manualLogs}
                addLog={addManualLog}
                onStepChange={(s) => setManualStep(s as 1 | 2 | 3)}
              />
            </div>
          </main>
        </div>
      </AppShell>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        letterheadSrc=""
        stampSrc=""
        onLetterheadChange={() => {}}
        onStampChange={() => {}}
      />
      <UserManagement isOpen={accessOpen} onClose={() => setAccessOpen(false)} />
      <PassportLogsPanel isOpen={logsOpen} onClose={() => setLogsOpen(false)} />
    </>
  );
}
