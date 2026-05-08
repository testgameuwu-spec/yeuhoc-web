'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Play, LockKey } from '@phosphor-icons/react';

const SUBJECT_META = {
  'Toán':               { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe', dark: '#a5b4fc' },
  'Vật Lý':             { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dark: '#93c5fd' },
  'Hoá Học':            { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dark: '#86efac' },
  'Tiếng Anh':          { bg: '#fffbeb', color: '#b45309', border: '#fde68a', dark: '#fcd34d' },
  'Tư duy định lượng':  { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dark: '#c4b5fd' },
  'Tư duy định tính':   { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8', dark: '#f9a8d4' },
  'Khác':               { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dark: '#cbd5e1' },
};

const TYPE_META = {
  THPT:  { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', dark: '#7dd3fc', label: 'THPT QG' },
  HSA:   { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', dark: '#67e8f9', label: 'HSA'     },
  TSA:   { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dark: '#c4b5fd', label: 'TSA'     },
  Other: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dark: '#cbd5e1', label: 'Khác'    },
};

const QUESTION_META = {
  MCQ: { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', dark: '#a5b4fc' },
  TF:  { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dark: '#c4b5fd' },
  SA:  { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', dark: '#67e8f9' },
};

const QUESTION_LABEL = {
  MCQ: 'Trắc Nghiệm',
  TF: 'Đúng/Sai',
  SA: 'Trả lời ngắn',
};

function getBadgeStyle(meta) {
  return {
    '--home-badge-bg': meta.bg,
    '--home-badge-border': meta.border,
    '--home-badge-color': meta.color,
    '--home-badge-dark-color': meta.dark,
  };
}

function QBadge({ label, tone }) {
  return (
    <span
      className="home-theme-badge rounded border px-1.5 py-0.5 text-[10px] font-bold"
      style={getBadgeStyle(QUESTION_META[tone])}
    >
      {label}
    </span>
  );
}

export default function ExamCard({ exam, onStart, href, isSaved, isLocked }) {
  const [hov, setHov] = useState(false);
  const sm = SUBJECT_META[exam.subject] || SUBJECT_META['Khác'];
  const tm = TYPE_META[exam.examType]   || TYPE_META['Other'];

  // Compute question type counts from questions array if breakdown not provided
  const mcqCount = exam.mcq ?? (exam.questions || []).filter(q => q.type === 'MCQ').length;
  const tfCount = exam.tf ?? (exam.questions || []).filter(q => q.type === 'TF').length;
  const saCount = exam.sa ?? (exam.questions || []).filter(q => q.type === 'SA').length;
  const totalQ = exam.totalQ || (exam.questions || []).length || 0;

  const cardClassName = `
    home-box bg-white rounded-2xl border flex flex-col gap-3.5 p-5
    transition-all duration-200 no-underline
    ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
    ${hov && !isLocked
      ? 'border-indigo-300 shadow-lg shadow-indigo-100 -translate-y-0.5'
      : 'border-gray-200 shadow-sm'
    }
  `;

  const ctaClassName = `
    flex items-center justify-center gap-2 py-2.5 rounded-xl
    text-sm font-semibold transition-all duration-200 border-0
    ${isLocked
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : isSaved
        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
        : hov
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 cursor-pointer'
          : 'bg-indigo-50 text-indigo-600 cursor-pointer'
    }
  `;

  const content = (
    <>
      {/* Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <span
            className="home-theme-badge rounded-md border px-2 py-0.5 text-[11px] font-bold"
            style={getBadgeStyle(sm)}
          >
            {exam.subject}
          </span>
          <span
            className="home-theme-badge rounded-md border px-2 py-0.5 text-[11px] font-semibold"
            style={getBadgeStyle(tm)}
          >
            {tm.label}
          </span>
        </div>
        <span className="text-xs font-semibold text-gray-300">{exam.year}</span>
      </div>

      {/* Title */}
      <p className="text-sm font-bold font-outfit text-gray-900 leading-snug m-0 break-words">
        {exam.title}
      </p>

      {/* Meta */}
      <div className="flex items-center flex-wrap gap-3">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Clock weight="duotone" className="w-[15px] h-[15px]" /> {exam.duration} phút
        </span>
        <span className="text-xs text-gray-500">{totalQ} câu</span>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {mcqCount > 0 && <QBadge label={`${mcqCount} ${QUESTION_LABEL.MCQ}`} tone="MCQ" />}
          {tfCount  > 0 && <QBadge label={`${tfCount} ${QUESTION_LABEL.TF}`}   tone="TF" />}
          {saCount  > 0 && <QBadge label={`${saCount} ${QUESTION_LABEL.SA}`}   tone="SA" />}
        </div>
      </div>

      {/* CTA */}
      <span className={ctaClassName}>
        {isLocked ? <LockKey weight="duotone" className="w-[15px] h-[15px]" /> : isSaved ? <Clock weight="duotone" className="w-[15px] h-[15px]" /> : <Play weight="fill" className="w-[15px] h-[15px]" />}
        {isLocked ? 'Đã khoá' : isSaved ? 'Tiếp tục làm bài' : 'Làm bài ngay'}
      </span>
    </>
  );

  if (href && !isLocked) {
    return (
      <Link
        href={href}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className={cardClassName}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => {
        if (!isLocked) onStart?.(exam);
      }}
      className={cardClassName}
    >
      {content}
    </div>
  );
}
