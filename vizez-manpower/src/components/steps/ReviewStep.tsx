"use client";

import React, { useState, useRef, useCallback } from "react";
import { ManualVisaItem } from "@/app/types";
import {
  ChevronRight,
  Trash2,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  Pencil,
  X,
  AlertTriangle,
  User,
  FileText,
  Camera,
  RotateCcw,
  Shield,
} from "lucide-react";
import AutoSubmitModal from "@/components/AutoSubmitModal";

/* ─── Passport field display labels ─── */
const PASSPORT_LABELS: Record<string, string> = {
  surname: "Surname",
  first_name: "First Name",
  second_name: "Second Name",
  third_name: "Third Name",
  fourth_name: "Fourth Name",
  passport_number: "Passport No.",
  issue_date: "Issue Date",
  place_of_issue: "Place of Issue",
  expiry_date: "Expiry Date",
  passport_country: "Issuing Country",
  nationality: "Nationality",
  date_of_birth: "Date of Birth",
  city_of_birth: "City of Birth",
  country_of_birth: "Country of Birth",
  gender: "Gender",
  mother_name: "Mother Name",
  issuing_state: "Issuing State",
};

const WP_LABELS: Record<string, string> = {
  sponsor_name: "Sponsor / Employer",
  civil_id: "Civil ID",
  phone_number: "Phone Number",
  mobile_number: "Mobile Number",
  address: "Address",
  relationship: "Relationship",
  occupation_code: "Occupation Code",
  occupation_description: "Occupation",
  pa_number: "PA Number",
  wfpa_number: "WFPA Number",
  expiry_date: "Permit Expiry",
};

/* ─── Copy button ─── */
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all flex-shrink-0"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

/* ─── Inline editable field row ─── */
interface EditableFieldProps {
  label: string;
  value: string;
  originalValue: string;
  onChange: (val: string) => void;
}

function EditableField({ label, value, originalValue, onChange }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdited = value !== originalValue && originalValue !== undefined;

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = () => {
    setEditing(false);
    onChange(draft.trim());
  };

  const revert = () => {
    setEditing(false);
    setDraft(value);
  };

  const resetToOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(originalValue);
    setDraft(originalValue);
  };

  return (
    <div className="group flex flex-col gap-1 py-3 border-b border-white/[0.05] last:border-0 last:pb-0">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold flex-1">
          {label}
        </span>
        {isEdited && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-full">
              Edited
            </span>
            <button
              onClick={resetToOriginal}
              title="Reset to AI value"
              className="text-white/25 hover:text-white/60 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Value row */}
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") revert();
            }}
            className="flex-1 bg-[rgba(99,102,241,0.08)] border border-[var(--accent)] rounded-lg px-3 py-1.5 text-sm text-white font-medium outline-none focus:ring-1 focus:ring-[var(--accent)]/50 transition-all"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); commit(); }}
            className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/25 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); revert(); }}
            className="w-7 h-7 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 rounded-lg px-1 -ml-1 cursor-pointer hover:bg-white/[0.04] transition-colors group/field"
          onClick={startEdit}
        >
          <span
            className={`flex-1 text-sm font-medium leading-snug ${
              value ? "text-white" : "text-white/25 italic"
            }`}
          >
            {value || "—"}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover/field:opacity-100 transition-opacity">
            <CopyBtn value={value} />
            <button
              onClick={(e) => { e.stopPropagation(); startEdit(); }}
              className="p-1.5 rounded-lg text-white/30 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function ReviewStep({ items, setItems, onClear }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"passport" | "workpermit">("passport");

  // Track original AI-extracted values for reset-to-original capability
  const [originals] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    items.forEach((item: ManualVisaItem) => {
      map[item.id] = {
        passportData: { ...(item.passportData || {}) },
        workPermitData: { ...(item.workPermitData || {}) },
      };
    });
    return map;
  });

  const extracted = items.filter((x: any) => x.status === "extracted");
  const selectedItem = items.find((x: any) => x.id === selectedId);

  /* ── Field update helpers ── */
  const updatePassportField = useCallback(
    (id: string, key: string, value: string) => {
      setItems((prev: ManualVisaItem[]) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, passportData: { ...item.passportData, [key]: value } as any }
            : item
        )
      );
    },
    [setItems]
  );

  const updateWorkPermitField = useCallback(
    (id: string, key: string, value: string) => {
      setItems((prev: ManualVisaItem[]) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, workPermitData: { ...item.workPermitData, [key]: value } as any }
            : item
        )
      );
    },
    [setItems]
  );

  /* ── Count edited fields ── */
  const getEditedCount = (item: ManualVisaItem) => {
    let count = 0;
    const orig = originals[item.id];
    if (!orig) return 0;
    Object.entries(item.passportData || {}).forEach(([k, v]) => {
      if (orig.passportData?.[k] !== v) count++;
    });
    Object.entries(item.workPermitData || {}).forEach(([k, v]) => {
      if (orig.workPermitData?.[k] !== v) count++;
    });
    return count;
  };

  /* ── List view ── */
  const renderList = () => (
    <div className="flex flex-col gap-3">
      {extracted.map((item: ManualVisaItem, i: number) => {
        const editedCount = getEditedCount(item);
        const hasWP = item.workPermitData && Object.keys(item.workPermitData).length > 0;

        return (
          <div
            key={item.id}
            onClick={() => { setSelectedId(item.id); setActiveTab("passport"); }}
            className="bg-[rgba(255,255,255,0.03)] border border-white/[0.08] rounded-[22px] overflow-hidden cursor-pointer hover:border-[var(--accent)]/50 hover:bg-[rgba(255,255,255,0.05)] transition-all duration-200 group active:scale-[0.985]"
          >
            {/* Card header */}
            <div className="p-4 flex items-center gap-4">
              {/* Index / photo */}
              <div className="relative">
                {item.photoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photoPreviewUrl}
                    alt="photo"
                    className="w-12 h-14 rounded-xl object-cover border border-white/10 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-14 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center">
                    <span className="text-[var(--accent)] font-bold text-lg">{i + 1}</span>
                  </div>
                )}
                {editedCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-[8px] font-bold text-black">{editedCount}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-[15px] truncate leading-tight">
                  {item.passportData?.first_name} {item.passportData?.surname}
                </h3>
                <p className="text-white/50 text-[12px] truncate mt-0.5">
                  {item.passportData?.passport_number}
                  {item.passportData?.nationality ? ` · ${item.passportData.nationality}` : ""}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> MRZ OK
                  </span>
                  {hasWP && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-1.5 py-0.5 rounded-full">
                      <FileText className="w-3 h-3" /> WP
                    </span>
                  )}
                  {item.photoPreviewUrl && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-1.5 py-0.5 rounded-full">
                      <Camera className="w-3 h-3" /> Photo
                    </span>
                  )}
                  {editedCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                      <Pencil className="w-3 h-3" /> {editedCount} edit{editedCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>

            {/* Card footer strip */}
            <div className="px-4 py-2.5 bg-black/20 border-t border-white/[0.04] flex items-center gap-6">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5 font-semibold">DOB</p>
                <p className="text-xs text-white/70 font-medium">{item.passportData?.date_of_birth || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5 font-semibold">Expiry</p>
                <p className="text-xs text-white/70 font-medium">{item.passportData?.expiry_date || "—"}</p>
              </div>
              <div className="flex-1" />
              <p className="text-[10px] text-white/25 font-medium">Tap to review →</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Detail / edit view ── */
  const renderDetail = () => {
    if (!selectedItem) return null;
    const passportEntries = Object.entries(selectedItem.passportData || {});
    const wpEntries = Object.entries(selectedItem.workPermitData || {});
    const hasWP = wpEntries.length > 0;
    const orig = originals[selectedItem.id] || {};

    return (
      <div className="flex flex-col gap-4 animate-slide-up">
        {/* Back */}
        <button
          onClick={() => setSelectedId(null)}
          className="text-[var(--accent)] text-sm font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          All applicants
        </button>

        {/* Header card */}
        <div className="bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent border border-[var(--accent)]/20 rounded-[22px] p-4 flex items-center gap-4">
          {selectedItem.photoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedItem.photoPreviewUrl}
              alt="photo"
              className="w-16 h-20 rounded-xl object-cover border border-white/15 shadow-lg"
            />
          ) : (
            <div className="w-16 h-20 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center">
              <User className="w-8 h-8 text-[var(--accent)]/60" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight truncate font-['Outfit']">
              {selectedItem.passportData?.first_name} {selectedItem.passportData?.surname}
            </h3>
            <p className="text-white/50 text-sm mt-0.5">{selectedItem.passportData?.passport_number}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-semibold">MRZ Verified</span>
            </div>
          </div>
        </div>

        {/* Edit hint */}
        <div className="flex items-center gap-2 bg-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-2xl px-4 py-2.5">
          <Pencil className="w-3.5 h-3.5 text-[var(--accent)]/70 flex-shrink-0" />
          <p className="text-[12px] text-white/50 leading-snug">
            <span className="text-[var(--accent)]/80 font-semibold">Tap any field to edit</span> — changes are saved instantly before submission.
          </p>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 bg-black/30 border border-white/[0.06] rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("passport")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "passport"
                ? "bg-[var(--accent)] text-white shadow-[var(--accent-glow)]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <User className="w-4 h-4" /> Passport
          </button>
          <button
            onClick={() => setActiveTab("workpermit")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "workpermit"
                ? "bg-[var(--accent)] text-white shadow-[var(--accent-glow)]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <FileText className="w-4 h-4" /> Work Permit
          </button>
        </div>

        {/* Passport fields */}
        {activeTab === "passport" && (
          <div className="bg-[rgba(255,255,255,0.03)] border border-white/[0.08] rounded-[22px] p-5 backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-wider text-[var(--accent)] font-bold pb-3 mb-1 border-b border-white/[0.06] flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Passport Data
            </div>
            {passportEntries.map(([key, val]) => (
              <EditableField
                key={key}
                label={PASSPORT_LABELS[key] || key.replace(/_/g, " ")}
                value={val as string}
                originalValue={orig.passportData?.[key] ?? (val as string)}
                onChange={(newVal) => updatePassportField(selectedItem.id, key, newVal)}
              />
            ))}
          </div>
        )}

        {/* Work permit fields */}
        {activeTab === "workpermit" && (
          <>
            {hasWP ? (
              <div className="bg-[rgba(255,255,255,0.03)] border border-white/[0.08] rounded-[22px] p-5 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold pb-3 mb-1 border-b border-white/[0.06] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Work Permit Data
                </div>
                {wpEntries.map(([key, val]) => (
                  <EditableField
                    key={key}
                    label={WP_LABELS[key] || key.replace(/_/g, " ")}
                    value={val as string}
                    originalValue={orig.workPermitData?.[key] ?? (val as string)}
                    onChange={(newVal) => updateWorkPermitField(selectedItem.id, key, newVal)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-amber-400/[0.04] border border-amber-400/20 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400/60" />
                <div>
                  <p className="text-amber-400/90 font-semibold text-sm">No work permit data</p>
                  <p className="text-white/30 text-xs mt-1">No work permit was uploaded or extracted for this applicant.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 font-['Outfit'] tracking-tight">Review</h2>
          <p className="text-sm text-white/50">
            {selectedId
              ? "Verify & edit extracted data"
              : `${extracted.length} applicant${extracted.length !== 1 ? "s" : ""} ready`}
          </p>
        </div>
        {!selectedId && (
          <button
            onClick={onClear}
            className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors active:scale-95"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable content — pb-28 clears the fixed bottom nav */}
      <div className="flex-1 overflow-y-auto pb-28 -mx-4 px-4">
        {!selectedId ? renderList() : renderDetail()}
      </div>

      {/* Sticky bottom — only on list view */}
      {!selectedId && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#050507]/90 backdrop-blur-xl border-t border-white/10 p-4 pb-safe z-50">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 rounded-2xl font-bold text-[15px] bg-[var(--accent)] text-white flex items-center justify-center gap-2 shadow-[var(--accent-glow)] hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.97]"
            >
              <Zap className="w-5 h-5 fill-white" /> Auto Submit to ROP
            </button>
            <p className="text-center text-[11px] text-white/25 mt-2">
              Review each applicant above before submitting
            </p>
          </div>
        </div>
      )}

      <AutoSubmitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        applicants={extracted.map((item: any) => ({
          data: {
            ...item.passportData,
            ...item.workPermitData,
            _passportImageUrl: item.passportImageDataUrl,
            _workPermitImageUrl: item.workPermitImageDataUrl,
            _photoFile: item.photoFile,
            _photoPreviewUrl: item.photoPreviewUrl || "",
            _photoDataUrl: item.photoDataUrl || item.photoPreviewUrl || "",
            _name: `${item.passportData?.first_name} ${item.passportData?.surname}`.trim(),
          },
        }))}
        portalId=""
      />
    </div>
  );
}
