'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import LoginScreen from '@/components/LoginScreen';
import SettingsPanel from '@/components/SettingsPanel';
import UserManagement from '@/components/UserManagement';
import PassportLogsPanel from '@/components/PassportLogsPanel';
import './portal-styles.css';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  if (!user) return <LoginScreen />;

  return (
    <>
      <AppShell
        onSettingsOpen={() => setSettingsOpen(true)}
        onAccessOpen={() => setAccessOpen(true)}
        onLogsOpen={() => setLogsOpen(true)}
      >
        {/* Mesh background */}
        <div className="mesh-bg"><div className="mesh-bg-extra" /></div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {children}
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
