import React, { useState, useEffect } from "react";
import { Database, AlertCircle, ArrowRight, Check, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ExtractStep({ items, setItems, onNext, selectedModel, addLog }: any) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);

  /* Simulated incremental progress */
  useEffect(() => {
    if (items.length === 0) return;
    let simInterval: NodeJS.Timeout;
    if (isProcessing && progress < 85) {
      simInterval = setInterval(() => {
        setProgress((p) => {
          const inc = Math.random() * 5 + 2;
          const next = p + inc;
          return next > 85 ? 85 : next;
        });
      }, 500);
    }
    return () => clearInterval(simInterval);
  }, [items.length, isProcessing, progress]);

  /* Actual extraction */
  useEffect(() => {
    let active = true;
    const pending = items.filter((x: any) => x.status === "pending");
    if (pending.length === 0) {
      setIsProcessing(false);
      setProgress(100);
      return;
    }

    const processAll = async () => {
      for (let i = 0; i < pending.length; i++) {
        if (!active) break;
        const item = pending[i];
        try {
          const formData = new FormData();
          formData.append("passport", item.passportFile);
          if (item.workPermitFile) formData.append("work_permit", item.workPermitFile);
          formData.append("model", selectedModel);
          const res = await fetch("/api/process", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Extraction failed");
          const data = await res.json();
          const hasWP = !!data.work_permit && Object.keys(data.work_permit).length > 0;
          setItems((prev: any) =>
            prev.map((x: any) =>
              x.id === item.id
                ? {
                    ...x,
                    status: "extracted",
                    passportData: data.passport,
                    workPermitData: data.work_permit || null,
                    passportImageDataUrl: data.passport_image_data_url || x.passportPreviewUrl,
                    workPermitImageDataUrl: data.work_permit_image_data_url || x.workPermitPreviewUrl,
                    _wpExtracted: hasWP,
                  }
                : x
            )
          );
        } catch {
          setItems((prev: any) =>
            prev.map((x: any) =>
              x.id === item.id ? { ...x, status: "error" } : x
            )
          );
        }
      }
      if (active) {
        setIsProcessing(false);
        setProgress(100);
      }
    };
    processAll();
    return () => { active = false; };
  }, [items, setItems, selectedModel]);

  const allDone = !isProcessing;
  const hasErrors = items.some((x: any) => x.status === "error");
  const extractedCount = items.filter((x: any) => x.status === "extracted").length;
  const errorCount = items.filter((x: any) => x.status === "error").length;

  /* ── Animated ring orb ── */
  const circumference = 2 * Math.PI * 40; // radius 40
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="mb-7 flex-shrink-0">
        <h2 className="text-3xl font-bold text-white mb-2 font-['Outfit'] tracking-tight">
          {allDone ? "Extraction Complete" : "Extracting"}
        </h2>
        <p className="text-sm text-white/50">
          {allDone
            ? `${extractedCount} extracted${errorCount > 0 ? ` · ${errorCount} error${errorCount !== 1 ? "s" : ""}` : ""}`
            : "Analyzing documents with Vision AI"}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28 -mx-4 px-4">

      {/* Orb progress card */}
      <div className="bg-[rgba(255,255,255,0.03)] border border-white/[0.08] rounded-[28px] p-8 mb-6 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-emerald-500/[0.03]" />

        {/* SVG ring */}
        <div className="relative z-10 mb-6">
          <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
            {/* Track */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={allDone && !hasErrors ? "#10b981" : "var(--accent)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 0.4s ease-out, stroke 0.3s ease" }}
            />
          </svg>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {allDone ? (
              <Database
                className={`w-9 h-9 ${hasErrors ? "text-amber-400" : "text-emerald-400"}`}
              />
            ) : (
              <Loader2 className="w-9 h-9 text-[var(--accent)] animate-spin" />
            )}
          </div>
        </div>

        {/* Percentage */}
        <div className="text-4xl font-bold text-white font-['Outfit'] tracking-tight mb-1 relative z-10">
          {Math.round(progress)}
          <span className="text-2xl text-white/40">%</span>
        </div>
        <p className="text-sm text-white/50 relative z-10">
          {!allDone ? "Processing passports..." : hasErrors ? "Completed with errors" : "All documents extracted"}
        </p>

        {/* Shimmer bar */}
        {!allDone && (
          <div className="w-40 h-1 bg-white/5 rounded-full mt-4 overflow-hidden relative z-10">
            <div className="h-full progress-shimmer rounded-full" style={{ width: `${progress}%`, transition: "width 0.4s ease" }} />
          </div>
        )}
      </div>

      {/* Per-item status list */}
      <div className="flex flex-col gap-2.5">
        {items.map((item: any, idx: number) => (
          <div
            key={item.id}
            className="bg-[rgba(255,255,255,0.02)] border border-white/[0.06] rounded-[18px] p-3.5 flex items-center gap-4 animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Thumbnail */}
            <div className="w-12 h-14 bg-black/50 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.passportPreviewUrl} className="w-full h-full object-cover opacity-80" alt="doc" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm truncate">
                {item.passportFile?.name || "Passport"}
              </h3>
              <p className="text-xs mt-0.5">
                {item.status === "pending" && (
                  <span className="text-white/35 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/25 animate-pulse inline-block" />
                    Queued
                  </span>
                )}
                {item.status === "extracted" && (
                  <span className="text-emerald-400 font-medium">
                    Passport{item._wpExtracted ? " + Work Permit" : ""} extracted
                  </span>
                )}
                {item.status === "error" && (
                  <span className="text-red-400 font-medium">Failed to extract</span>
                )}
              </p>
            </div>

            <div className="shrink-0">
              {item.status === "pending" && (
                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              )}
              {item.status === "extracted" && (
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/25">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              )}
              {item.status === "error" && (
                <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center border border-red-500/25">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      </div> {/* end scrollable */}

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#050507]/90 backdrop-blur-xl border-t border-white/10 p-4 pb-safe z-50">
        <div className="max-w-md mx-auto">
          <button
            disabled={!allDone}
            onClick={onNext}
            className={`w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-300 ${
              allDone
                ? hasErrors
                  ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.97]"
                  : "bg-[var(--accent)] text-white shadow-[var(--accent-glow)] active:scale-[0.97]"
                : "bg-white/5 text-white/30"
            }`}
          >
            {hasErrors ? "Review with Errors" : "Review Results"}{" "}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
