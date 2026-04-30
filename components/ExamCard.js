'use client';

import { useState } from 'react';
import { Clock, Play, Lock } from 'lucide-react';

const SUBJECT_META = {
  'Toán':               { color: 'text-indigo-700',  bg: 'bg-indigo-50'  },
  'Vật Lý':             { color: 'text-blue-700',    bg: 'bg-blue-50'    },
  'Hoá Học':            { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'Tiếng Anh':          { color: 'text-amber-700',   bg: 'bg-amber-50'   },
  'Tư duy định lượng':  { color: 'text-violet-700',  bg: 'bg-violet-50'  },
  'Tư duy định tính':   { color: 'text-pink-700',    bg: 'bg-pink-50'    },
  'Khác':               { color: 'text-gray-600',    bg: 'bg-gray-100'   },
};

const TYPE_META = {
  THPT:  { color: 'text-indigo-700', bg: 'bg-indigo-50',  label: 'THPT QG' },
  HSA:   { color: 'text-sky-700',    bg: 'bg-sky-50',     label: 'HSA'     },
  TSA:   { color: 'text-violet-700', bg: 'bg-violet-50',  label: 'TSA'     },
  Other: { color: 'text-gray-600',   bg: 'bg-gray-100',   label: 'Khác'    },
};

function QBadge({ label, className }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${className}`}>
      {label}
    </span>
  );
}

export default function ExamCard({ exam, onStart, isSaved, isLocked }) {
  const [hov, setHov] = useState(false);
  const sm = SUBJECT_META[exam.subject] || SUBJECT_META['Khác'];
  const tm = TYPE_META[exam.examType]   || TYPE_META['Other'];

  // Compute question type counts from questions array if breakdown not provided
  const mcqCount = exam.mcq ?? (exam.questions || []).filter(q => q.type === 'MCQ').length;
  const tfCount = exam.tf ?? (exam.questions || []).filter(q => q.type === 'TF').length;
  const saCount = exam.sa ?? (exam.questions || []).filter(q => q.type === 'SA').length;
  const totalQ = exam.totalQ || (exam.questions || []).length || 0;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`
        bg-white rounded-2xl border flex flex-col gap-3.5 p-5
        transition-all duration-200 cursor-pointer
        ${hov
          ? 'border-indigo-300 shadow-lg shadow-indigo-100 -translate-y-0.5'
          : 'border-gray-200 shadow-sm'
        }
      `}
    >
      {/* Badges */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${sm.bg} ${sm.color}`}>
            {exam.subject}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${tm.bg} ${tm.color}`}>
            {tm.label}
          </span>
        </div>
        <span className="text-xs font-semibold text-gray-300">{exam.year}</span>
      </div>

      {/* Title */}
      <p className="text-sm font-bold text-gray-900 leading-snug m-0">
        {exam.title}
      </p>

      {/* Meta */}
      <div className="flex items-center flex-wrap gap-3">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" /> {exam.duration} phút
        </span>
        <span className="text-xs text-gray-500">{totalQ} câu</span>
        <div className="flex gap-1.5 ml-auto">
          {mcqCount > 0 && <QBadge label={`${mcqCount} MCQ`} className="bg-indigo-100 text-indigo-700" />}
          {tfCount  > 0 && <QBadge label={`${tfCount} TF`}   className="bg-violet-100 text-violet-700" />}
          {saCount  > 0 && <QBadge label={`${saCount} SA`}   className="bg-cyan-100 text-cyan-700" />}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={(e) => {
          if (isLocked) {
            e.preventDefault();
            return;
          }
          onStart?.(exam);
        }}
        disabled={isLocked}
        className={`
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
        `}
      >
        {isLocked ? <Lock className="w-3.5 h-3.5" /> : isSaved ? <Clock className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        {isLocked ? 'Đã khoá' : isSaved ? 'Tiếp tục làm bài' : 'Làm bài ngay'}
      </button>
    </div>
  );
}
