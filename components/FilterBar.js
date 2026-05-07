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

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer border
        ${active
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
          : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
        }
      `}
    >
      {label}
    </button>
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
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Top bar: 2 rows on mobile, 1 row on desktop */}
      <div className="px-4 py-3 border-b border-gray-100">
        {/* Row 1: Filter chips — scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
          <Chip
            label="Tất cả"
            active={!selType && !selSubject && !selYear}
            onClick={() => { onType(null); onSubject(null); onYear(null); }}
          />
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          {SUBJECTS.slice(0, 4).map(s => (
            <Chip key={s.key} label={s.label} active={selSubject === s.key} onClick={() => onSubject(selSubject === s.key ? null : s.key)} />
          ))}
          {EXAM_TYPES.map(t => (
            <Chip key={t.key} label={t.label} active={selType === t.key} onClick={() => onType(selType === t.key ? null : t.key)} />
          ))}
        </div>

        {/* Row 2: Advanced toggle + Sort — always visible, never cut off */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap
              ${showAdvanced ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Lọc nâng cao
          </button>

          <div className="flex items-center gap-2">
            {hasFilter && (
              <span className="text-xs text-indigo-500 font-medium whitespace-nowrap">{resultCount} kết quả</span>
            )}
            {onSortOrder && (
              <select
                value={sortOrder || 'default'}
                onChange={e => onSortOrder(e.target.value)}
                className="pl-3 pr-8 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 focus:outline-none focus:border-indigo-400 cursor-pointer appearance-none min-w-[110px]"
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
        <div className="px-5 py-4 flex flex-col gap-3 border-b border-gray-100 bg-gray-50 animate-fadeIn">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Tìm theo tên đề thi..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
          </div>

          {/* Year row */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-16 shrink-0">Năm</span>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {YEARS.map(y => (
                <Chip key={y} label={String(y)} active={selYear === y} onClick={() => onYear(selYear === y ? null : y)} />
              ))}
            </div>
          </div>

          {/* Subject row */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-16 shrink-0">Môn</span>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {SUBJECTS.map(s => (
                <Chip key={s.key} label={s.label} active={selSubject === s.key} onClick={() => onSubject(selSubject === s.key ? null : s.key)} />
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
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-t border-indigo-100">
          <span className="text-xs text-indigo-600 font-medium">Đang lọc:</span>
          {selSubject && <span className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{selSubject}</span>}
          {selType && <span className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{selType}</span>}
          {selYear && <span className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{selYear}</span>}
          {search && <span className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{`"${search}"`}</span>}
          <span className="text-xs text-indigo-500 ml-auto font-medium">{resultCount} kết quả</span>
          <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5 transition-colors">
            <X className="w-3 h-3" /> Xóa
          </button>
        </div>
      )}
    </div>
  );
}
