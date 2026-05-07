'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  Award,
  BarChart2,
  BookOpen,
  Brain,
  ChevronRight,
  History,
  Home,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Lock,
  Menu,
  Shield,
  Sparkles,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import LogoIcon from '@/components/LogoIcon';
import { supabase } from '@/lib/supabase';

const SCORE_MAX = 10;
const THPT_SUBJECT_ORDER = ['Toán', 'Lý', 'Hóa', 'Sinh', 'Anh'];
const APTITUDE_EXAM_ORDER = ['HSA', 'TSA'];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function roundScore(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function normalizeScore(attempt) {
  const rawScore = Number(attempt?.score);
  if (Number.isFinite(rawScore) && rawScore <= SCORE_MAX) {
    return Math.min(SCORE_MAX, Math.max(0, rawScore));
  }

  const correct = Number(attempt?.correct_answers);
  const total = Number(attempt?.total_questions);
  if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
    return Math.min(SCORE_MAX, Math.max(0, (correct / total) * SCORE_MAX));
  }

  return 0;
}

function normalizeAttempt(attempt) {
  const exam = Array.isArray(attempt.exams) ? attempt.exams[0] : attempt.exams;
  const createdAt = attempt.created_at ? new Date(attempt.created_at) : null;
  return {
    id: attempt.id,
    title: exam?.title || 'Đề thi',
    subject: exam?.subject || 'Không rõ',
    examType: exam?.exam_type || 'Không rõ',
    year: exam?.year || '',
    score: roundScore(normalizeScore(attempt)),
    correctAnswers: Number(attempt.correct_answers) || 0,
    totalQuestions: Number(attempt.total_questions) || 0,
    timeSpent: Number(attempt.time_spent) || 0,
    createdAt,
    createdAtValue: createdAt?.getTime() || 0,
  };
}

function isHsaAttempt(attempt) {
  return getAptitudeExamLabel(attempt) === 'HSA';
}

function getAptitudeExamLabel(attempt) {
  const text = normalizeText(`${attempt.examType} ${attempt.title}`);
  if (/\bhsa\b/.test(text)) return 'HSA';
  if (/\btsa\b/.test(text)) return 'TSA';
  return null;
}

function getKnownThptSubjectLabel(subject) {
  const text = normalizeText(subject);
  if (/\b(toan|math)\b/.test(text)) return 'Toán';
  if (/\b(vat ly|vat li|ly|li|physics)\b/.test(text)) return 'Lý';
  if (/\b(hoa hoc|hoa|chemistry|chem)\b/.test(text)) return 'Hóa';
  if (/\b(sinh hoc|sinh|biology|bio)\b/.test(text)) return 'Sinh';
  if (/\b(tieng anh|anh van|english|anh)\b/.test(text)) return 'Anh';
  return null;
}

function getThptSubjectLabel(subject) {
  return getKnownThptSubjectLabel(subject) || subject || 'Không rõ';
}

function isThptAttempt(attempt) {
  if (getAptitudeExamLabel(attempt)) return false;
  const text = normalizeText(`${attempt.examType} ${attempt.title}`);
  return (
    /\bthpt\b/.test(text)
    || text.includes('quoc gia')
    || text.includes('tot nghiep')
    || Boolean(getKnownThptSubjectLabel(attempt.subject))
  );
}

function sortThptSubjectStats(stats) {
  return [...stats].sort((a, b) => {
    const aIndex = THPT_SUBJECT_ORDER.indexOf(a.name);
    const bIndex = THPT_SUBJECT_ORDER.indexOf(b.name);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.name.localeCompare(b.name, 'vi');
  });
}

function sortAptitudeExamStats(stats) {
  return [...stats].sort((a, b) => {
    const aIndex = APTITUDE_EXAM_ORDER.indexOf(a.name);
    const bIndex = APTITUDE_EXAM_ORDER.indexOf(b.name);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.name.localeCompare(b.name, 'vi');
  });
}

function groupAttempts(attempts, getName) {
  const groups = new Map();
  attempts.forEach((attempt) => {
    const name = getName(attempt) || 'Không rõ';
    const current = groups.get(name) || { name, attempts: [], scores: [] };
    current.attempts.push(attempt);
    current.scores.push(attempt.score);
    groups.set(name, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      name: group.name,
      count: group.attempts.length,
      averageScore: roundScore(average(group.scores)),
      latestScore: roundScore(group.attempts.sort((a, b) => b.createdAtValue - a.createdAtValue)[0]?.score || 0),
    }))
    .sort((a, b) => b.averageScore - a.averageScore);
}

function computeTrend(chronologicalAttempts) {
  if (chronologicalAttempts.length < 2) {
    return { key: 'insufficient', label: 'Cần thêm dữ liệu', delta: 0 };
  }

  const recentSize = Math.min(3, Math.floor(chronologicalAttempts.length / 2) || 1);
  const recent = chronologicalAttempts.slice(-recentSize);
  const previous = chronologicalAttempts.slice(-recentSize * 2, -recentSize);
  const baseline = previous.length ? previous : chronologicalAttempts.slice(0, recentSize);
  const delta = average(recent.map((attempt) => attempt.score)) - average(baseline.map((attempt) => attempt.score));

  if (Math.abs(delta) < 0.35) return { key: 'stable', label: 'Ổn định', delta: roundScore(delta) };
  if (delta > 0) return { key: 'up', label: 'Đang tăng', delta: roundScore(delta) };
  return { key: 'down', label: 'Đang giảm', delta: roundScore(delta) };
}

function computeHsaPrediction(hsaAttempts) {
  if (!hsaAttempts.length) return null;

  const recent = hsaAttempts.slice(0, 5);
  const weights = recent.map((_, index) => recent.length - index);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const predictedScore = recent.reduce((sum, attempt, index) => sum + attempt.score * weights[index], 0) / weightTotal;
  const scores = recent.map((attempt) => attempt.score);
  const avgScore = average(scores);
  const variance = average(scores.map((score) => (score - avgScore) ** 2));
  const standardDeviation = Math.sqrt(variance);
  const confidence = Math.min(95, Math.round(45 + recent.length * 10 + (standardDeviation <= 1 ? 10 : 0)));

  return {
    score: roundScore(predictedScore),
    count: hsaAttempts.length,
    stability: standardDeviation < 0.75 ? 'Rất ổn định' : standardDeviation < 1.5 ? 'Ổn định' : 'Dao động',
    confidence,
  };
}

function buildStats(attempts) {
  const sortedDesc = [...attempts].sort((a, b) => b.createdAtValue - a.createdAtValue);
  const chronological = [...attempts].sort((a, b) => a.createdAtValue - b.createdAtValue);
  const subjectStats = groupAttempts(sortedDesc, (attempt) => attempt.subject);
  const examTypeStats = groupAttempts(sortedDesc, (attempt) => attempt.examType);
  const thptAttempts = sortedDesc.filter(isThptAttempt);
  const aptitudeAttempts = sortedDesc.filter((attempt) => Boolean(getAptitudeExamLabel(attempt)));
  const thptSubjectStats = sortThptSubjectStats(groupAttempts(thptAttempts, (attempt) => getThptSubjectLabel(attempt.subject)));
  const aptitudeExamStats = sortAptitudeExamStats(groupAttempts(aptitudeAttempts, (attempt) => getAptitudeExamLabel(attempt)));
  const weakestSubject = [...subjectStats].sort((a, b) => a.averageScore - b.averageScore)[0] || null;
  const weakestExamType = [...examTypeStats].sort((a, b) => a.averageScore - b.averageScore)[0] || null;
  const weakestThptSubject = [...thptSubjectStats].sort((a, b) => a.averageScore - b.averageScore)[0] || null;
  const weakestAptitudeExam = [...aptitudeExamStats].sort((a, b) => a.averageScore - b.averageScore)[0] || null;
  const hsaAttempts = sortedDesc.filter(isHsaAttempt);

  return {
    totalAttempts: sortedDesc.length,
    averageScore: roundScore(average(sortedDesc.map((attempt) => attempt.score))),
    highestScore: roundScore(Math.max(0, ...sortedDesc.map((attempt) => attempt.score))),
    averageTimeMinutes: roundScore(average(sortedDesc.map((attempt) => attempt.timeSpent)) / 60),
    subjectStats,
    examTypeStats,
    thptSubjectStats,
    aptitudeExamStats,
    thptAttemptCount: thptAttempts.length,
    aptitudeAttemptCount: aptitudeAttempts.length,
    weakestSubject,
    weakestExamType,
    weakestThptSubject,
    weakestAptitudeExam,
    recentAttempts: sortedDesc.slice(0, 5),
    historyAttempts: chronological.slice(-12),
    trend: computeTrend(chronological),
    hsaPrediction: computeHsaPrediction(hsaAttempts),
  };
}

function buildFallbackSuggestions(stats) {
  if (!stats.totalAttempts) return [];

  const suggestions = [];
  if (stats.totalAttempts < 3) {
    suggestions.push('Làm thêm ít nhất 2-3 đề để hệ thống nhận diện xu hướng điểm rõ hơn.');
  }

  if (stats.weakestThptSubject) {
    suggestions.push(`Ưu tiên ôn ${stats.weakestThptSubject.name} cho THPT Quốc gia; điểm trung bình hiện là ${stats.weakestThptSubject.averageScore}/10.`);
  }

  if (stats.weakestAptitudeExam) {
    suggestions.push(`Với nhóm HSA/TSA, nên tập trung ${stats.weakestAptitudeExam.name}; điểm trung bình hiện là ${stats.weakestAptitudeExam.averageScore}/10.`);
  }

  if (!stats.weakestThptSubject && !stats.weakestAptitudeExam && stats.weakestSubject) {
    suggestions.push(`Ưu tiên ôn ${stats.weakestSubject.name}; điểm trung bình hiện là ${stats.weakestSubject.averageScore}/10.`);
  }

  if (stats.trend.key === 'down') {
    suggestions.push('Điểm gần đây đang giảm; hãy xem lại lỗi sai trong 3 bài mới nhất trước khi làm đề mới.');
  } else if (stats.trend.key === 'up') {
    suggestions.push('Xu hướng điểm đang tăng; tiếp tục luyện đề cùng loại để giữ nhịp tiến bộ.');
  }

  if (!stats.hsaPrediction) {
    suggestions.push('Nếu mục tiêu là HSA, hãy làm vài đề HSA để có dự đoán điểm chính xác hơn.');
  }

  if (stats.averageTimeMinutes > 0) {
    suggestions.push(`Thời gian trung bình mỗi bài khoảng ${stats.averageTimeMinutes} phút; hãy đặt mục tiêu rút ngắn 5-10%.`);
  }

  return suggestions.slice(0, 5);
}

function buildAiSummary(stats) {
  return {
    totalAttempts: stats.totalAttempts,
    averageScore: stats.averageScore,
    highestScore: stats.highestScore,
    averageTimeMinutes: stats.averageTimeMinutes,
    trend: stats.trend.key,
    weakestSubject: stats.weakestSubject
      ? {
          subject: stats.weakestSubject.name,
          averageScore: stats.weakestSubject.averageScore,
          attempts: stats.weakestSubject.count,
        }
      : null,
    weakestExamType: stats.weakestExamType?.name || '',
    subjects: stats.subjectStats.map((subject) => ({
      subject: subject.name,
      averageScore: subject.averageScore,
      attempts: subject.count,
    })),
    thptSubjects: stats.thptSubjectStats.map((subject) => ({
      subject: subject.name,
      averageScore: subject.averageScore,
      attempts: subject.count,
    })),
    aptitudeExams: stats.aptitudeExamStats.map((exam) => ({
      examType: exam.name,
      averageScore: exam.averageScore,
      attempts: exam.count,
    })),
    recentAttempts: stats.recentAttempts.map((attempt) => ({
      title: attempt.title,
      subject: attempt.subject,
      examType: attempt.examType,
      score: attempt.score,
      date: attempt.createdAt ? attempt.createdAt.toISOString().slice(0, 10) : '',
      timeSpentMinutes: roundScore(attempt.timeSpent / 60),
    })),
  };
}

function formatDateTime(date) {
  if (!date) return '--';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMinutes(seconds) {
  if (!seconds) return '--';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}p ${rest}s`;
}

function Card({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-sm font-medium text-slate-500 sm:text-base">
      {children}
    </div>
  );
}

function AnalysisSidebar({ isAdmin, profile, mobileOpen, onClose }) {
  const items = [
    { label: 'Dashboard', icon: LayoutDashboard, disabled: true },
    { label: 'Đề thi', icon: BookOpen, href: '/' },
    { label: 'Phân tích', icon: BarChart2, href: '/profile/phan-tich', active: true },
    { label: 'Xếp hạng', icon: Trophy, disabled: true },
    { label: 'Hỏi đáp', icon: Users, disabled: true },
    { label: 'Hồ sơ', icon: User, href: '/profile' },
    ...(isAdmin ? [{ label: 'Quản trị', icon: Shield, href: '/admin' }] : []),
  ];
  const displayName = profile?.full_name || profile?.username || 'Student Demo';

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-start gap-3 px-8 py-9">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
          <LogoIcon size={24} color="white" />
        </div>
        <div className="text-3xl font-extrabold leading-[1.05] text-blue-600">
          Phòng Thi
          <br />
          Ảo
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-5 py-8">
        {items.map((item) => {
          const Icon = item.icon;
          const baseClass = 'flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left text-base font-semibold transition-colors';
          if (item.disabled) {
            return (
              <button
                key={item.label}
                type="button"
                disabled
                className={`${baseClass} cursor-not-allowed text-slate-400`}
                title="Tính năng sẽ được bổ sung sau"
              >
                <Icon className="h-5 w-5" />
                {item.label}
                <Lock className="ml-auto h-3.5 w-3.5" />
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`${baseClass} no-underline ${
                item.active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-5 mb-8 border-t border-slate-200 pt-8">
        <div className="flex items-center gap-4 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-600">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-slate-950">{displayName}</div>
            <div className="text-xs font-medium text-slate-500">{isAdmin ? 'Admin' : 'Premium'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 border-r border-slate-200 lg:block">
        {sidebar}
      </aside>

      <div
        className={`fixed inset-0 z-50 bg-slate-950/35 transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[86vw] border-r border-slate-200 transition-transform lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Đóng menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </aside>
    </>
  );
}

function SubjectAbilityChart({ subjects, emptyText = 'Chưa có dữ liệu. Hãy làm một vài bài thi để xem kết quả!' }) {
  if (!subjects.length) {
    return <EmptyState>{emptyText}</EmptyState>;
  }

  return (
    <div className="space-y-4 px-8 pb-8 pt-3">
      {subjects.map((subject) => (
        <div key={subject.name} className="grid grid-cols-[minmax(96px,160px)_1fr_52px] items-center gap-3">
          <div className="truncate text-sm font-semibold text-slate-600">{subject.name}</div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, subject.averageScore * 10))}%` }}
            />
          </div>
          <div className="text-right text-sm font-extrabold text-slate-900">{subject.averageScore}/10</div>
        </div>
      ))}
    </div>
  );
}

function AbilityChartCard({ title, description, badge, subjects, emptyText }) {
  return (
    <Card className="min-h-[360px]">
      <div className="px-8 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
          </div>
          {badge && (
            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-600">
              {badge}
            </span>
          )}
        </div>
      </div>
      <SubjectAbilityChart subjects={subjects} emptyText={emptyText} />
    </Card>
  );
}

function ScoreGauge({ prediction }) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const score = prediction?.score ?? null;
  const percent = score === null ? 0 : Math.min(100, Math.max(0, score * 10));
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center px-8 py-8">
      <div className="relative h-44 w-44">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#e6edf7" strokeWidth="16" />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#2563eb"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="16"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-slate-950">{score === null ? '--' : score}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">/10</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-600">
        <span className="h-0.5 w-5 rounded-full bg-amber-400" />
        {prediction?.stability || 'Ổn định'}
      </div>
      <div className="mt-4 text-sm text-slate-500">
        Độ tin cậy: {prediction ? `${prediction.confidence}%` : '--'}
      </div>
    </div>
  );
}

function ScoreHistoryChart({ attempts }) {
  if (!attempts.length) {
    return <EmptyState>Chưa có lịch sử thi. Hãy thử làm một bài!</EmptyState>;
  }

  const width = 820;
  const height = 240;
  const padding = { top: 22, right: 24, bottom: 36, left: 38 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = attempts.map((attempt, index) => {
    const x = attempts.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (attempts.length - 1)) * plotWidth;
    const y = padding.top + plotHeight - (attempt.score / SCORE_MAX) * plotHeight;
    return { x, y, attempt };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="px-6 pb-6 pt-2">
      <svg className="h-[260px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Lịch sử điểm thi">
        {[0, 2.5, 5, 7.5, 10].map((tick) => {
          const y = padding.top + plotHeight - (tick / SCORE_MAX) * plotHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-semibold">
                {tick}
              </text>
            </g>
          );
        })}
        <polyline fill="none" points={path} stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {points.map((point) => (
          <g key={point.attempt.id}>
            <circle cx={point.x} cy={point.y} r="6" fill="#2563eb" stroke="#ffffff" strokeWidth="3" />
            <text x={point.x} y={height - 12} textAnchor="middle" className="fill-slate-400 text-[10px] font-semibold">
              {point.attempt.createdAt ? point.attempt.createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SuggestionsCard({
  aiSuggestions,
  fallbackSuggestions,
  loading,
  error,
  onGenerate,
  hasAttempts,
}) {
  const suggestions = aiSuggestions.length ? aiSuggestions : fallbackSuggestions;
  const usingAi = aiSuggestions.length > 0;

  return (
    <Card>
      <div className="flex flex-col gap-4 px-8 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-extrabold text-slate-950">
            <Lightbulb className="h-6 w-6 text-blue-600" />
            Gợi ý ôn tập thông minh
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {usingAi ? 'Gợi ý được cá nhân hóa bằng AI từ dữ liệu học tập tổng hợp.' : 'Gợi ý mặc định dựa trên kết quả làm bài hiện có.'}
          </p>
        </div>

        {hasAttempts && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Đang tạo...' : usingAi ? 'Tạo lại gợi ý AI' : 'Tạo gợi ý AI'}
          </button>
        )}
      </div>

      {!hasAttempts ? (
        <div className="px-8 pb-8 text-sm font-medium text-slate-500">
          Chưa có gợi ý. Hãy làm thêm bài thi để nhận gợi ý cá nhân hóa!
        </div>
      ) : (
        <div className="px-8 pb-8">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Đang dùng gợi ý mặc định: {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {suggestions.map((suggestion, index) => (
              <div key={`${suggestion}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700">
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function PersonalAnalysisPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAnalysisData() {
      setLoading(true);
      setLoadError('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        router.push('/login');
        return;
      }

      const [profileResult, attemptsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, role')
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('exam_attempts')
          .select('id, score, correct_answers, total_questions, time_spent, created_at, violation_count, exams(title, subject, exam_type, year)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (!isMounted) return;
      setUser(session.user);
      setProfile(profileResult.data || null);

      if (attemptsResult.error) {
        setLoadError('Không tải được dữ liệu phân tích. Vui lòng thử lại sau.');
        setAttempts([]);
      } else {
        setAttempts((attemptsResult.data || []).map(normalizeAttempt));
      }

      setLoading(false);
    }

    loadAnalysisData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.push('/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const stats = useMemo(() => buildStats(attempts), [attempts]);
  const fallbackSuggestions = useMemo(() => buildFallbackSuggestions(stats), [stats]);
  const aiSummary = useMemo(() => buildAiSummary(stats), [stats]);
  const userId = user?.id || '';
  const recentAttemptId = stats.recentAttempts[0]?.id || 'none';
  const aiCacheKey = userId && stats.totalAttempts
    ? `yeuhoc_analysis_ai_${userId}_${stats.totalAttempts}_${recentAttemptId}`
    : '';
  const focusTarget = stats.weakestThptSubject?.name
    || stats.weakestAptitudeExam?.name
    || stats.weakestSubject?.name
    || '--';

  const handleGenerateAiSuggestions = useCallback(async () => {
    if (!stats.totalAttempts || aiLoading) return;

    if (aiCacheKey && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(aiCacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed?.suggestions)) {
            setAiSuggestions(parsed.suggestions);
            setAiError('');
            return;
          }
        } catch {
          sessionStorage.removeItem(aiCacheKey);
        }
      }
    }

    setAiLoading(true);
    setAiError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn.');

      const response = await fetch('/api/profile/analysis-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ summary: aiSummary }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tạo gợi ý AI lúc này.');
      }

      const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
      if (!suggestions.length) throw new Error('AI chưa trả về gợi ý phù hợp.');

      setAiSuggestions(suggestions);
      if (aiCacheKey && typeof window !== 'undefined') {
        sessionStorage.setItem(aiCacheKey, JSON.stringify({ suggestions }));
      }
    } catch (error) {
      setAiSuggestions([]);
      setAiError(error.message || 'Không thể tạo gợi ý AI lúc này.');
    } finally {
      setAiLoading(false);
    }
  }, [aiCacheKey, aiLoading, aiSummary, stats.totalAttempts]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Đang tải phân tích cá nhân...
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" style={{ fontFamily: 'var(--font-be-vietnam), system-ui, sans-serif' }}>
      <AnalysisSidebar
        isAdmin={isAdmin}
        profile={profile}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Mở menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="text-sm font-extrabold text-blue-600">Phân tích cá nhân</div>
        <Link href="/profile" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Hồ sơ">
          <User className="h-5 w-5" />
        </Link>
      </header>

      <main className="lg:pl-80">
        <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Phân tích cá nhân</h1>
            <p className="mt-3 text-base font-medium text-slate-500">Xem điểm mạnh, điểm yếu và gợi ý ôn tập thông minh</p>
          </div>

          {loadError && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              {loadError}
            </div>
          )}

          {stats.totalAttempts > 0 && (
            <div className="mb-6 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">TB {stats.averageScore}/10</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">Cao nhất {stats.highestScore}/10</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{stats.trend.label}</span>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <AbilityChartCard
              title="Năng lực THPT Quốc gia"
              description="Theo môn học: Toán, Lý, Hóa, Sinh, Anh và các môn THPT khác nếu có."
              badge={stats.thptAttemptCount ? `${stats.thptAttemptCount} bài` : ''}
              subjects={stats.thptSubjectStats}
              emptyText="Chưa có dữ liệu THPT Quốc gia. Hãy làm một vài đề THPT để xem phân tích theo môn."
            />

            <AbilityChartCard
              title="Năng lực HSA/TSA"
              description="Theo loại đề đánh giá năng lực/tư duy đã làm."
              badge={stats.aptitudeAttemptCount ? `${stats.aptitudeAttemptCount} bài` : ''}
              subjects={stats.aptitudeExamStats}
              emptyText="Chưa có dữ liệu HSA/TSA. Hãy làm đề HSA hoặc TSA để xem phân tích."
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card className="min-h-[420px]">
              <div className="px-8 py-8">
                <h2 className="text-xl font-extrabold text-slate-950">Dự đoán điểm thi HSA</h2>
                {stats.hsaPrediction && (
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Dựa trên {stats.hsaPrediction.count} bài HSA gần nhất trong lịch sử của bạn.
                  </p>
                )}
              </div>
              <ScoreGauge prediction={stats.hsaPrediction} />
            </Card>
          </div>

          <Card className="mt-6">
            <div className="flex flex-col gap-3 px-8 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Lịch sử điểm thi</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">Tối đa 12 bài gần nhất, sắp xếp theo thời gian làm bài.</p>
              </div>
              {stats.totalAttempts > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  <History className="h-4 w-4" />
                  {stats.totalAttempts} bài đã làm
                </div>
              )}
            </div>
            <ScoreHistoryChart attempts={stats.historyAttempts} />
            {stats.recentAttempts.length > 0 && (
              <div className="grid gap-3 border-t border-slate-100 px-8 py-6 lg:grid-cols-2">
                {stats.recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-900">{attempt.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>{attempt.subject}</span>
                        <span>•</span>
                        <span>{formatDateTime(attempt.createdAt)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-extrabold text-blue-600">{attempt.score}/10</div>
                      <div className="text-xs font-semibold text-slate-400">{formatMinutes(attempt.timeSpent)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="mt-6">
            <SuggestionsCard
              aiSuggestions={aiSuggestions}
              fallbackSuggestions={fallbackSuggestions}
              loading={aiLoading}
              error={aiError}
              onGenerate={handleGenerateAiSuggestions}
              hasAttempts={stats.totalAttempts > 0}
            />
          </div>

          {stats.totalAttempts > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Card className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Điểm cao nhất</div>
                    <div className="text-xl font-extrabold text-slate-950">{stats.highestScore}/10</div>
                  </div>
                </div>
              </Card>
              <Card className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Xu hướng</div>
                    <div className="text-xl font-extrabold text-slate-950">{stats.trend.label}</div>
                  </div>
                </div>
              </Card>
              <Card className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-amber-600" />
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Cần tập trung</div>
                    <div className="text-xl font-extrabold text-slate-950">{focusTarget}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="mt-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 no-underline hover:text-blue-700">
              Làm thêm đề thi
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
