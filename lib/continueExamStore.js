import { supabase } from '@/lib/supabase';

function hasSavedAnswer(answer) {
  if (!answer) return false;
  if (typeof answer === 'object') return Object.keys(answer).length > 0;
  return answer !== '';
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

export async function getContinueExamItems(userId, exams = [], folders = []) {
  if (!userId) return [];

  const examMap = getVisibleExamMap(exams, folders);
  const quizItems = readSavedQuizItems(userId, examMap);
  let practiceItems = [];

  try {
    const { data, error } = await supabase
      .from('practice_progress')
      .select('exam_id, answered_count, revealed_count, total_questions, saved_at, updated_at')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Practice progress fetch failed:', error.message);
    } else {
      practiceItems = (data || [])
        .map((row) => {
          const exam = examMap.get(String(row.exam_id));
          if (!exam) return null;

          const totalQuestions = row.total_questions || exam.totalQ || 0;
          const revealedCount = row.revealed_count || 0;
          const answeredCount = row.answered_count || 0;
          return {
            id: `practice-${exam.id}`,
            mode: 'practice',
            href: `/de-thi/${exam.id}?practiceResume=1`,
            title: exam.title,
            subject: exam.subject,
            examType: exam.examType,
            updatedAt: row.updated_at || row.saved_at,
            progressText: totalQuestions > 0
              ? `${revealedCount}/${totalQuestions} câu đã xem · ${answeredCount} câu đã trả lời`
              : 'Đang ôn luyện',
          };
        })
        .filter(Boolean);
    }
  } catch (error) {
    console.warn('Practice progress fetch failed:', error);
  }

  return [...quizItems, ...practiceItems]
    .sort((a, b) => getSortableTime(b.updatedAt) - getSortableTime(a.updatedAt));
}
