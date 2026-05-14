'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination component with page numbers.
 * @param {number} currentPage - Current page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {string} variant - 'light' (home page) or 'dark' (admin dashboard)
 */
export default function Pagination({ currentPage, totalPages, onPageChange, variant = 'light' }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const delta = 1; // how many pages around current to show

    // Always show first page
    pages.push(1);

    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    if (rangeStart > 2) pages.push('...');

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < totalPages - 1) pages.push('...');

    // Always show last page
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const isDark = variant === 'dark';

  const btnBase = isDark
    ? 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border'
    : 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border';

  const btnActive = isDark
    ? 'bg-indigo-500/30 border-indigo-500/40 text-indigo-300'
    : 'bg-[var(--home-brand-primary)] border-[var(--home-brand-primary)] text-white shadow-sm';

  const btnInactive = isDark
    ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900';

  const btnDisabled = isDark
    ? 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'
    : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed';

  const ellipsisStyle = isDark ? 'text-white/30' : 'text-gray-400';
  const infoStyle = isDark ? 'text-white/30' : 'text-gray-400';

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive} flex items-center gap-1`}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Trước</span>
      </button>

      {/* Page numbers */}
      {getPageNumbers().map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className={`px-2 text-sm ${ellipsisStyle}`}>…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${btnBase} min-w-[36px] ${page === currentPage ? btnActive : btnInactive}`}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive} flex items-center gap-1`}
      >
        <span className="hidden sm:inline">Sau</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Page info */}
      <span className={`w-full sm:w-auto text-center text-xs sm:ml-3 ${infoStyle}`}>
        Trang {currentPage}/{totalPages}
      </span>
    </div>
  );
}
