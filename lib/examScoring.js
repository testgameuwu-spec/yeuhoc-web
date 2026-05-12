import { getEmptyAnswerForType, getQuestionResultState } from './questionResult';

export const TSA_TOTAL_QUESTIONS = 100;
export const TSA_TOTAL_DURATION_MINUTES = 150;

export const TSA_SECTIONS = [
  {
    key: 'tsa-math',
    name: 'Tư duy Toán học',
    startIndex: 0,
    endIndex: 40,
    targetCount: 40,
    durationMinutes: 60,
  },
  {
    key: 'tsa-reading',
    name: 'Tư duy Đọc hiểu',
    startIndex: 40,
    endIndex: 60,
    targetCount: 20,
    durationMinutes: 30,
  },
  {
    key: 'tsa-science',
    name: 'Tư duy Khoa học/Giải quyết vấn đề',
    startIndex: 60,
    endIndex: TSA_TOTAL_QUESTIONS,
    targetCount: 40,
    durationMinutes: 60,
  },
];

export function isTsaExam(examOrType) {
  const type = typeof examOrType === 'string'
    ? examOrType
    : (examOrType?.examType || examOrType?.exam_type || '');
  return String(type).toUpperCase() === 'TSA';
}

export function getTsaSectionIndex(questionIndex) {
  const index = Number(questionIndex);
  if (!Number.isFinite(index) || index < 0) return 0;
  if (index < TSA_SECTIONS[0].endIndex) return 0;
  if (index < TSA_SECTIONS[1].endIndex) return 1;
  return 2;
}

export function getTsaSectionByIndex(sectionIndex) {
  return TSA_SECTIONS[Math.min(Math.max(Number(sectionIndex) || 0, 0), TSA_SECTIONS.length - 1)];
}

export function getTsaSectionElapsedSeconds(sectionIndex, secondsLeft) {
  const section = getTsaSectionByIndex(sectionIndex);
  const durationSeconds = section.durationMinutes * 60;
  const remaining = Number.isFinite(Number(secondsLeft)) ? Number(secondsLeft) : durationSeconds;
  return Math.min(durationSeconds, Math.max(0, durationSeconds - remaining));
}

export function getPointValue(value, fallback) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (Number.isFinite(Number(value?.pointsPerQuestion))) return Number(value.pointsPerQuestion);
  return fallback;
}

export function getTfScale(value, fallback) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (Array.isArray(value?.scale)) return value.scale.map(Number).filter(Number.isFinite);
  return fallback;
}

export function getQuestionScore(question, selectedAnswer, {
  scoringConfig = null,
  examType = '',
  subject = '',
} = {}) {
  const normalizedExamType = String(examType || '').toUpperCase();
  const isThpt = normalizedExamType === 'THPT';
  const isKnownMath = /^(toán|toan|math)$/i.test(String(subject || '').trim());
  const resultState = getQuestionResultState(question, selectedAnswer);
  const correct = resultState === 'correct';
  const unanswered = resultState === 'unanswered';

  if (isTsaExam(examType)) {
    return {
      correct,
      unanswered,
      correctCount: correct ? 1 : 0,
      totalCount: 1,
      score: correct ? 1 : 0,
      maxScore: 1,
    };
  }

  if (question.type === 'MCQ' || question.type === 'MA') {
    const defaultPoint = isThpt ? 0.25 : 1;
    const point = getPointValue(
      question.type === 'MA' ? (scoringConfig?.ma ?? scoringConfig?.mcq) : scoringConfig?.mcq,
      defaultPoint
    );
    return {
      correct,
      unanswered,
      correctCount: correct ? 1 : 0,
      totalCount: 1,
      score: correct ? point : 0,
      maxScore: point,
    };
  }

  if (question.type === 'TF' && question.answer && typeof question.answer === 'object') {
    const selected = selectedAnswer && typeof selectedAnswer === 'object' ? selectedAnswer : {};
    const keys = Object.keys(question.answer);
    const subCorrect = keys.reduce((count, key) => count + (selected[key] === question.answer[key] ? 1 : 0), 0);
    const defaultTfScale = isThpt ? [0.1, 0.25, 0.5, 1] : [0.25, 0.25, 0.25, 0.25];
    const tfScale = getTfScale(scoringConfig?.tf, defaultTfScale);
    const shouldUseTfScale = Boolean(scoringConfig) || isThpt;
    const maxScore = tfScale[Math.min(keys.length, tfScale.length) - 1] || tfScale[tfScale.length - 1] || 1;
    const score = shouldUseTfScale && subCorrect > 0
      ? (tfScale[Math.min(subCorrect, tfScale.length) - 1] || 0)
      : (!shouldUseTfScale && keys.length > 0 && subCorrect === keys.length ? 1 : 0);

    return {
      correct: keys.length > 0 && subCorrect === keys.length,
      unanswered,
      correctCount: keys.length > 0 && subCorrect === keys.length ? 1 : 0,
      totalCount: 1,
      score,
      maxScore,
    };
  }

  const defaultSaPoint = isThpt ? (isKnownMath ? 0.5 : 0.25) : 1;
  const point = getPointValue(scoringConfig?.sa, defaultSaPoint);
  return {
    correct,
    unanswered,
    correctCount: correct ? 1 : 0,
    totalCount: 1,
    score: correct ? point : 0,
    maxScore: point,
  };
}

export function calculateExamResult(questions, answers = {}, {
  scoringConfig = null,
  examType = '',
  subject = '',
} = {}) {
  const realQuestions = (questions || []).filter((question) => question.type !== 'TEXT');
  let correct = 0;
  let unanswered = 0;
  let score = 0;
  let maxScore = 0;

  realQuestions.forEach((question) => {
    const selectedAnswer = answers?.[question.id] ?? getEmptyAnswerForType(question.type);
    const result = getQuestionScore(question, selectedAnswer, { scoringConfig, examType, subject });
    if (result.unanswered) unanswered += 1;
    correct += result.correctCount;
    score += result.score;
    maxScore += result.maxScore;
  });

  if (isTsaExam(examType)) {
    score = Math.min(correct, TSA_TOTAL_QUESTIONS);
    maxScore = TSA_TOTAL_QUESTIONS;
  } else if (!scoringConfig) {
    score = realQuestions.length > 0 ? (correct / realQuestions.length) * 10 : 0;
    maxScore = 10;
  }

  return {
    total: realQuestions.length,
    correct,
    unanswered,
    wrong: Math.max(0, realQuestions.length - correct - unanswered),
    score,
    maxScore,
    percentCorrect: realQuestions.length > 0 ? Math.round((correct / realQuestions.length) * 100) : 0,
  };
}
