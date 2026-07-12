
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ManualVisaItem, LogEntry } from "@/app/types";
import UploadStep from "./steps/UploadStep";
import ExtractStep from "./steps/ExtractStep";
import ReviewStep from "./steps/ReviewStep";

interface Props {
  logs: LogEntry[];
  addLog: (level: LogEntry["level"], message: string) => void;
  onStepChange?: (step: number) => void;
}

type Step = 1 | 2 | 3 | 4;
const STORAGE_KEY = "vizez_manual_v2";

export default function ManualVisaModule({ logs, addLog, onStepChange }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<ManualVisaItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  // Restore persisted data on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw || raw.trim() === '' || raw.trim() === 'null') return;
      const saved = JSON.parse(raw) as Array<Omit<ManualVisaItem, "passportFile" | "workPermitFile">>;
      if (!Array.isArray(saved) || saved.length === 0) return;
      const restored: ManualVisaItem[] = saved.map((s) => ({
        ...s,
        passportFile: null,
        workPermitFile: null,
      }));
      if (restored.length > 0) {
        setItems(restored);
        setStep(4);
        if (onStepChange) onStepChange(4);
      }
    } catch {
      // Corrupt localStorage — clear it silently
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [onStepChange]);

  // Persist extracted items whenever they change
  useEffect(() => {
    const toSave = items
      .filter((x) => x.status === "extracted" || x.status === "error")
      .map(({ passportFile, workPermitFile, ...rest }) => rest);

    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else if (toSave.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // limit exceeded
      }
    }
  }, [items]);

  useEffect(() => {
    if(onStepChange) onStepChange(step);
  }, [step, onStepChange]);

  const clearAll = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    setStep(1);
  }, []);

  return (
    <div className="w-full h-full max-w-md mx-auto relative min-h-[100dvh] bg-[#050507] overflow-x-hidden sm:shadow-2xl sm:border-x sm:border-white/5">
      {/* Sleek Mobile Top Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <div 
          className="h-full bg-[var(--accent)] transition-all duration-500 ease-in-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <div className="pt-10 px-4 h-full relative">
        {step === 1 && (
          <div className="h-full">
            <UploadStep items={items} setItems={setItems} onNext={() => setStep(3)} />
          </div>
        )}
        {step === 3 && (
          <div className="h-full">
            <ExtractStep 
              items={items} setItems={setItems} onNext={() => setStep(4)} 
              selectedModel={selectedModel} addLog={addLog}
            />
          </div>
        )}
        {step === 4 && (
          <div className="h-full">
            <ReviewStep items={items} setItems={setItems} onPrev={() => setStep(1)} onClear={clearAll} />
          </div>
        )}
      </div>
    </div>
  );
}

