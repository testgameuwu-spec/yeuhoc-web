export const QUESTION_LEVELS = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
export const DEFAULT_QUESTION_LEVEL = 'Thông hiểu';

const LEVEL_ALIASES = {
  'nhận biết': 'Nhận biết',
  'nhan biet': 'Nhận biết',
  'thông hiểu': 'Thông hiểu',
  'thong hieu': 'Thông hiểu',
  'vận dụng': 'Vận dụng',
  'van dung': 'Vận dụng',
  'vận dụng cao': 'Vận dụng cao',
  'van dung cao': 'Vận dụng cao',
  'dễ': 'Nhận biết',
  'de': 'Nhận biết',
  'trung bình': 'Thông hiểu',
  'trung binh': 'Thông hiểu',
  'th': 'Thông hiểu',
  'khó': 'Vận dụng',
  'kho': 'Vận dụng',
};

export function normalizeQuestionLevel(level) {
  const value = String(level || '').trim();
  if (QUESTION_LEVELS.includes(value)) return value;

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return LEVEL_ALIASES[value.toLowerCase()]
    || LEVEL_ALIASES[normalized]
    || DEFAULT_QUESTION_LEVEL;
}
