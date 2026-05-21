'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Check, Search, Filter, ChevronDown } from 'lucide-react';
import type { ScanField, ExtractedData, MappedField } from './page';

interface Props {
  scanFields: ScanField[];
  extractedData: ExtractedData | null;
  onComplete: (fields: MappedField[]) => void;
  onBack: () => void;
}

type TabFilter = 'all' | 'required' | 'optional' | 'unmapped';

/* ── Build source options from extracted data ── */
interface SourceOption {
  key: string;       // e.g. "passport.full_name"
  label: string;     // e.g. "Passport → full_name"
  value: string;     // the extracted value
}

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildSourceOptions(data: ExtractedData | null): SourceOption[] {
  if (!data) return [];
  const opts: SourceOption[] = [];
  Object.entries(data).forEach(([docName, fields]) => {
    const snakeKey = toSnakeCase(docName);
    Object.entries(fields || {}).forEach(([fieldKey, fieldValue]) => {
      opts.push({
        key: `${snakeKey}.${fieldKey}`,
        label: `${docName} → ${fieldKey}`,
        value: String(fieldValue),
      });
    });
  });
  return opts;
}

/* ── Fuzzy match helper for auto-mapping ── */
function computeConfidence(portalLabel: string, sourceLabel: string): number {
  const a = portalLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = sourceLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.85;
  // Check for keyword overlap
  const aWords = portalLabel.toLowerCase().split(/[\s_\-]+/).filter(w => w.length > 2);
  const bWordsArr = sourceLabel.toLowerCase().split(/[\s_\-]+/).filter(w => w.length > 2);
  const bWordsMap: Record<string, boolean> = {};
  bWordsArr.forEach(w => { bWordsMap[w] = true; });
  let overlap = 0;
  aWords.forEach(w => { if (bWordsMap[w]) overlap++; });
  if (overlap > 0) return Math.min(0.7, 0.4 + overlap * 0.15);
  return 0;
}

function autoMapFields(
  scanFields: ScanField[],
  sourceOptions: SourceOption[],
): Record<number, { sourceKey: string | null; confidence: number }> {
  const mapping: Record<number, { sourceKey: string | null; confidence: number }> = {};
  scanFields.forEach((field, idx) => {
    const label = field.label || field.name || field.id || '';
    let bestKey: string | null = null;
    let bestConf = 0;
    sourceOptions.forEach(opt => {
      const conf = computeConfidence(label, opt.key.split('.')[1] || opt.key);
      if (conf > bestConf) {
        bestConf = conf;
        bestKey = opt.key;
      }
    });
    mapping[idx] = { sourceKey: bestConf >= 0.4 ? bestKey : null, confidence: bestConf };
  });
  return mapping;
}

/* ── Subcomponents ── */
function FieldTypeTag({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', padding: '2px 7px', borderRadius: '4px',
      background: 'rgba(96,165,250,0.08)', color: '#60a5fa',
      whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? '#4ade80'
    : confidence >= 0.5 ? '#fbbf24'
    : confidence > 0 ? '#f87171'
    : 'rgba(255,255,255,0.20)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', background: color,
      }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color }}>
        {pct > 0 ? `${pct}%` : '—'}
      </span>
    </span>
  );
}

export default function Step4Review({ scanFields, extractedData, onComplete, onBack }: Props) {
  const sourceOptions = useMemo(() => buildSourceOptions(extractedData), [extractedData]);

  // Auto-map on mount
  const initialMapping = useMemo(
    () => autoMapFields(scanFields, sourceOptions),
    [scanFields, sourceOptions],
  );

  // State: mapping per field index
  const [fieldMappings, setFieldMappings] = useState<
    Record<number, { sourceKey: string | null; confidence: number }>
  >(initialMapping);

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const setSourceForField = useCallback((idx: number, sourceKey: string | null) => {
    setFieldMappings(prev => ({
      ...prev,
      [idx]: { sourceKey, confidence: sourceKey ? 1.0 : 0 },
    }));
  }, []);

  // Filtered fields
  const filteredFields = useMemo(() => {
    return scanFields
      .map((f, i) => ({ field: f, idx: i }))
      .filter(({ field, idx }) => {
        // Tab filter
        if (activeTab === 'required' && !field.required) return false;
        if (activeTab === 'optional' && field.required) return false;
        if (activeTab === 'unmapped' && fieldMappings[idx]?.sourceKey) return false;
        // Search filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const label = (field.label || field.name || field.id || '').toLowerCase();
          if (!label.includes(q)) return false;
        }
        return true;
      });
  }, [scanFields, activeTab, searchQuery, fieldMappings]);

  // Stats
  const totalMapped = Object.values(fieldMappings).filter(m => m.sourceKey).length;
  const totalUnmapped = scanFields.length - totalMapped;

  const handleSave = useCallback(() => {
    const mapped: MappedField[] = scanFields.map((field, idx) => {
      const mapping = fieldMappings[idx] || { sourceKey: null, confidence: 0 };
      return {
        portal_selector: field.selector,
        portal_label: field.label || field.name || field.id || '',
        field_type: field.type,
        source_key: mapping.sourceKey,
        fill_method: 'value' as const,
        required: field.required,
        sort_order: field.sort_order,
        review_status: 'approved' as const,
        confidence: mapping.confidence,
      };
    });
    onComplete(mapped);
  }, [scanFields, fieldMappings, onComplete]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: scanFields.length },
    { key: 'required', label: 'Required', count: scanFields.filter(f => f.required).length },
    { key: 'optional', label: 'Optional', count: scanFields.filter(f => !f.required).length },
    { key: 'unmapped', label: 'Unmapped', count: totalUnmapped },
  ];

  return (
    <div className="animate-card-appear">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '24px', fontWeight: 800,
          fontFamily: "'Outfit', 'Inter', sans-serif", margin: '0 0 8px',
        }}>
          Review Field Mapping
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.7 }}>
          {totalMapped} of {scanFields.length} fields mapped • {totalUnmapped} unmapped
        </p>
      </div>

      {/* Filter tabs + search */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', gap: '12px', flexWrap: 'wrap',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === tab.key ? '#7c5cfc' : 'transparent',
                color: activeTab === tab.key ? '#ffffff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {tab.label} <span style={{ opacity: 0.7 }}>({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{
            position: 'absolute', left: '10px', top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.30)',
          }} />
          <input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', background: '#111111',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px',
              padding: '7px 10px 7px 32px', color: '#ffffff', fontSize: '13px',
              outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#7c5cfc'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px', overflow: 'hidden', marginBottom: '24px',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 70px 1.5fr 1fr 70px',
          gap: '8px', padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'rgba(255,255,255,0.30)',
        }}>
          <span>Portal Field</span>
          <span>Type</span>
          <span>Source</span>
          <span>Preview</span>
          <span>Conf.</span>
        </div>

        {/* Scrollable body */}
        <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
          {filteredFields.length === 0 && (
            <div style={{
              padding: '40px', textAlign: 'center',
              color: 'rgba(255,255,255,0.30)', fontSize: '13px',
            }}>
              <Filter size={20} style={{ margin: '0 auto 8px', display: 'block' }} />
              No fields match this filter
            </div>
          )}
          {filteredFields.map(({ field, idx }) => {
            const mapping = fieldMappings[idx] || { sourceKey: null, confidence: 0 };
            const selectedSource = sourceOptions.find(s => s.key === mapping.sourceKey);
            const previewValue = selectedSource?.value || field.value || '';

            return (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 70px 1.5fr 1fr 70px',
                gap: '8px', padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                alignItems: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#111111'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                {/* Portal field label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 500, color: '#ffffff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {field.label || field.name || field.id || '(unlabeled)'}
                  </span>
                  {field.required && (
                    <span style={{ color: '#f87171', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>*</span>
                  )}
                </div>

                {/* Type */}
                <FieldTypeTag type={field.type} />

                {/* Source dropdown */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={mapping.sourceKey || ''}
                    onChange={e => setSourceForField(idx, e.target.value || null)}
                    style={{
                      width: '100%', appearance: 'none',
                      background: '#111111',
                      border: `1px solid ${mapping.sourceKey ? 'rgba(74,222,128,0.20)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '6px',
                      padding: '6px 28px 6px 10px', color: '#ffffff', fontSize: '12px',
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <option value="">— Not mapped —</option>
                    {sourceOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{
                    position: 'absolute', right: '8px', top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                    color: 'rgba(255,255,255,0.30)',
                  }} />
                </div>

                {/* Preview value */}
                <span style={{
                  fontSize: '12px', color: previewValue ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.20)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {previewValue || '—'}
                </span>

                {/* Confidence */}
                <ConfidenceBadge confidence={mapping.confidence} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button
          className="btn-friendly"
          onClick={handleSave}
          style={{
            fontSize: '15px', padding: '14px 32px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <Check size={18} />
          Save Portal
        </button>
      </div>
    </div>
  );
}
