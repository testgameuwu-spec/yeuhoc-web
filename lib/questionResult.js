import { checkSAEquivalent } from './mathUtils';

export function hasSubmittedAnswer(question, selectedAnswer) {
  if (!question) return false;

  if (question.type === 'TF') {
    if (!selectedAnswer || typeof selectedAnswer !== 'object') return false;
    return Object.values(selectedAnswer).some((value) => value === 'D' || value === 'S');
  }

  if (selectedAnswer === undefined || selectedAnswer === null) return false;
  if (typeof selectedAnswer === 'string') return selectedAnswer.trim() !== '';
  return selectedAnswer !== '';
}

export function getQuestionResultState(question, selectedAnswer) {
  if (!hasSubmittedAnswer(question, selectedAnswer)) return 'unanswered';

  if (question.type === 'MCQ') {
    return selectedAnswer === question.answer ? 'correct' : 'wrong';
  }

  if (question.type === 'TF' && question.answer && typeof question.answer === 'object') {
    const selected = selectedAnswer && typeof selectedAnswer === 'object' ? selectedAnswer : {};
    const keys = Object.keys(question.answer);
    return keys.length > 0 && keys.every((key) => selected[key] === question.answer[key]) ? 'correct' : 'wrong';
  }

  return checkSAEquivalent(selectedAnswer, question.answer) ? 'correct' : 'wrong';
}
