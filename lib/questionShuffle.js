import { getTsaSectionIndex, isTsaExam, TSA_SECTIONS } from './examScoring';

function shuffleArray(items, random = Math.random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRealIndexMap(questions) {
  const realIndexByOriginalIndex = new Map();
  let realIndex = 0;

  questions.forEach((question, index) => {
    if (question?.type !== 'TEXT') {
      realIndexByOriginalIndex.set(index, realIndex);
      realIndex += 1;
    }
  });

  return realIndexByOriginalIndex;
}

function getRealCountBefore(questions, originalIndex) {
  let count = 0;
  for (let i = 0; i < originalIndex; i++) {
    if (questions[i]?.type !== 'TEXT') count += 1;
  }
  return count;
}

function createUnit(questions, unitQuestions, originalIndexes, realIndexByOriginalIndex) {
  const realIndexes = originalIndexes
    .map(index => realIndexByOriginalIndex.get(index))
    .filter(Number.isInteger);
  const firstOriginalIndex = Math.min(...originalIndexes);

  return {
    questions: unitQuestions,
    realIndexes,
    realCountBefore: getRealCountBefore(questions, firstOriginalIndex),
  };
}

function buildShuffleUnits(questions) {
  const realIndexByOriginalIndex = getRealIndexMap(questions);
  const textById = new Map();
  const childrenByTextId = new Map();
  const consumedIndexes = new Set();

  questions.forEach((question) => {
    if (question?.type === 'TEXT' && question.id) {
      textById.set(question.id, question);
    }
  });

  questions.forEach((question, index) => {
    if (question?.type !== 'TEXT' && question?.linkedTo && textById.has(question.linkedTo)) {
      if (!childrenByTextId.has(question.linkedTo)) {
        childrenByTextId.set(question.linkedTo, []);
      }
      childrenByTextId.get(question.linkedTo).push({ question, index });
    }
  });

  return questions.reduce((units, question, index) => {
    if (consumedIndexes.has(index)) return units;

    if (question?.type === 'TEXT' && question.id) {
      const children = childrenByTextId.get(question.id) || [];
      const unitQuestions = [question, ...children.map(child => child.question)];
      const originalIndexes = [index, ...children.map(child => child.index)];

      consumedIndexes.add(index);
      children.forEach(child => consumedIndexes.add(child.index));
      units.push(createUnit(questions, unitQuestions, originalIndexes, realIndexByOriginalIndex));
      return units;
    }

    if (question?.type !== 'TEXT' && question?.linkedTo && textById.has(question.linkedTo)) {
      return units;
    }

    consumedIndexes.add(index);
    units.push(createUnit(questions, [question], [index], realIndexByOriginalIndex));
    return units;
  }, []);
}

function getTsaUnitSection(unit) {
  if (unit.realIndexes.length === 0) {
    return { sectionIndex: getTsaSectionIndex(unit.realCountBefore), crossesBoundary: false };
  }

  const sectionIndex = getTsaSectionIndex(unit.realIndexes[0]);
  const crossesBoundary = unit.realIndexes.some(index => getTsaSectionIndex(index) !== sectionIndex);
  return { sectionIndex, crossesBoundary };
}

function getTsaBoundaryError(unit) {
  const context = unit.questions.find(question => question?.type === 'TEXT');
  const realQuestionNumbers = unit.realIndexes.map(index => index + 1);
  const firstQuestionNumber = Math.min(...realQuestionNumbers);
  const lastQuestionNumber = Math.max(...realQuestionNumbers);
  const groupLabel = context?.id ? ` "${context.id}"` : '';

  return `Không thể trộn câu hỏi TSA vì chùm${groupLabel} đang vắt qua ranh 40/60 (câu ${firstQuestionNumber}-${lastQuestionNumber}). Hãy đưa toàn bộ câu trong chùm vào cùng một phần 1-40, 41-60 hoặc 61-100 rồi thử lại.`;
}

export function shuffleExamQuestions(questions, { examType = '', random = Math.random } = {}) {
  const sourceQuestions = Array.isArray(questions) ? questions : [];
  const units = buildShuffleUnits(sourceQuestions);

  if (!isTsaExam(examType)) {
    return {
      questions: shuffleArray(units, random).flatMap(unit => unit.questions),
      error: null,
    };
  }

  const unitsBySection = TSA_SECTIONS.map(() => []);

  for (const unit of units) {
    const { sectionIndex, crossesBoundary } = getTsaUnitSection(unit);
    if (crossesBoundary) {
      return {
        questions: sourceQuestions,
        error: getTsaBoundaryError(unit),
      };
    }
    unitsBySection[sectionIndex].push(unit);
  }

  return {
    questions: unitsBySection
      .flatMap(sectionUnits => shuffleArray(sectionUnits, random))
      .flatMap(unit => unit.questions),
    error: null,
  };
}
