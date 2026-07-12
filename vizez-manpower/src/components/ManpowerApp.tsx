"use client";

import React, { useState, useCallback } from "react";
import ManualVisaModule from "@/components/ManualVisaModule";
import type { LogEntry } from "@/app/types";

export default function ManpowerApp() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, timestamp, level, message }]);
  }, []);

  return (
    <ManualVisaModule
      logs={logs}
      addLog={addLog}
      onStepChange={() => {}}
    />
  );
}
