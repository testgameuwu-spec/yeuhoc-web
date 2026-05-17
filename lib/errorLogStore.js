import { supabase } from '@/lib/supabase';
import { getEmptyAnswerForType, getQuestionResultState, normalizeMAAnswer, parseDragAnswer } from './questionResult';
import { getTsaSectionIndex, isTsaExam, TSA_SECTIONS } from './examScoring';

export const ERROR_LOG_REASONS = [
  { value: 'careless', label: 'Ẩu/hấp tấp' },
  { value: 'knowledge_gap', label: 'Thiếu kiến thức/quên công thức' },
  { value: 'misread', label: 'Đọc sai đề' },
  { value: 'time_pressure', label: 'Thiếu thời gian' },
  { value: 'other', label: 'Khác' },
];

export const ERROR_LOG_BATCH_OPTIONS = [
  { value: 'wrong_unanswered', label: 'Lưu các câu sai và các câu chưa làm' },
  { value: 'wrong_only', label: 'Chỉ lưu câu sai' },
  { value: 'unanswered_only', label: 'Chỉ lưu các câu chưa làm' },
  { value: 'none', label: 'Không lưu nữa' },
];

const UNKNOWN_GROUP = 'Chưa phân loại';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toJson(value, fallback = null) {
  if (value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

export function getKnownThptSubjectLabel(subject) {
  const text = normalizeText(subject);
  if (/\b(toan|math)\b/.test(text)) return 'Toán';
  if (/\b(vat ly|vat li|ly|li|physics)\b/.test(text)) return 'Lý';
  if (/\b(hoa hoc|hoa|chemistry|chem)\b/.test(text)) return 'Hóa';
  if (/\b(sinh hoc|sinh|biology|bio)\b/.test(text)) return 'Sinh';
  if (/\b(tieng anh|anh van|english|anh)\b/.test(text)) return 'Anh';
  return null;
}

export function getErrorLogExamKey(exam = {}) {
  const text = normalizeText(`${exam.examType || exam.exam_type || ''} ${exam.title || ''}`);
  if (/\bhsa\b/.test(text)) return 'HSA';
  if (/\btsa\b/.test(text) || isTsaExam(exam)) return 'TSA';
  if (
    /\bthpt\b/.test(text)
    || text.includes('quoc gia')
    || text.includes('tot nghiep')
    || Boolean(getKnownThptSubjectLabel(exam.subject))
  ) {
    return 'THPT';
  }
  return 'THPT';
}

export function getErrorLogSubject(exam = {}) {
  const examKey = getErrorLogExamKey(exam);
  if (examKey === 'THPT') return getKnownThptSubjectLabel(exam.subject) || exam.subject || UNKNOWN_GROUP;
  return exam.subject || UNKNOWN_GROUP;
}

function getHsaSectionLabel(exam = {}) {
  const text = normalizeText(`${exam.subject || ''} ${exam.title || ''}`);
  if (text.includes('dinh luong') || text.includes('xu ly so lieu') || /\btoan\b/.test(text)) {
    return 'Toán học và xử lý số liệu';
  }
  if (text.includes('dinh tinh') || text.includes('van hoc') || text.includes('ngon ngu') || text.includes('doc hieu')) {
    return 'Văn học - Ngôn ngữ';
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
    return 'Khoa học hoặc Tiếng Anh';
  }
  return UNKNOWN_GROUP;
}

export function getErrorLogSectionLabel(exam = {}, question = {}, questionIndex = 0) {
  const examKey = getErrorLogExamKey(exam);

  if (examKey === 'TSA') {
    return TSA_SECTIONS[getTsaSectionIndex(questionIndex)]?.name || UNKNOWN_GROUP;
  }

  if (examKey === 'HSA') {
    return getHsaSectionLabel(exam);
  }

  if (question.type === 'MCQ') return 'Phần I: Trắc nghiệm';
  if (question.type === 'MA') return 'Chọn nhiều đáp án';
  if (question.type === 'TF') return 'Phần II: Đúng/Sai';
  if (question.type === 'SA') return 'Phần III: Trả lời ngắn';
  if (question.type === 'DRAG') return 'Kéo thả';
  return UNKNOWN_GROUP;
}

function snapshotQuestion(question = {}) {
  return toJson({
    id: question.id,
    type: question.type,
    content: question.content || '',
    options: question.options || [],
    answer: question.answer ?? null,
    solution: question.solution || null,
    image: question.image || question.image_url || null,
    linkedTo: question.linkedTo || question.parent_id || null,
    statements: question.statements || [],
    tfSubQuestions: question.tfSubQuestions || question.tf_sub_questions || null,
  }, {});
}

function getContextSnapshot(exam = {}, question = {}) {
  const linkedTo = question.linkedTo || question.parent_id;
  if (!linkedTo) return null;

  const context = (exam.questions || []).find((item) => (
    String(item.id) === String(linkedTo) && item.type === 'TEXT'
  ));
  return context ? snapshotQuestion(context) : null;
}

export function buildErrorLogEntry({
  userId,
  exam,
  question,
  questionIndex,
  answers = {},
  reason = null,
  note = '',
  source = 'manual',
  attemptId = null,
}) {
  const examKey = getErrorLogExamKey(exam);
  const selectedAnswer = answers?.[question.id] ?? getEmptyAnswerForType(question.type);
  const normalizedReason = reason || null;

  return {
    user_id: userId,
    exam_id: exam.id,
    question_id: String(question.id),
    attempt_id: attemptId || null,
    exam_key: examKey,
    subject: getErrorLogSubject(exam),
    section_label: getErrorLogSectionLabel(exam, question, questionIndex),
    question_number: Number.isFinite(Number(questionIndex)) ? Number(questionIndex) + 1 : null,
    question_type: question.type || null,
    question_snapshot: snapshotQuestion(question),
    context_snapshot: getContextSnapshot(exam, question),
    selected_answer: toJson(selectedAnswer),
    correct_answer: toJson(question.answer ?? null),
    reason: normalizedReason,
    note: note?.trim() || null,
    source,
    updated_at: new Date().toISOString(),
  };
}

export function getRealQuestions(exam = {}) {
  return (exam.questions || []).filter((question) => question.type !== 'TEXT');
}

export function getErrorLogQuestionEntriesForMode(exam = {}, answers = {}, mode = 'wrong_unanswered') {
  const realQuestions = getRealQuestions(exam);
  return realQuestions
    .map((question, index) => {
      const selectedAnswer = answers?.[question.id] ?? getEmptyAnswerForType(question.type);
      const resultState = getQuestionResultState(question, selectedAnswer);
      return { question, index, resultState };
    })
    .filter(({ resultState }) => {
      if (mode === 'wrong_only') return resultState === 'wrong';
      if (mode === 'unanswered_only') return resultState === 'unanswered';
      if (mode === 'wrong_unanswered') return resultState === 'wrong' || resultState === 'unanswered';
      return false;
    });
}

export function buildErrorLogEntriesForMode({
  userId,
  exam,
  answers = {},
  mode = 'wrong_unanswered',
  source = 'exam_result',
  attemptId = null,
}) {
  return getErrorLogQuestionEntriesForMode(exam, answers, mode).map(({ question, index }) => (
    buildErrorLogEntry({
      userId,
      exam,
      question,
      questionIndex: index,
      answers,
      source,
      attemptId,
    })
  ));
}

export async function upsertErrorLogEntries(entries) {
  if (!entries.length) return { count: 0 };

  const { data, error } = await supabase
    .from('error_log_entries')
    .upsert(entries, { onConflict: 'user_id,exam_id,question_id' })
    .select('id');

  if (error) throw error;
  return { count: data?.length || entries.length };
}

export async function upsertErrorLogEntry(entry) {
  return upsertErrorLogEntries([entry]);
}

function getOptionText(question = {}, letter) {
  if (!letter) return '';
  const index = String(letter).toUpperCase().charCodeAt(0) - 65;
  const option = index >= 0 ? question.options?.[index] : '';
  return option ? `${String(letter).toUpperCase()}. ${option}` : String(letter).toUpperCase();
}

function getTfLabel(value) {
  if (value === 'D') return 'Đúng';
  if (value === 'S') return 'Sai';
  return 'Chưa chọn';
}

export function formatAnswerForDisplay(question = {}, answerValue) {
  if (question.type === 'MCQ') {
    return answerValue ? getOptionText(question, answerValue) : 'Chưa chọn';
  }

  if (question.type === 'MA') {
    const selected = normalizeMAAnswer(answerValue);
    return selected.length ? selected.map((letter) => getOptionText(question, letter)).join('; ') : 'Chưa chọn';
  }

  if (question.type === 'TF') {
    const answer = answerValue && typeof answerValue === 'object' ? answerValue : {};
    const keys = Object.keys(question.answer || answer);
    return keys.length
      ? keys.map((key) => `${key}: ${getTfLabel(answer[key])}`).join('; ')
      : 'Chưa chọn';
  }

  if (question.type === 'DRAG') {
    const answer = parseDragAnswer(answerValue);
    const keys = Object.keys(answer);
    return keys.length
      ? keys.map((key) => `${key}: ${getOptionText(question, answer[key])}`).join('; ')
      : 'Chưa chọn';
  }

  return String(answerValue ?? '').trim() || 'Chưa chọn';
}
