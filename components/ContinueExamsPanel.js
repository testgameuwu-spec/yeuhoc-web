'use client';

import Link from 'next/link';
import { BookOpen, Clock, Loader2, PlayCircle } from 'lucide-react';

const CONTINUE_BADGES = {
  practice: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dark: '#86efac' },
  exam: { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe', dark: '#a5b4fc' },
  count: { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe', dark: '#a5b4fc' },
};

const EXAM_TYPE_BADGES = {
  THPT: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', dark: '#7dd3fc' },
  HSA: { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', dark: '#67e8f9' },
  TSA: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dark: '#c4b5fd' },
  Other: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dark: '#cbd5e1' },
};

function getBadgeStyle(meta) {
  return {
    '--home-badge-bg': meta.bg,
    '--home-badge-border': meta.border,
    '--home-badge-color': meta.color,
    '--home-badge-dark-color': meta.dark,
  };
}

function formatContinueTime(value) {
  if (!value) return 'Chưa rõ thời gian';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Chưa rõ thời gian';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContinueExamsPanel({
  items,
  loading,
  title = 'Tiếp tục làm bài',
  description = 'Các đề bạn chưa làm xong:',
  emptyText = 'Chưa có bài đang làm.',
  listClassName = 'mt-3.5 max-h-[320px] xl:max-h-[520px] overflow-y-auto pr-1 space-y-2.5',
}) {
  return (
    <section className="home-box bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-gray-950">{title}</h2>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">{description}</p>
        </div>
        {items.length > 0 && (
          <span
            className="home-theme-badge shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold"
            style={getBadgeStyle(CONTINUE_BADGES.count)}
          >
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải...
        </div>
      ) : items.length > 0 ? (
        <div className={listClassName}>
          {items.map((item) => (
            <ContinueExamItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="home-box home-box-muted mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm font-medium text-gray-500">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function ContinueExamItem({ item }) {
  const isPractice = item.mode === 'practice';
  const badgeStyle = getBadgeStyle(isPractice ? CONTINUE_BADGES.practice : CONTINUE_BADGES.exam);
  const examTypeStyle = getBadgeStyle(EXAM_TYPE_BADGES[item.examType] || EXAM_TYPE_BADGES.Other);
  const Icon = isPractice ? BookOpen : Clock;

  return (
    <Link
      href={item.href}
      prefetch={false}
      className="home-box group block rounded-xl border border-gray-100 bg-white p-3.5 transition-all hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-sm"
    >
      <div className="flex flex-col gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="home-theme-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
              style={badgeStyle}
            >
              <Icon className="w-3.5 h-3.5" />
              {isPractice ? 'Đề ôn luyện' : 'Bài thi thật'}
            </span>
            {item.examType && (
              <span
                className="home-theme-badge rounded-full border px-2.5 py-1 text-[11px] font-bold"
                style={examTypeStyle}
              >
                {item.examType}
              </span>
            )}
          </div>
          <h3 className="mt-2 truncate text-sm font-bold text-gray-950 group-hover:text-indigo-700">
            {item.title}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-gray-500">
            {item.subject || 'Không rõ môn'} · {item.progressText}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
          <span className="truncate">{formatContinueTime(item.updatedAt)}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-bold text-indigo-600">
            Tiếp tục
            <PlayCircle className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
