'use client';

import { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const EXAM_TYPES = [
  { key: 'THPT', label: 'THPT QG' },
  { key: 'HSA', label: 'HSA' },
  { key: 'TSA', label: 'TSA' },
  { key: 'Other', label: 'Khác' },
];

const SUBJECTS = [
  { key: 'Toán', label: 'Toán' },
  { key: 'Vật Lý', label: 'Vật Lý' },
  { key: 'Hoá Học', label: 'Hoá Học' },
  { key: 'Tiếng Anh', label: 'Tiếng Anh' },
  { key: 'Tư duy định lượng', label: 'Tư duy định lượng' },
  { key: 'Tư duy định tính', label: 'Tư duy định tính' },
  { key: 'Khác', label: 'Khác' },
];

const CHIP_TONES = {
  default: { bg: '#ffffff', color: '#4b5563', border: '#e5e7eb', activeBg: 'var(--home-brand-primary)', activeBorder: 'var(--home-brand-primary)', activeColor: '#ffffff', dark: '#cbd5e1' },
  'Toán': { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe', activeBg: '#4f46e5', activeBorder: '#4f46e5', activeColor: '#ffffff', dark: '#a5b4fc' },
  'Vật Lý': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', activeBg: '#2563eb', activeBorder: '#2563eb', activeColor: '#ffffff', dark: '#93c5fd' },
  'Hoá Học': { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', activeBg: '#059669', activeBorder: '#059669', activeColor: '#ffffff', dark: '#86efac' },
  'Tiếng Anh': { bg: '#fffbeb', color: '#b45309', border: '#fde68a', activeBg: '#d97706', activeBorder: '#d97706', activeColor: '#ffffff', dark: '#fcd34d' },
  'Tư duy định lượng': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', activeBg: '#7c3aed', activeBorder: '#7c3aed', activeColor: '#ffffff', dark: '#c4b5fd' },
  'Tư duy định tính': { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8', activeBg: '#db2777', activeBorder: '#db2777', activeColor: '#ffffff', dark: '#f9a8d4' },
  THPT: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', activeBg: '#0284c7', activeBorder: '#0284c7', activeColor: '#ffffff', dark: '#7dd3fc' },
  HSA: { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', activeBg: '#0891b2', activeBorder: '#0891b2', activeColor: '#ffffff', dark: '#67e8f9' },
  TSA: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', activeBg: '#7c3aed', activeBorder: '#7c3aed', activeColor: '#ffffff', dark: '#c4b5fd' },
  Other: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', activeBg: '#64748b', activeBorder: '#64748b', activeColor: '#ffffff', dark: '#cbd5e1' },
  'Khác': { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', activeBg: '#64748b', activeBorder: '#64748b', activeColor: '#ffffff', dark: '#cbd5e1' },
};

function getChipStyle(toneKey, active = false) {
  const tone = CHIP_TONES[toneKey] || CHIP_TONES.default;

  return {
    '--home-badge-bg': active ? tone.activeBg : tone.bg,
    '--home-badge-border': active ? tone.activeBorder : tone.border,
    '--home-badge-color': active ? tone.activeColor : tone.color,
    '--home-badge-dark-color': tone.dark,
  };
}

function Chip({ label, active, onClick, tone }) {
  return (
    <button
      onClick={onClick}
      className={`
        home-theme-badge rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap cursor-pointer
        transition-all duration-150 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-brand-border)]
      `}
      style={getChipStyle(tone, active)}
    >
      {label}
    </button>
  );
}

function FilterPill({ label, tone }) {
  return (
    <span
      className="home-theme-badge shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={getChipStyle(tone)}
    >
      {label}
    </span>
  );
}

export default function FilterBar({
  search, onSearch,
  selYear, onYear,
  selType, onType,
  selSubject, onSubject,
  resultCount, totalCount,
  onClear,
  sortOrder, onSortOrder,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasFilter = selYear || selType || selSubject || search;

  return (
    <div className="home-box bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Top bar: 2 rows on mobile, 1 row on desktop */}
      <div className="px-4 py-3 border-b border-gray-100">
        {/* Row 1: Filter chips — scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
          <Chip
            label="Tất cả"
            active={!selType && !selSubject && !selYear}
            tone="default"
            onClick={() => { onType(null); onSubject(null); onYear(null); }}
          />
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          {SUBJECTS.slice(0, 4).map(s => (
            <Chip key={s.key} label={s.label} active={selSubject === s.key} tone={s.key} onClick={() => onSubject(selSubject === s.key ? null : s.key)} />
          ))}
          {EXAM_TYPES.map(t => (
            <Chip key={t.key} label={t.label} active={selType === t.key} tone={t.key} onClick={() => onType(selType === t.key ? null : t.key)} />
          ))}
        </div>

        {/* Row 2: Advanced toggle + Sort — always visible, never cut off */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex w-full sm:w-auto items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap
              ${showAdvanced ? 'bg-[var(--home-brand-soft)] border-[var(--home-brand-border)] text-[var(--home-brand-primary)]' : 'bg-white border-gray-200 text-gray-600 hover:border-[var(--home-brand-border)] hover:text-[var(--home-brand-primary)]'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Lọc nâng cao
          </button>

          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2">
            {hasFilter && (
              <span className="text-xs text-[var(--home-brand-primary)] font-medium whitespace-nowrap">{resultCount} kết quả</span>
            )}
            {onSortOrder && (
              <select
                value={sortOrder || 'default'}
                onChange={e => onSortOrder(e.target.value)}
                className="min-w-0 flex-1 sm:flex-none pl-3 pr-8 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 focus:outline-none focus:border-[var(--home-brand-primary)] cursor-pointer appearance-none sm:min-w-[110px]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239aa3b2' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
              >
                <option value="default">Mặc định</option>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="az">A → Z</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Advanced filter panel (collapsible) */}
      {showAdvanced && (
        <div className="home-box home-box-muted px-5 py-4 flex flex-col gap-3 border-b border-gray-100 bg-gray-50 animate-fadeIn">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Tìm theo tên thư mục..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--home-brand-border)] focus:border-[var(--home-brand-primary)] transition-all"
            />
          </div>

          {/* Year row */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-16 shrink-0">Năm</span>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {YEARS.map(y => (
                <Chip key={y} label={String(y)} active={selYear === y} tone="default" onClick={() => onYear(selYear === y ? null : y)} />
              ))}
            </div>
          </div>

          {/* Subject row */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-16 shrink-0">Môn</span>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {SUBJECTS.map(s => (
                <Chip key={s.key} label={s.label} active={selSubject === s.key} tone={s.key} onClick={() => onSubject(selSubject === s.key ? null : s.key)} />
              ))}
            </div>
          </div>

          {/* Clear */}
          {hasFilter && (
            <button
              onClick={onClear}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Xóa bộ lọc ({resultCount}/{totalCount})
            </button>
          )}
        </div>
      )}

      {/* Active filter indicators (inline, minimal) */}
      {hasFilter && !showAdvanced && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2 bg-[var(--home-brand-soft)] border-t border-[var(--home-brand-border)]">
          <span className="shrink-0 text-xs text-[var(--home-brand-primary)] font-medium">Đang lọc:</span>
          {selSubject && <FilterPill label={selSubject} tone={selSubject} />}
          {selType && <FilterPill label={selType} tone={selType} />}
          {selYear && <FilterPill label={selYear} tone="default" />}
          {search && <FilterPill label={`"${search}"`} tone="default" />}
          <span className="shrink-0 text-xs text-[var(--home-brand-primary)] ml-auto font-medium">{resultCount} kết quả</span>
          <button onClick={onClear} className="shrink-0 text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5 transition-colors">
            <X className="w-3 h-3" /> Xóa
          </button>
        </div>
      )}
    </div>
  );
}
