'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import SettingsPanel from '@/components/SettingsPanel';
import UploadScreen from '@/components/UploadScreen';
import ExtractionScreen from '@/components/ExtractionScreen';
import VisitVisaPromo from '@/components/VisitVisaPromo';
import LetterGenerationScreen from '@/components/LetterGenerationScreen';
import ManualVisaModule from '@/components/ManualVisaModule';
import LoginScreen from '@/components/LoginScreen';
import LoadingScreen from '@/components/LoadingScreen';
import UserManagement from '@/components/UserManagement';
import PassportLogsPanel from '@/components/PassportLogsPanel';
import MobileBlocker from '@/components/MobileBlocker';
import ChangelogNotification from '@/components/ChangelogNotification';
import { LogEntry, PassportItem } from './types';

const DEFAULT_LETTERHEAD = '';
const DEFAULT_STAMP = '';

const VISIT_VISA_STEPS = ['Upload', 'Extract', 'Review', 'Generate'];
const MANUAL_VISA_STEPS = ['Upload', 'Extract', 'Review'];

const MODULE_META: Record<string, { title: string; subtitle: string }> = {
  'visit-visa':  { title: 'Visit Visa', subtitle: 'Renewal letter generation' },
  'manual-visa': { title: 'Manual Visa', subtitle: 'ROP eVisa portal' },
};

const LOADING_SESSION_KEY = 'vizez_loading_shown';

function AppContent() {
  const { user } = useAuth();

  // Loading screen — once per session
  const [showLoading, setShowLoading] = useState(false);
  const [loadingChecked, setLoadingChecked] = useState(false);

  useEffect(() => {
    if (user) {
      const alreadyShown = sessionStorage.getItem(LOADING_SESSION_KEY);
      if (!alreadyShown) {
        setShowLoading(true);
      }
      setLoadingChecked(true);
    }
  }, [user]);

  const handleLoadingComplete = useCallback(() => {
    setShowLoading(false);
    try { sessionStorage.setItem(LOADING_SESSION_KEY, '1'); } catch {}
  }, []);

  const [activeModule, setActiveModule] = useState('visit-visa');

  // ── Visit Visa state ──
  const [visitStep, setVisitStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [passports, setPassports] = useState<PassportItem[]>([]);
  const [visitLogs, setVisitLogs] = useState<LogEntry[]>([]);

  // ── Manual Visa state ──
  const [manualLogs, setManualLogs] = useState<LogEntry[]>([]);
  const [manualStep, setManualStep] = useState<1 | 2 | 3>(1);

  // ── Global settings ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [letterheadSrc, setLetterheadSrc] = useState(DEFAULT_LETTERHEAD);
  const [stampSrc, setStampSrc] = useState(DEFAULT_STAMP);

  useEffect(() => {
    try {
      const lh = localStorage.getItem('vizez_letterhead');
      const st = localStorage.getItem('vizez_stamp');
      if (lh) setLetterheadSrc(lh);
      if (st) setStampSrc(st);
    } catch {}
  }, []);

  const addVisitLog = useCallback((level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setVisitLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, timestamp, level, message }]);
  }, []);

  const addManualLog = useCallback((level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setManualLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, timestamp, level, message }]);
  }, []);

  const handleVisitNext = () => setVisitStep((s) => Math.min(s + 1, 4) as 0 | 1 | 2 | 3 | 4);
  const handleVisitPrev = () => setVisitStep((s) => Math.max(s - 1, 1) as 0 | 1 | 2 | 3 | 4);

  const handleModuleChange = (id: string) => {
    setActiveModule(id);
    // Reset the module being left
    if (id === 'visit-visa') {
      setVisitStep(0);
      setPassports([]);
      setVisitLogs([]);
    }
    if (id === 'manual-visa') {
      setManualStep(1);
      setManualLogs([]);
    }
  };

  // Current step for sidebar tracker
  const currentStep = activeModule === 'visit-visa' ? Math.max(visitStep, 1) : manualStep;
  const currentStepLabels = activeModule === 'visit-visa' ? VISIT_VISA_STEPS : MANUAL_VISA_STEPS;
  const meta = MODULE_META[activeModule] || MODULE_META['visit-visa'];

  // If not logged in, show login screen
  if (!user) {
    return <LoginScreen />;
  }

  // If loading screen hasn't been checked yet, show nothing (prevents flash)
  if (!loadingChecked) return null;

  // If loading screen should show
  if (showLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <>
    {/* ── Changelog notification — once per version ── */}
    <ChangelogNotification />

    {/* ── Mesh gradient background ── */}
    <div className="mesh-bg">
      <div className="mesh-bg-extra" />
    </div>

    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        onSettingsOpen={() => setSettingsOpen(true)}
        onAccessOpen={() => setAccessOpen(true)}
        onLogsOpen={() => setLogsOpen(true)}
      />

      {/* Main content */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
        }}
      >
        {/* Top bar — glass pill (hidden on promo) */}
        {!(activeModule === 'visit-visa' && visitStep === 0) && <div
          style={{
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            borderBottom: '1px solid var(--glass-border)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: "'Outfit', 'Inter', sans-serif",
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}>
              {meta.title}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
              {meta.subtitle}
            </div>
          </div>

          {/* Step progress — capsule stepper */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 6px',
            borderRadius: '99px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}>
            {currentStepLabels.map((label, i) => {
              const stepNum = i + 1;
              const isDone = currentStep > stepNum;
              const isCurrent = currentStep === stepNum;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '99px',
                    background: isCurrent ? 'var(--accent-subtle)' : 'transparent',
                    border: isCurrent ? '1px solid var(--border-bright)' : '1px solid transparent',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}>
                    <div
                      style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: isDone ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--surface-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 700,
                        color: isDone || isCurrent ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: isCurrent ? '0 0 12px rgba(124, 92, 252, 0.4)' : 'none',
                      }}
                    >
                      {isDone ? '✓' : stepNum}
                    </div>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: isCurrent ? 600 : 400,
                      color: isCurrent ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)',
                      transition: 'all 0.3s ease',
                    }}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* Step content */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* ── Visit Visa ── */}
          {activeModule === 'visit-visa' && (
            <>
              {visitStep === 0 && <VisitVisaPromo onGetStarted={() => setVisitStep(1)} />}
              {visitStep === 1 && <UploadScreen passports={passports} setPassports={setPassports} onNext={handleVisitNext} />}
              {visitStep === 2 && <ExtractionScreen passports={passports} setPassports={setPassports} logs={visitLogs} addLog={addVisitLog} onNext={handleVisitNext} onPrev={handleVisitPrev} isReview={false} />}
              {visitStep === 3 && <ExtractionScreen passports={passports} setPassports={setPassports} logs={visitLogs} addLog={addVisitLog} onNext={handleVisitNext} onPrev={handleVisitPrev} isReview={true} />}
              {visitStep === 4 && <LetterGenerationScreen passports={passports} onPrev={handleVisitPrev} letterheadSrc={letterheadSrc} stampSrc={stampSrc} />}
            </>
          )}

          {/* ── Manual Visa ── */}
          {activeModule === 'manual-visa' && (
            <ManualVisaModule
              logs={manualLogs}
              addLog={addManualLog}
              onStepChange={(s) => setManualStep(s as 1 | 2 | 3)}
            />
          )}
        </div>
      </main>

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        letterheadSrc={letterheadSrc}
        stampSrc={stampSrc}
        onLetterheadChange={(src) => {
          setLetterheadSrc(src);
          try { localStorage.setItem('vizez_letterhead', src); } catch {}
        }}
        onStampChange={(src) => {
          setStampSrc(src);
          try { localStorage.setItem('vizez_stamp', src); } catch {}
        }}
      />

      {/* User management panel (admin only) */}
      <UserManagement
        isOpen={accessOpen}
        onClose={() => setAccessOpen(false)}
      />

      {/* Passport logs panel (admin only) */}
      <PassportLogsPanel
        isOpen={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
    </div>
    </>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MobileBlocker />
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
