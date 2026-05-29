const normalizeSeconds = (seconds) => {
  const value = Math.floor(Number(seconds) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const normalizeLimitSeconds = (seconds) => {
  const value = Math.floor(Number(seconds) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export function normalizeQuestionTimeSpent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value).reduce((acc, [questionId, seconds]) => {
    const normalized = Math.floor(Number(seconds));
    if (questionId && Number.isFinite(normalized) && normalized >= 0) acc[String(questionId)] = normalized;
    return acc;
  }, {});
}

export function addQuestionTimeSpent(value, questionId, seconds) {
  const normalizedQuestionId = questionId ? String(questionId) : '';
  const delta = Math.floor(Number(seconds) || 0);
  if (!normalizedQuestionId || !Number.isFinite(delta) || delta < 0) return normalizeQuestionTimeSpent(value);

  const next = normalizeQuestionTimeSpent(value);
  next[normalizedQuestionId] = Math.max(0, Math.floor(Number(next[normalizedQuestionId]) || 0) + delta);
  return next;
}

export function addActiveQuestionTimeSpent(value, activeQuestionTimer, mode, endedAt) {
  if (activeQuestionTimer?.mode !== mode || !activeQuestionTimer?.questionId) {
    return normalizeQuestionTimeSpent(value);
  }

  const endedAtSeconds = Math.max(0, Math.floor(Number(endedAt) || 0));
  const startedAtSeconds = Math.max(0, Math.floor(Number(activeQuestionTimer.startedAt) || 0));
  return addQuestionTimeSpent(value, activeQuestionTimer.questionId, endedAtSeconds - startedAtSeconds);
}

export function scaleQuestionTimeSpent(value, maxTotalSeconds) {
  const map = normalizeQuestionTimeSpent(value);
  const limit = normalizeLimitSeconds(maxTotalSeconds);
  const entries = Object.entries(map);
  const total = entries.reduce((sum, [, seconds]) => sum + seconds, 0);

  if (limit <= 0 || total <= limit) return map;

  const ratio = limit / total;
  const scaled = {};
  let allocated = 0;

  entries.forEach(([questionId, seconds], index) => {
    const isLast = index === entries.length - 1;
    const nextSeconds = isLast
      ? Math.max(0, limit - allocated)
      : Math.floor(seconds * ratio);
    if (nextSeconds > 0) {
      scaled[questionId] = nextSeconds;
      allocated += nextSeconds;
    }
  });

  return scaled;
}

export function normalizeAnswerTimeEvents(events) {
  if (!Array.isArray(events)) return [];

  return events.reduce((acc, event) => {
    const questionId = event?.questionId ? String(event.questionId) : '';
    const at = normalizeSeconds(event?.at);
    if (questionId) acc.push({ questionId, at });
    return acc;
  }, []);
}

export function appendAnswerTimeEvent(events, questionId, at) {
  const questionIdString = questionId ? String(questionId) : '';
  if (!questionIdString) return normalizeAnswerTimeEvents(events);

  return [
    ...normalizeAnswerTimeEvents(events),
    { questionId: questionIdString, at: normalizeSeconds(at) },
  ];
}

export function calculateAnswerTimelineQuestionTimeSpent(events, maxTotalSeconds) {
  let previousAt = 0;
  const rawTimeSpent = normalizeAnswerTimeEvents(events).reduce((acc, event) => {
    const at = Math.max(previousAt, normalizeSeconds(event.at));
    const delta = at - previousAt;
    previousAt = at;
    return addQuestionTimeSpent(acc, event.questionId, delta);
  }, {});

  return scaleQuestionTimeSpent(rawTimeSpent, maxTotalSeconds);
}

function stableSerialize(value) {
  if (Array.isArray(value)) return value.map(stableSerialize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stableSerialize(value[key]);
      return acc;
    }, {});
  }
  return value;
}

export function areQuestionAnswersEqual(left, right) {
  return JSON.stringify(stableSerialize(left)) === JSON.stringify(stableSerialize(right));
}

export function formatQuestionTimeSpent(seconds) {
  if (seconds === null || seconds === undefined || seconds === '') return '';
  const total = normalizeSeconds(seconds);
  if (total < 60) return `${total}s`;

  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return remain > 0 ? `${minutes}p ${remain}s` : `${minutes}p`;
}
