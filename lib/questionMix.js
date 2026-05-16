import { getTsaSectionIndex, isTsaExam, TSA_SECTIONS } from './examScoring';

export const MIX_QUESTION_TYPES = ['MCQ', 'MA', 'TF', 'SA', 'DRAG'];

function shuffleArray(items, random = Math.random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]));
  }
  return value;
}

function createDraftId(random = Math.random) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `MIX_${crypto.randomUUID()}`;
  }
  return `MIX_${Date.now()}_${Math.floor(random() * 1000000000)}`;
}

function getZeroCounts() {
  return Object.fromEntries(MIX_QUESTION_TYPES.map(type => [type, 0]));
}

function addQuestionTypeCount(counts, question) {
  if (MIX_QUESTION_TYPES.includes(question?.type)) {
    counts[question.type] += 1;
  }
}

function getUnitCounts(questions) {
  const counts = getZeroCounts();
  questions.forEach(question => addQuestionTypeCount(counts, question));
  return counts;
}

function getTotalCount(counts) {
  return MIX_QUESTION_TYPES.reduce((total, type) => total + (counts[type] || 0), 0);
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

function createUnit(exam, questions, originalIndexes, realIndexByOriginalIndex) {
  const counts = getUnitCounts(questions);
  const totalCount = getTotalCount(counts);

  if (totalCount === 0) return null;

  return {
    examId: exam.id,
    examTitle: exam.title,
    questions,
    counts,
    totalCount,
    realIndexes: originalIndexes
      .map(index => realIndexByOriginalIndex.get(index))
      .filter(Number.isInteger),
  };
}

function buildMixUnitsForExam(exam) {
  const questions = Array.isArray(exam?.questions) ? exam.questions : [];
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
      const unit = createUnit(
        exam,
        [question, ...children.map(child => child.question)],
        [index, ...children.map(child => child.index)],
        realIndexByOriginalIndex
      );

      consumedIndexes.add(index);
      children.forEach(child => consumedIndexes.add(child.index));
      if (unit) units.push(unit);
      return units;
    }

    if (question?.type !== 'TEXT' && question?.linkedTo && textById.has(question.linkedTo)) {
      return units;
    }

    const unit = createUnit(exam, [question], [index], realIndexByOriginalIndex);
    consumedIndexes.add(index);
    if (unit) units.push(unit);
    return units;
  }, []);
}

function normalizeQuotas(quotas = {}) {
  const normalized = {};

  for (const type of MIX_QUESTION_TYPES) {
    const value = Number(quotas[type] || 0);
    if (!Number.isInteger(value) || value < 0) {
      return { error: `Số lượng ${type} phải là số nguyên không âm.` };
    }
    normalized[type] = value;
  }

  if (getTotalCount(normalized) <= 0) {
    return { error: 'Vui lòng nhập ít nhất 1 câu hỏi cần lấy.' };
  }

  return { quotas: normalized, error: null };
}

function formatCounts(counts) {
  return MIX_QUESTION_TYPES.map(type => `${type}: ${counts[type] || 0}`).join(', ');
}

function getAvailableCounts(units) {
  return units.reduce((counts, unit) => {
    MIX_QUESTION_TYPES.forEach((type) => {
      counts[type] += unit.counts[type] || 0;
    });
    return counts;
  }, getZeroCounts());
}

function hasEnoughTypeCounts(units, quotas) {
  const available = getAvailableCounts(units);
  const missingTypes = MIX_QUESTION_TYPES.filter(type => available[type] < quotas[type]);

  if (missingTypes.length === 0) return null;

  return `Nguồn câu không đủ số lượng theo loại. Có ${formatCounts(available)}.`;
}

function getTsaUnitSection(unit) {
  const sectionIndex = getTsaSectionIndex(unit.realIndexes[0] || 0);
  const crossesBoundary = unit.realIndexes.some(index => getTsaSectionIndex(index) !== sectionIndex);
  return { sectionIndex, crossesBoundary };
}

function getTsaBoundaryError(unit) {
  const context = unit.questions.find(question => question?.type === 'TEXT');
  const realQuestionNumbers = unit.realIndexes.map(index => index + 1);
  const firstQuestionNumber = Math.min(...realQuestionNumbers);
  const lastQuestionNumber = Math.max(...realQuestionNumbers);
  const groupLabel = context?.id ? ` "${context.id}"` : '';
  const examLabel = unit.examTitle ? ` trong đề "${unit.examTitle}"` : '';

  return `Không thể tạo đề xáo TSA vì chùm${groupLabel}${examLabel} đang vắt qua ranh 40/60 (câu ${firstQuestionNumber}-${lastQuestionNumber}).`;
}

function enrichTsaUnits(units) {
  const nextUnits = [];

  for (const unit of units) {
    const { sectionIndex, crossesBoundary } = getTsaUnitSection(unit);
    if (crossesBoundary) {
      return { units, error: getTsaBoundaryError(unit) };
    }
    nextUnits.push({ ...unit, sectionIndex });
  }

  return { units: nextUnits, error: null };
}

function getUnitVector(unit, examType) {
  const typeCounts = MIX_QUESTION_TYPES.map(type => unit.counts[type] || 0);
  if (!isTsaExam(examType)) return typeCounts;

  const sectionCounts = TSA_SECTIONS.map((_, index) => (unit.sectionIndex === index ? unit.totalCount : 0));
  return [...typeCounts, ...sectionCounts];
}

function getTargetVector(quotas, examType) {
  const typeCounts = MIX_QUESTION_TYPES.map(type => quotas[type] || 0);
  if (!isTsaExam(examType)) return typeCounts;
  return [...typeCounts, ...TSA_SECTIONS.map(section => section.targetCount)];
}

function addVectors(left, right) {
  return left.map((value, index) => value + right[index]);
}

function isWithinTarget(vector, target) {
  return vector.every((value, index) => value <= target[index]);
}

function vectorKey(vector) {
  return vector.join('|');
}

function findExactUnitSelection(units, quotas, examType, random) {
  const candidates = shuffleArray(units, random).map((unit, index) => ({
    unit,
    originalIndex: index,
    vector: getUnitVector(unit, examType),
  }));
  const target = getTargetVector(quotas, examType);
  const zero = target.map(() => 0);
  const targetKey = vectorKey(target);
  let states = new Map([[vectorKey(zero), { vector: zero, indexes: [] }]]);

  for (const candidate of candidates) {
    const currentStates = [...states.values()];
    const nextStates = new Map(states);

    for (const state of currentStates) {
      const nextVector = addVectors(state.vector, candidate.vector);
      if (!isWithinTarget(nextVector, target)) continue;

      const key = vectorKey(nextVector);
      if (!nextStates.has(key)) {
        nextStates.set(key, {
          vector: nextVector,
          indexes: [...state.indexes, candidate.originalIndex],
        });
      }
    }

    states = nextStates;
    if (states.has(targetKey)) {
      return states.get(targetKey).indexes.map(index => candidates[index].unit);
    }
  }

  return null;
}

function cloneQuestion(question, idMap, random) {
  const nextId = idMap.get(String(question.id)) || createDraftId(random);
  const linkedKey = question.linkedTo ? String(question.linkedTo) : '';
  return {
    id: nextId,
    type: question.type,
    level: question.level,
    content: question.content,
    options: cloneValue(question.options || []),
    answer: cloneValue(question.answer),
    solution: question.solution || '',
    tfSubQuestions: cloneValue(question.tfSubQuestions),
    statements: cloneValue(question.statements),
    image: cloneValue(question.image || null),
    linkedTo: linkedKey && idMap.has(linkedKey) ? idMap.get(linkedKey) : null,
  };
}

function cloneUnitQuestions(unit, random) {
  const idMap = new Map();
  unit.questions.forEach((question) => {
    if (question?.id) idMap.set(String(question.id), createDraftId(random));
  });
  return unit.questions.map(question => cloneQuestion(question, idMap, random));
}

function flattenSelectedUnits(units, examType, random) {
  const orderedUnits = isTsaExam(examType)
    ? TSA_SECTIONS.flatMap((_, sectionIndex) => (
      shuffleArray(units.filter(unit => unit.sectionIndex === sectionIndex), random)
    ))
    : shuffleArray(units, random);

  return orderedUnits.flatMap(unit => cloneUnitQuestions(unit, random));
}

export function createMixedExamQuestions({
  exams = [],
  examType = '',
  sourceExamIds = [],
  quotas = {},
  random = Math.random,
} = {}) {
  const normalizedExamType = String(examType || '').toUpperCase();
  if (!['HSA', 'TSA'].includes(normalizedExamType)) {
    return { questions: [], error: 'Chỉ hỗ trợ tạo đề xáo cho HSA và TSA.' };
  }

  const { quotas: normalizedQuotas, error: quotaError } = normalizeQuotas(quotas);
  if (quotaError) return { questions: [], error: quotaError };

  if (isTsaExam(normalizedExamType) && getTotalCount(normalizedQuotas) !== 100) {
    return { questions: [], error: 'TSA phải có tổng quota đúng 100 câu.' };
  }

  const sourceIdSet = new Set((sourceExamIds || []).map(String));
  const sourceExams = (exams || []).filter(exam => (
    sourceIdSet.has(String(exam.id)) && String(exam.examType || '').toUpperCase() === normalizedExamType
  ));

  if (sourceExams.length < 2) {
    return { questions: [], error: 'Vui lòng chọn ít nhất 2 đề nguồn cùng loại HSA/TSA.' };
  }

  let units = sourceExams.flatMap(buildMixUnitsForExam);
  if (units.length === 0) {
    return { questions: [], error: 'Không tìm thấy câu hỏi hợp lệ trong các đề nguồn đã chọn.' };
  }

  if (isTsaExam(normalizedExamType)) {
    const result = enrichTsaUnits(units);
    if (result.error) return { questions: [], error: result.error };
    units = result.units;

    const sectionTotals = TSA_SECTIONS.map((_, sectionIndex) => (
      units
        .filter(unit => unit.sectionIndex === sectionIndex)
        .reduce((total, unit) => total + unit.totalCount, 0)
    ));
    const missingSection = TSA_SECTIONS.find((section, index) => sectionTotals[index] < section.targetCount);
    if (missingSection) {
      return {
        questions: [],
        error: `Nguồn câu TSA không đủ ${missingSection.targetCount} câu cho phần "${missingSection.name}".`,
      };
    }
  }

  const typeCountError = hasEnoughTypeCounts(units, normalizedQuotas);
  if (typeCountError) return { questions: [], error: typeCountError };

  const selectedUnits = findExactUnitSelection(units, normalizedQuotas, normalizedExamType, random);
  if (!selectedUnits) {
    return {
      questions: [],
      error: 'Không tìm được tổ hợp câu khớp chính xác với quota đã nhập. Hãy chọn thêm đề nguồn hoặc đổi số lượng từng loại câu.',
    };
  }

  return {
    questions: flattenSelectedUnits(selectedUnits, normalizedExamType, random),
    error: null,
  };
}
