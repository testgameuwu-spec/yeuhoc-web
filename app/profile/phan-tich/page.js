'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  Award,
  Brain,
  ChevronRight,
  History,
  Lightbulb,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { checkSAEquivalent } from '@/lib/mathUtils';

const SCORE_MAX = 10;
const PERCENT_MAX = 100;
const UNKNOWN_GROUP = 'Chưa phân loại';

const THPT_SUBJECT_ORDER = ['Toán', 'Lý', 'Hóa', 'Sinh', 'Anh'];

const THPT_PARTS = [
  {
    key: 'part1',
    name: 'Phần I',
    label: 'Trắc nghiệm nhiều phương án',
    scoring: '0,25 điểm/câu',
  },
  {
    key: 'part2',
    name: 'Phần II',
    label: 'Trắc nghiệm đúng/sai',
    scoring: '1 ý: 0,1đ; 2 ý: 0,25đ; 3 ý: 0,5đ; 4 ý: 1đ',
  },
  {
    key: 'part3',
    name: 'Phần III',
    label: 'Trả lời ngắn',
    scoring: 'Toán: 0,5đ/câu; môn khác: 0,25đ/câu',
  },
];

const HSA_SECTIONS = [
  {
    key: 'hsa-quantitative',
    name: 'Toán học và xử lý số liệu',
    label: 'Tư duy định lượng',
    target: '50 câu',
    duration: '75 phút',
    scoring: 'Tính theo % đúng và đúng/tổng câu',
  },
  {
    key: 'hsa-verbal',
    name: 'Văn học - Ngôn ngữ',
    label: 'Tư duy định tính',
    target: '50 câu',
    duration: '60 phút',
    scoring: 'Tính theo % đúng và đúng/tổng câu',
  },
  {
    key: 'hsa-elective',
    name: 'Khoa học hoặc Tiếng Anh',
    label: 'Tự chọn',
    target: '50 câu',
    duration: '60 phút',
    scoring: 'Tính theo % đúng và đúng/tổng câu',
  },
];

const TSA_SECTIONS = [
  {
    key: 'tsa-math',
    name: 'Tư duy Toán học',
    label: 'M1:M2:M3 = 4:3:3',
    target: '40 câu',
    duration: '60 phút',
    scoring: '40 điểm tối đa',
  },
  {
    key: 'tsa-reading',
    name: 'Tư duy Đọc hiểu',
    label: 'M1:M2:M3 = 4:3:3',
    target: '20 câu',
    duration: '30 phút',
    scoring: '20 điểm tối đa',
  },
  {
    key: 'tsa-science',
    name: 'Tư duy Khoa học/Giải quyết vấn đề',
    label: 'M1:M2:M3 = 4:3:3',
    target: '40 câu',
    duration: '60 phút',
    scoring: '40 điểm tối đa',
  },
];

const EXAM_TABS = [
  {
    key: 'THPT',
    label: 'THPT Quốc Gia',
  },
  {
    key: 'HSA',
    label: 'HSA',
  },
  {
    key: 'TSA',
    label: 'TSA',
  },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function roundMetric(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function getPercent(correct, total) {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return 0;
  return roundMetric((correct / total) * PERCENT_MAX);
}

function getTabMeta(examKey) {
  return EXAM_TABS.find((tab) => tab.key === examKey) || EXAM_TABS[0];
}

function getPointValue(value, fallback) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (Number.isFinite(Number(value?.pointsPerQuestion))) return Number(value.pointsPerQuestion);
  return fallback;
}

function getTfScale(value, fallback) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (Array.isArray(value?.scale)) return value.scale.map(Number).filter(Number.isFinite);
  return fallback;
}

function buildTfAnswerFromSubs(tfSubs) {
  if (!Array.isArray(tfSubs) || !tfSubs.length) return null;

  return tfSubs.reduce((answer, sub, index) => {
    answer[String.fromCharCode(97 + index)] = sub?.answer ? 'D' : 'S';
    return answer;
  }, {});
}

function normalizeQuestion(question = {}) {
  const tfAnswer = question.type === 'TF'
    ? buildTfAnswerFromSubs(question.tf_sub_questions || question.tfSubQuestions)
    : null;

  return {
    id: question.id,
    type: question.type,
    answer: tfAnswer || question.answer,
  };
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
  return getKnownThptSubjectLabel(subject) || subject || UNKNOWN_GROUP;
}

function getAttemptExamKey(attempt) {
  const text = normalizeText(`${attempt.examType} ${attempt.title}`);
  if (/\bhsa\b/.test(text)) return 'HSA';
  if (/\btsa\b/.test(text)) return 'TSA';
  if (
    /\bthpt\b/.test(text)
    || text.includes('quoc gia')
    || text.includes('tot nghiep')
    || Boolean(getKnownThptSubjectLabel(attempt.subject))
  ) {
    return 'THPT';
  }
  return null;
}

function normalizeThptScore(attempt) {
  const rawScore = Number(attempt?.score);
  if (Number.isFinite(rawScore)) {
    return roundMetric(clamp(rawScore, 0, SCORE_MAX));
  }

  const correct = Number(attempt?.correct_answers);
  const total = Number(attempt?.total_questions);
  if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
    return roundMetric((correct / total) * SCORE_MAX);
  }

  return 0;
}

function normalizeAttempt(attempt) {
  const exam = Array.isArray(attempt.exams) ? attempt.exams[0] : attempt.exams;
  const createdAt = attempt.created_at ? new Date(attempt.created_at) : null;
  const correctAnswers = Number(attempt.correct_answers) || 0;
  const totalQuestions = Number(attempt.total_questions) || 0;
  const userAnswers = attempt.user_answers && typeof attempt.user_answers === 'object'
    ? attempt.user_answers
    : {};
  const questions = Array.isArray(exam?.questions)
    ? exam.questions.map(normalizeQuestion)
    : [];
  const baseAttempt = {
    id: attempt.id,
    title: exam?.title || 'Đề thi',
    subject: exam?.subject || UNKNOWN_GROUP,
    examType: exam?.exam_type || UNKNOWN_GROUP,
    year: exam?.year || '',
    rawScore: Number.isFinite(Number(attempt.score)) ? Number(attempt.score) : null,
    correctAnswers,
    totalQuestions,
    accuracy: getPercent(correctAnswers, totalQuestions),
    timeSpent: Number(attempt.time_spent) || 0,
    createdAt,
    createdAtValue: createdAt?.getTime() || 0,
    scoringConfig: exam?.scoring_config || null,
    questions,
    userAnswers,
  };
  const examKey = getAttemptExamKey(baseAttempt);

  return {
    ...baseAttempt,
    examKey,
    score: examKey === 'THPT' ? normalizeThptScore(attempt) : 0,
  };
}

function getMetricValue(attempt, examKey) {
  return examKey === 'THPT' ? attempt.score : attempt.accuracy;
}

function computeTrend(chronologicalAttempts, examKey) {
  if (chronologicalAttempts.length < 2) {
    return { key: 'insufficient', label: 'Cần thêm dữ liệu', delta: 0 };
  }

  const recentSize = Math.min(3, Math.floor(chronologicalAttempts.length / 2) || 1);
  const recent = chronologicalAttempts.slice(-recentSize);
  const previous = chronologicalAttempts.slice(-recentSize * 2, -recentSize);
  const baseline = previous.length ? previous : chronologicalAttempts.slice(0, recentSize);
  const delta = average(recent.map((attempt) => getMetricValue(attempt, examKey)))
    - average(baseline.map((attempt) => getMetricValue(attempt, examKey)));
  const threshold = examKey === 'THPT' ? 0.35 : 3.5;

  if (Math.abs(delta) < threshold) return { key: 'stable', label: 'Ổn định', delta: roundMetric(delta) };
  if (delta > 0) return { key: 'up', label: 'Đang tăng', delta: roundMetric(delta) };
  return { key: 'down', label: 'Đang giảm', delta: roundMetric(delta) };
}

function getHsaSectionLabel(attempt) {
  const text = normalizeText(`${attempt.subject} ${attempt.title}`);
  if (text.includes('dinh luong') || text.includes('xu ly so lieu') || /\btoan\b/.test(text)) {
    return HSA_SECTIONS[0].name;
  }
  if (text.includes('dinh tinh') || text.includes('van hoc') || text.includes('ngon ngu') || text.includes('doc hieu')) {
    return HSA_SECTIONS[1].name;
  }
  if (
    text.includes('khoa hoc')
    || text.includes('tieng anh')
    || text.includes('english')
    || text.includes('vat ly')
    || text.includes('vat li')
    || text.includes('hoa hoc')
    || text.includes('sinh hoc')
    || text.includes('lich su')
    || text.includes('dia li')
    || text.includes('dia ly')
  ) {
    return HSA_SECTIONS[2].name;
  }
  return UNKNOWN_GROUP;
}

function getTsaSectionByIndex(index, totalQuestions) {
  if (totalQuestions !== 100) return UNKNOWN_GROUP;
  if (index < 40) return TSA_SECTIONS[0].name;
  if (index < 60) return TSA_SECTIONS[1].name;
  if (index < 100) return TSA_SECTIONS[2].name;
  return UNKNOWN_GROUP;
}

function getThptPartLabel(question) {
  if (question.type === 'MCQ') return THPT_PARTS[0].name;
  if (question.type === 'TF') return THPT_PARTS[1].name;
  if (question.type === 'SA') return THPT_PARTS[2].name;
  return UNKNOWN_GROUP;
}

function isQuestionCorrect(question, userAnswers) {
  const userAnswer = userAnswers?.[question.id];

  if (question.type === 'MCQ') return userAnswer === question.answer;

  if (question.type === 'TF' && question.answer && typeof question.answer === 'object') {
    const selected = userAnswer && typeof userAnswer === 'object' ? userAnswer : {};
    const keys = Object.keys(question.answer);
    return keys.length > 0 && keys.every((key) => selected[key] === question.answer[key]);
  }

  return checkSAEquivalent(userAnswer, question.answer);
}

function getQuestionScore(question, userAnswers, scoringConfig, attempt) {
  const defaultConfig = {
    mcq: attempt.examKey === 'THPT' ? 0.25 : 1,
    sa: attempt.examKey === 'THPT' && getKnownThptSubjectLabel(attempt.subject) === 'Toán' ? 0.5 : 0.25,
    tf: attempt.examKey === 'THPT' ? [0.1, 0.25, 0.5, 1] : [0.25, 0.25, 0.25, 0.25],
  };
  const mcqPoint = getPointValue(scoringConfig?.mcq, defaultConfig.mcq);
  const saPoint = getPointValue(scoringConfig?.sa, defaultConfig.sa);
  const tfScale = getTfScale(scoringConfig?.tf, defaultConfig.tf);
  const correct = isQuestionCorrect(question, userAnswers);

  if (question.type === 'MCQ') {
    return { correct, correctCount: correct ? 1 : 0, totalCount: 1, score: correct ? mcqPoint : 0, maxScore: mcqPoint };
  }

  if (question.type === 'TF' && question.answer && typeof question.answer === 'object') {
    const selected = userAnswers?.[question.id] && typeof userAnswers[question.id] === 'object'
      ? userAnswers[question.id]
      : {};
    const keys = Object.keys(question.answer);
    const subCorrect = keys.reduce((count, key) => count + (selected[key] === question.answer[key] ? 1 : 0), 0);
    const maxScore = tfScale[3] || 1;
    const score = subCorrect > 0 ? (tfScale[subCorrect - 1] || 0) : 0;
    return {
      correct: keys.length > 0 && subCorrect === keys.length,
      correctCount: keys.length > 0 && subCorrect === keys.length ? 1 : 0,
      totalCount: 1,
      score,
      maxScore,
    };
  }

  return { correct, correctCount: correct ? 1 : 0, totalCount: 1, score: correct ? saPoint : 0, maxScore: saPoint };
}

function getSectionOrder(examKey) {
  if (examKey === 'THPT') return THPT_PARTS.map((part) => part.name);
  if (examKey === 'HSA') return HSA_SECTIONS.map((section) => section.name);
  if (examKey === 'TSA') return TSA_SECTIONS.map((section) => section.name);
  return [];
}

function sortRowsByOrder(rows, order) {
  return [...rows].sort((a, b) => {
    const aIndex = order.indexOf(a.name);
    const bIndex = order.indexOf(b.name);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.name.localeCompare(b.name, 'vi');
  });
}

function getAttemptBreakdown(attempt, examKey) {
  const groups = new Map();
  const realQuestions = attempt.questions.filter((question) => question.type !== 'TEXT');
  const hasQuestionLevelData = realQuestions.length > 0 && Object.keys(attempt.userAnswers || {}).length > 0;

  function addRow(name, correct, total, score = 0, maxScore = 0) {
    const current = groups.get(name) || { name, correct: 0, total: 0, score: 0, maxScore: 0 };
    current.correct += correct;
    current.total += total;
    current.score += score;
    current.maxScore += maxScore;
    groups.set(name, current);
  }

  if (hasQuestionLevelData) {
    realQuestions.forEach((question, index) => {
      const section = examKey === 'THPT'
        ? getThptPartLabel(question)
        : examKey === 'HSA'
          ? getHsaSectionLabel(attempt)
          : getTsaSectionByIndex(index, realQuestions.length);
      const result = getQuestionScore(question, attempt.userAnswers, attempt.scoringConfig, attempt);
      addRow(section, result.correctCount, result.totalCount, result.score, result.maxScore);
    });
  } else {
    const fallbackSection = examKey === 'HSA' ? getHsaSectionLabel(attempt) : UNKNOWN_GROUP;
    addRow(
      fallbackSection,
      attempt.correctAnswers,
      attempt.totalQuestions,
      examKey === 'THPT' ? attempt.score : 0,
      examKey === 'THPT' ? SCORE_MAX : 0
    );
  }

  return Array.from(groups.values());
}

function aggregateSectionStats(attempts, examKey) {
  const groups = new Map();

  attempts.forEach((attempt) => {
    getAttemptBreakdown(attempt, examKey).forEach((row) => {
      const current = groups.get(row.name) || {
        name: row.name,
        count: 0,
        correct: 0,
        total: 0,
        score: 0,
        maxScore: 0,
      };
      current.count += 1;
      current.correct += row.correct;
      current.total += row.total;
      current.score += row.score;
      current.maxScore += row.maxScore;
      groups.set(row.name, current);
    });
  });

  const rows = Array.from(groups.values()).map((group) => {
    const value = examKey === 'THPT'
      ? roundMetric(group.maxScore > 0 ? (group.score / group.maxScore) * SCORE_MAX : (group.correct / Math.max(1, group.total)) * SCORE_MAX)
      : getPercent(group.correct, group.total);

    return {
      ...group,
      value,
      latestValue: value,
    };
  });

  return sortRowsByOrder(rows, getSectionOrder(examKey));
}

function groupAttemptsByMetric(attempts, getName, examKey) {
  const groups = new Map();

  attempts.forEach((attempt) => {
    const name = getName(attempt) || UNKNOWN_GROUP;
    const current = groups.get(name) || {
      name,
      count: 0,
      values: [],
      correct: 0,
      total: 0,
      latestAttempt: null,
    };
    current.count += 1;
    current.values.push(getMetricValue(attempt, examKey));
    current.correct += attempt.correctAnswers;
    current.total += attempt.totalQuestions;
    if (!current.latestAttempt || attempt.createdAtValue > current.latestAttempt.createdAtValue) {
      current.latestAttempt = attempt;
    }
    groups.set(name, current);
  });

  return Array.from(groups.values()).map((group) => ({
    name: group.name,
    count: group.count,
    correct: group.correct,
    total: group.total,
    value: roundMetric(average(group.values)),
    latestValue: group.latestAttempt ? getMetricValue(group.latestAttempt, examKey) : 0,
  }));
}

function sortThptSubjectStats(rows) {
  return [...rows].sort((a, b) => {
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

function buildExamStats(attempts, examKey) {
  const examAttempts = attempts
    .filter((attempt) => attempt.examKey === examKey)
    .sort((a, b) => b.createdAtValue - a.createdAtValue);
  const chronological = [...examAttempts].sort((a, b) => a.createdAtValue - b.createdAtValue);
  const values = examAttempts.map((attempt) => getMetricValue(attempt, examKey));
  const sectionStats = aggregateSectionStats(examAttempts, examKey);
  const subjectStats = examKey === 'THPT'
    ? sortThptSubjectStats(groupAttemptsByMetric(examAttempts, (attempt) => getThptSubjectLabel(attempt.subject), examKey))
    : [];
  const abilityStats = examKey === 'THPT' ? subjectStats : sectionStats;
  const weakestAbility = [...abilityStats]
    .filter((item) => item.total > 0 || item.count > 0)
    .sort((a, b) => a.value - b.value)[0] || null;
  const weakestSection = [...sectionStats]
    .filter((item) => item.total > 0 || item.count > 0)
    .sort((a, b) => a.value - b.value)[0] || null;
  const latestAttempt = examAttempts[0] || null;

  return {
    examKey,
    attempts: examAttempts,
    totalAttempts: examAttempts.length,
    averageValue: roundMetric(average(values)),
    highestValue: roundMetric(Math.max(0, ...values)),
    totalCorrect: examAttempts.reduce((sum, attempt) => sum + attempt.correctAnswers, 0),
    totalQuestions: examAttempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0),
    averageTimeMinutes: roundMetric(average(examAttempts.map((attempt) => attempt.timeSpent)) / 60),
    latestQuestionProgress: latestAttempt?.totalQuestions || 0,
    subjectStats,
    sectionStats,
    abilityStats,
    weakestAbility,
    weakestSection,
    focusTarget: weakestSection?.name || weakestAbility?.name || '--',
    recentAttempts: examAttempts.slice(0, 5),
    historyAttempts: chronological.slice(-12),
    trend: computeTrend(chronological, examKey),
  };
}

function buildStatsByExam(attempts) {
  return EXAM_TABS.reduce((stats, tab) => {
    stats[tab.key] = buildExamStats(attempts, tab.key);
    return stats;
  }, {});
}

function buildFallbackSuggestions(stats, examKey) {
  if (!stats.totalAttempts) return [];

  const suggestions = [];
  const metricUnit = examKey === 'THPT' ? '/10' : '%';
  const weakest = stats.weakestSection || stats.weakestAbility;

  if (stats.totalAttempts < 3) {
    suggestions.push(`Làm thêm ít nhất 2-3 đề ${examKey} để hệ thống nhận diện xu hướng rõ hơn.`);
  }

  if (weakest) {
    const detail = examKey === 'THPT'
      ? `${weakest.value}${metricUnit}`
      : `${weakest.value}${metricUnit}, ${weakest.correct}/${weakest.total} câu`;
    suggestions.push(`Ưu tiên ôn ${weakest.name}; kết quả trung bình hiện là ${detail}.`);
  }

  if (stats.trend.key === 'down') {
    suggestions.push('Kết quả gần đây đang giảm; hãy xem lại lỗi sai trong 3 bài mới nhất trước khi làm đề mới.');
  } else if (stats.trend.key === 'up') {
    suggestions.push('Xu hướng đang tăng; tiếp tục luyện đề cùng kỳ thi để giữ nhịp tiến bộ.');
  }

  if (stats.averageTimeMinutes > 0) {
    suggestions.push(`Thời gian trung bình mỗi bài khoảng ${stats.averageTimeMinutes} phút; đặt mục tiêu rút ngắn 5-10%.`);
  }

  return suggestions.slice(0, 5);
}

function buildAiSummary(stats, examKey) {
  const normalizeForAi = (value) => (examKey === 'THPT' ? value : roundMetric(value / 10));

  return {
    totalAttempts: stats.totalAttempts,
    averageScore: normalizeForAi(stats.averageValue),
    highestScore: normalizeForAi(stats.highestValue),
    averageTimeMinutes: stats.averageTimeMinutes,
    trend: stats.trend.key,
    weakestSubject: stats.weakestAbility
      ? {
          subject: stats.weakestAbility.name,
          averageScore: normalizeForAi(stats.weakestAbility.value),
          attempts: stats.weakestAbility.count,
        }
      : null,
    weakestExamType: examKey,
    subjects: stats.abilityStats.map((item) => ({
      subject: item.name,
      averageScore: normalizeForAi(item.value),
      attempts: item.count,
    })),
    thptSubjects: examKey === 'THPT'
      ? stats.subjectStats.map((subject) => ({
          subject: subject.name,
          averageScore: subject.value,
          attempts: subject.count,
        }))
      : [],
    aptitudeExams: examKey !== 'THPT'
      ? stats.sectionStats.map((section) => ({
          examType: section.name,
          averageScore: normalizeForAi(section.value),
          attempts: section.count,
        }))
      : [],
    recentAttempts: stats.recentAttempts.map((attempt) => ({
      title: attempt.title,
      subject: attempt.subject,
      examType: attempt.examType,
      score: normalizeForAi(getMetricValue(attempt, examKey)),
      date: attempt.createdAt ? attempt.createdAt.toISOString().slice(0, 10) : '',
      timeSpentMinutes: roundMetric(attempt.timeSpent / 60),
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

function formatMetricValue(value, examKey) {
  return examKey === 'THPT' ? `${roundMetric(value)}/10` : `${roundMetric(value)}%`;
}

function formatAttemptResult(attempt, examKey) {
  if (examKey === 'THPT') return `${attempt.score}/10`;
  return `${attempt.accuracy}% · ${attempt.correctAnswers}/${attempt.totalQuestions} câu`;
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

function ExamSwitch({ activeKey, onChange, statsByExam }) {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:min-w-0">
        {EXAM_TABS.map((tab) => {
          const active = activeKey === tab.key;
          const count = statsByExam[tab.key]?.totalAttempts || 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex min-w-[150px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition-colors ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, title, value, detail, colorClass }) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${colorClass}`} />
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-slate-400">{title}</div>
          <div className="truncate text-xl font-extrabold text-slate-950">{value}</div>
          {detail && <div className="mt-1 text-xs font-semibold text-slate-500">{detail}</div>}
        </div>
      </div>
    </Card>
  );
}

function SummaryGrid({ stats, examKey }) {
  const totalAnswerText = stats.totalQuestions > 0
    ? `${stats.totalCorrect}/${stats.totalQuestions} câu`
    : '--';
  const progressValue = examKey === 'TSA'
    ? `${Math.min(stats.latestQuestionProgress, 100)}/100 câu`
    : totalAnswerText;

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryItem
        icon={Award}
        title={examKey === 'THPT' ? 'Điểm trung bình' : 'Tỉ lệ đúng TB'}
        value={stats.totalAttempts ? formatMetricValue(stats.averageValue, examKey) : '--'}
        detail={`${stats.totalAttempts} bài đã làm`}
        colorClass="text-emerald-600"
      />
      <SummaryItem
        icon={Activity}
        title={examKey === 'THPT' ? 'Cao nhất' : 'Tỉ lệ cao nhất'}
        value={stats.totalAttempts ? formatMetricValue(stats.highestValue, examKey) : '--'}
        detail={examKey === 'THPT' ? 'Theo thang 10 điểm' : totalAnswerText}
        colorClass="text-blue-600"
      />
      <SummaryItem
        icon={History}
        title={examKey === 'TSA' ? 'Tiến độ 100 câu' : 'Đúng / tổng'}
        value={progressValue}
        detail={examKey === 'TSA' ? 'Dựa trên bài TSA gần nhất' : 'Tổng hợp trong tab hiện tại'}
        colorClass="text-violet-600"
      />
      <SummaryItem
        icon={Brain}
        title="Cần tập trung"
        value={stats.focusTarget}
        detail={stats.trend.label}
        colorClass="text-amber-600"
      />
    </div>
  );
}

function MetricBarChart({ rows, examKey, emptyText }) {
  if (!rows.length) return <EmptyState>{emptyText}</EmptyState>;

  const maxValue = examKey === 'THPT' ? SCORE_MAX : PERCENT_MAX;

  return (
    <div className="space-y-4 px-6 pb-6 pt-1 sm:px-8">
      {rows.map((row) => {
        const width = Math.min(100, Math.max(0, (row.value / maxValue) * 100));
        return (
          <div key={row.name} className="grid gap-2 sm:grid-cols-[minmax(140px,220px)_1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-700">{row.name}</div>
              <div className="mt-0.5 text-xs font-semibold text-slate-400">
                {row.count} bài{row.total ? ` · ${row.correct}/${row.total} câu` : ''}
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="text-right text-sm font-extrabold text-slate-950">
              {formatMetricValue(row.value, examKey)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AbilityChartCard({ title, description, badge, rows, examKey, emptyText }) {
  return (
    <Card className="min-h-[340px]">
      <div className="px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
            {description && <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{description}</p>}
          </div>
          {badge && (
            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-600">
              {badge}
            </span>
          )}
        </div>
      </div>
      <MetricBarChart rows={rows} examKey={examKey} emptyText={emptyText} />
    </Card>
  );
}

function ScoreHistoryChart({ attempts, examKey }) {
  if (!attempts.length) {
    return <EmptyState>Chưa có lịch sử trong kỳ thi này. Hãy thử làm một bài!</EmptyState>;
  }

  const width = 820;
  const height = 240;
  const maxValue = examKey === 'THPT' ? SCORE_MAX : PERCENT_MAX;
  const ticks = examKey === 'THPT' ? [0, 2.5, 5, 7.5, 10] : [0, 25, 50, 75, 100];
  const padding = { top: 22, right: 24, bottom: 36, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = attempts.map((attempt, index) => {
    const value = getMetricValue(attempt, examKey);
    const x = attempts.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (attempts.length - 1)) * plotWidth;
    const y = padding.top + plotHeight - (value / maxValue) * plotHeight;
    return { x, y, attempt };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="px-4 pb-6 pt-2 sm:px-6">
      <svg className="h-[260px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Lịch sử kết quả thi">
        {ticks.map((tick) => {
          const y = padding.top + plotHeight - (tick / maxValue) * plotHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-semibold">
                {examKey === 'THPT' ? tick : `${tick}%`}
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
  examLabel,
}) {
  const suggestions = aiSuggestions.length ? aiSuggestions : fallbackSuggestions;
  const usingAi = aiSuggestions.length > 0;

  return (
    <Card>
      <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-extrabold text-slate-950">
            <Lightbulb className="h-6 w-6 text-blue-600" />
            Gợi ý ôn tập {examLabel}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {usingAi ? 'Gợi ý được cá nhân hóa bằng AI từ dữ liệu của tab đang chọn.' : 'Gợi ý mặc định dựa trên kết quả làm bài trong tab đang chọn.'}
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
        <div className="px-6 pb-6 text-sm font-medium text-slate-500 sm:px-8">
          Chưa có gợi ý. Hãy làm thêm bài thi trong kỳ thi này để nhận gợi ý cá nhân hóa.
        </div>
      ) : (
        <div className="px-6 pb-6 sm:px-8">
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
  const [attempts, setAttempts] = useState([]);
  const [activeExamKey, setActiveExamKey] = useState('THPT');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
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

      const attemptsResult = await supabase
        .from('exam_attempts')
        .select('id, score, correct_answers, total_questions, time_spent, created_at, violation_count, user_answers, exams(title, subject, exam_type, year, scoring_config, questions(id, type, answer, tf_sub_questions))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;
      setUser(session.user);

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

  const statsByExam = useMemo(() => buildStatsByExam(attempts), [attempts]);
  const stats = statsByExam[activeExamKey];
  const activeMeta = getTabMeta(activeExamKey);
  const fallbackSuggestions = useMemo(() => buildFallbackSuggestions(stats, activeExamKey), [activeExamKey, stats]);
  const aiSummary = useMemo(() => buildAiSummary(stats, activeExamKey), [activeExamKey, stats]);
  const userId = user?.id || '';
  const recentAttemptId = stats.recentAttempts[0]?.id || 'none';
  const aiCacheKey = userId && stats.totalAttempts
    ? `yeuhoc_analysis_ai_${userId}_${activeExamKey}_${stats.totalAttempts}_${recentAttemptId}`
    : '';

  const handleExamTabChange = useCallback((examKey) => {
    setActiveExamKey(examKey);
    setAiSuggestions([]);
    setAiError('');
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" style={{ fontFamily: 'var(--font-be-vietnam), system-ui, sans-serif' }}>
      <Navbar />

      <main>
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Phân tích cá nhân</h1>
            <p className="mt-3 text-base font-medium text-slate-500">Xem điểm mạnh, điểm yếu và gợi ý ôn tập thông minh theo từng kỳ thi.</p>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm font-extrabold leading-relaxed sm:text-base">
                Lưu ý: Phần phân tích cá nhân chỉ nhận kết quả trong chế độ thi thật.
              </p>
            </div>
          </div>

          <ExamSwitch activeKey={activeExamKey} onChange={handleExamTabChange} statsByExam={statsByExam} />

          {loadError && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              {loadError}
            </div>
          )}

          <SummaryGrid stats={stats} examKey={activeExamKey} />

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <AbilityChartCard
              title={activeExamKey === 'THPT' ? 'Năng lực theo môn học' : 'Năng lực theo phần thi'}
              badge={stats.totalAttempts ? `${stats.totalAttempts} bài` : ''}
              rows={stats.abilityStats}
              examKey={activeExamKey}
              emptyText={`Chưa có dữ liệu ${activeMeta.label}. Hãy làm một vài đề để xem phân tích.`}
            />

            <AbilityChartCard
              title={activeExamKey === 'THPT' ? 'Năng lực theo Phần I/II/III' : 'Đối chiếu theo cấu trúc chuẩn'}
              badge={stats.sectionStats.length ? `${stats.sectionStats.length} nhóm` : ''}
              rows={stats.sectionStats}
              examKey={activeExamKey}
              emptyText={`Chưa có dữ liệu cấu trúc ${activeMeta.label}.`}
            />
          </div>

          <Card className="mt-6">
            <div className="flex flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Lịch sử kết quả {activeMeta.label}</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Tối đa 12 bài gần nhất trong kỳ thi đang chọn.
                </p>
              </div>
              {stats.totalAttempts > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  <History className="h-4 w-4" />
                  {stats.totalAttempts} bài đã làm
                </div>
              )}
            </div>
            <ScoreHistoryChart attempts={stats.historyAttempts} examKey={activeExamKey} />
            {stats.recentAttempts.length > 0 && (
              <div className="grid gap-3 border-t border-slate-100 px-6 py-6 lg:grid-cols-2 sm:px-8">
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
                      <div className="text-lg font-extrabold text-blue-600">{formatAttemptResult(attempt, activeExamKey)}</div>
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
              examLabel={activeMeta.label}
            />
          </div>

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
