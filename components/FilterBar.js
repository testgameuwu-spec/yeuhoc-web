'use client';

import { Search, X } from 'lucide-react';

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const EXAM_TYPES = [
  { key: 'THPT', label: 'THPT QG' },
  { key: 'HSA', label: 'HSA' },
  { key: 'TSA', label: 'TSA' },
  { key: 'Other', label: 'Khác' },
];

const SUBJECTS = [
  'Toán', 'Vật Lý', 'Hoá Học', 'Tiếng Anh',
  'Tư duy định lượng', 'Tư duy định tính', 'Khác',
];

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 whitespace-nowrap cursor-pointer
        ${active
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
          : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600'
        }
      `}
    >
      {label}
    </button>
  );
}

function FilterRow({ label, children }) {
  return (
    <div className="flex items-start gap-4">
      <span className="min-w-[72px] pt-1.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <div className="flex flex-nowrap sm:flex-wrap gap-2 flex-1 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
        {children}
      </div>
    </div>
  );
}

export default function FilterBar({
  search, onSearch,
  selYear, onYear,
  selType, onType,
  selSubject, onSubject,
  resultCount, totalCount,
  onClear,
}) {
  const hasFilter = selYear || selType || selSubject || search;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Tìm theo tên đề thi..."
          className="
            w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
            bg-gray-50 border border-gray-200 text-gray-900
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white
            transition-all duration-150
          "
        />
      </div>

      <div className="h-px bg-gray-100" />

      {/* Year */}
      <FilterRow label="Năm học">
        {YEARS.map(y => (
          <Chip key={y} label={y} active={selYear === y} onClick={() => onYear(selYear === y ? null : y)} />
        ))}
      </FilterRow>

      <div className="h-px bg-gray-100" />

      {/* Exam type */}
      <FilterRow label="Kì thi">
        {EXAM_TYPES.map(t => (
          <Chip key={t.key} label={t.label} active={selType === t.key} onClick={() => onType(selType === t.key ? null : t.key)} />
        ))}
      </FilterRow>

      <div className="h-px bg-gray-100" />

      {/* Subject */}
      <FilterRow label="Môn học">
        {SUBJECTS.map(s => (
          <Chip key={s} label={s} active={selSubject === s} onClick={() => onSubject(selSubject === s ? null : s)} />
        ))}
      </FilterRow>

      {/* Active filter footer */}
      {hasFilter && (
        <>
          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Đang lọc —{' '}
              <strong className="text-gray-900">{resultCount}</strong> kết quả
            </span>
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
                bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Xoá bộ lọc
            </button>
          </div>
        </>
      )}
    </div>
  );
}
