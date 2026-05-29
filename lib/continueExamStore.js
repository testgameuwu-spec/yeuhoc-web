import { supabase } from '@/lib/supabase';

function hasSavedAnswer(answer) {
  if (!answer) return false;
  if (typeof answer === 'object') return Object.keys(answer).length > 0;
  return answer !== '';
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}p ${remain}s`;
}

export function getSortableTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function getVisibleExamMap(exams, folders) {
  const hiddenFolderIds = new Set(
    folders
      .filter((folder) => folder.visibility === 'private' || folder.visibility === 'locked')
      .map((folder) => folder.id)
  );

  return new Map(
    exams
      .filter((exam) => !exam.folderId || !hiddenFolderIds.has(exam.folderId))
      .map((exam) => [String(exam.id), exam])
  );
}

export function readSavedExams(userId) {
  if (!userId || typeof window === 'undefined') return new Set();

  const saved = new Set();
  const prefix = `yeuhoc_progress_${userId}_`;
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(prefix)) {
      saved.add(key.substring(prefix.length));
    }
  });
  return saved;
}

export function readSavedQuizItems(userId, examMap) {
  if (!userId || typeof window === 'undefined') return [];

  const items = [];
  const prefix = `yeuhoc_progress_${userId}_`;
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith(prefix)) return;

    const examId = key.substring(prefix.length);
    const exam = examMap.get(String(examId));
    if (!exam) return;

    let savedAt = '';
    let answeredCount = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      savedAt = saved.savedAt || '';
      answeredCount = Object.values(saved.answers || {}).filter(hasSavedAnswer).length;
    } catch {
      savedAt = '';
    }

    const totalQuestions = exam.totalQ || (exam.questions || []).filter((question) => question.type !== 'TEXT').length || 0;
    items.push({
      id: `exam-${exam.id}`,
      mode: 'exam',
      href: `/de-thi/${exam.id}?resume=1`,
      title: exam.title,
      subject: exam.subject,
      examType: exam.examType,
      updatedAt: savedAt,
      progressText: totalQuestions > 0
        ? `${answeredCount}/${totalQuestions} câu đã trả lời`
        : 'Đang làm bài thi',
    });
  });

  return items;
}

function getExamQuestionCount(exam) {
  return exam.totalQ || (exam.questions || []).filter((question) => question.type !== 'TEXT').length || 0;
}

function buildPracticeItem(exam, progress) {
  const totalQuestions = Number(progress.totalQuestions) || getExamQuestionCount(exam);
  const revealedCount = Number(progress.revealedCount) || 0;
  const answeredCount = Number(progress.answeredCount) || 0;
  const completed = Boolean(progress.completed) || (totalQuestions > 0 && revealedCount >= totalQuestions);
  const timeSpentText = `Thời gian ${formatDuration(progress.timeSpent ?? progress.time_spent)}`;

  return {
    id: `practice-${exam.id}`,
    mode: 'practice',
    href: `/de-thi/${exam.id}?practiceResume=1`,
    title: exam.title,
    subject: exam.subject,
    examType: exam.examType,
    updatedAt: progress.updatedAt || progress.savedAt,
    completed,
    progressText: completed
      ? (totalQuestions > 0
        ? `Đã hoàn thành ôn luyện · ${revealedCount}/${totalQuestions} câu đã xem · ${answeredCount} câu đã trả lời · ${timeSpentText}`
        : `Đã hoàn thành ôn luyện · ${timeSpentText}`)
      : (totalQuestions > 0
        ? `${revealedCount}/${totalQuestions} câu đã xem · ${answeredCount} câu đã trả lời · ${timeSpentText}`
        : `Đang ôn luyện · ${timeSpentText}`),
  };
}

export function readSavedPracticeItems(userId, examMap) {
  if (!userId || typeof window === 'undefined') return [];

  const items = [];
  const prefix = `yeuhoc_practice_progress_${userId}_`;
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith(prefix)) return;

    const examId = key.substring(prefix.length);
    const exam = examMap.get(String(examId));
    if (!exam) return;

    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      const practiceRevealed = saved.practiceRevealed || saved.revealed_map || {};
      const totalQuestions = saved.totalQuestions || getExamQuestionCount(exam);
      const revealedCount = saved.revealedCount ?? Object.values(practiceRevealed).filter(Boolean).length;
      const answeredCount = saved.answeredCount ?? Object.values(saved.answers || {}).filter(hasSavedAnswer).length;
      items.push(buildPracticeItem(exam, {
        answeredCount,
        revealedCount,
        totalQuestions,
        completed: saved.completed,
        timeSpent: saved.timeSpent ?? saved.time_spent,
        savedAt: saved.savedAt || saved.saved_at,
        updatedAt: saved.updatedAt || saved.updated_at || saved.savedAt || saved.saved_at,
      }));
    } catch {
      // Ignore corrupt local progress entries.
    }
  });

  return items;
}

export async function getContinueExamItems(userId, exams = [], folders = []) {
  if (!userId) return [];

  const examMap = getVisibleExamMap(exams, folders);
  const quizItems = readSavedQuizItems(userId, examMap);
  let practiceItems = readSavedPracticeItems(userId, examMap);

  try {
    const { data, error } = await supabase
      .from('practice_progress')
      .select('exam_id, answered_count, revealed_count, total_questions, completed, time_spent, saved_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Practice progress fetch failed:', error.message);
    } else {
      const remoteItems = (data || [])
        .map((row) => {
          const exam = examMap.get(String(row.exam_id));
          if (!exam) return null;

          return buildPracticeItem(exam, {
            answeredCount: row.answered_count,
            revealedCount: row.revealed_count,
            totalQuestions: row.total_questions,
            completed: row.completed,
            timeSpent: row.time_spent,
            savedAt: row.saved_at,
            updatedAt: row.updated_at || row.saved_at,
          });
        })
        .filter(Boolean);
      const merged = new Map();
      [...practiceItems, ...remoteItems].forEach((item) => {
        const current = merged.get(item.id);
        if (!current || getSortableTime(item.updatedAt) > getSortableTime(current.updatedAt)) {
          merged.set(item.id, item);
        }
      });
      practiceItems = [...merged.values()];
    }
  } catch (error) {
    console.warn('Practice progress fetch failed:', error);
  }

  return [...quizItems, ...practiceItems]
    .sort((a, b) => getSortableTime(b.updatedAt) - getSortableTime(a.updatedAt));
}
