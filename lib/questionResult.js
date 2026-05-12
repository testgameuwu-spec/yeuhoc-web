import { checkSAEquivalent } from './mathUtils';

export function getDragBlankIds(content = '') {
  const ids = [];
  const seen = new Set();
  const regex = /\[\[([^\]\s]+)\]\]/g;
  let match;

  while ((match = regex.exec(content || '')) !== null) {
    const id = match[1].trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return ids;
}

export function parseDragAnswer(answer) {
  if (!answer) return {};

  if (typeof answer === 'object' && !Array.isArray(answer)) {
    return Object.entries(answer).reduce((map, [key, value]) => {
      if (key && value !== undefined && value !== null && value !== '') {
        map[normalizeDragBlankId(key)] = String(value).trim().toUpperCase();
      }
      return map;
    }, {});
  }

  const map = {};
  const regex = /([^\s,;:=-]+)\s*[-:=]\s*([A-Z])/gi;
  let match;
  const text = String(answer);

  while ((match = regex.exec(text)) !== null) {
    map[normalizeDragBlankId(match[1])] = match[2].trim().toUpperCase();
  }

  return map;
}

function normalizeDragBlankId(value) {
  return String(value).trim().replace(/^\[\[/, '').replace(/\]\]$/, '');
}

export function getEmptyAnswerForType(type) {
  return type === 'TF' || type === 'DRAG' ? {} : '';
}

export function hasSubmittedAnswer(question, selectedAnswer) {
  if (!question) return false;

  if (question.type === 'TF') {
    if (!selectedAnswer || typeof selectedAnswer !== 'object') return false;
    return Object.values(selectedAnswer).some((value) => value === 'D' || value === 'S');
  }

  if (question.type === 'DRAG') {
    if (!selectedAnswer || typeof selectedAnswer !== 'object') return false;
    return Object.values(selectedAnswer).some((value) => typeof value === 'string' && value.trim() !== '');
  }

  if (selectedAnswer === undefined || selectedAnswer === null) return false;
  if (typeof selectedAnswer === 'string') return selectedAnswer.trim() !== '';
  return selectedAnswer !== '';
}

export function getQuestionResultState(question, selectedAnswer) {
  if (question?.type === 'TEXT') return '';
  if (!hasSubmittedAnswer(question, selectedAnswer)) return 'unanswered';

  if (question.type === 'MCQ') {
    return selectedAnswer === question.answer ? 'correct' : 'wrong';
  }

  if (question.type === 'TF' && question.answer && typeof question.answer === 'object') {
    const selected = selectedAnswer && typeof selectedAnswer === 'object' ? selectedAnswer : {};
    const keys = Object.keys(question.answer);
    return keys.length > 0 && keys.every((key) => selected[key] === question.answer[key]) ? 'correct' : 'wrong';
  }

  if (question.type === 'DRAG') {
    const correctAnswer = parseDragAnswer(question.answer);
    const selected = selectedAnswer && typeof selectedAnswer === 'object' ? selectedAnswer : {};
    const keys = Object.keys(correctAnswer);
    return keys.length > 0 && keys.every((key) => selected[key] === correctAnswer[key]) ? 'correct' : 'wrong';
  }

  return checkSAEquivalent(selectedAnswer, question.answer) ? 'correct' : 'wrong';
}
