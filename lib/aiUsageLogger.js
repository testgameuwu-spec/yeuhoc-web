import { createClient } from '@supabase/supabase-js';

const AI_USAGE_LOG_TABLE = 'ai_usage_logs';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedClient = null;

function getServiceClient() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

function normalizeUuid(value) {
  const text = String(value || '').trim();
  return UUID_PATTERN.test(text) ? text : null;
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function normalizeMetadata(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function getUsageTokenCounts(usage) {
  const promptTokens = normalizeNonNegativeInteger(usage?.inputTokens ?? usage?.promptTokens);
  const completionTokens = normalizeNonNegativeInteger(usage?.outputTokens ?? usage?.completionTokens);
  const totalTokens = normalizeNonNegativeInteger(usage?.totalTokens) || promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

export async function insertAiUsageLog(payload) {
  const client = getServiceClient();
  if (!client) {
    console.warn('AI usage log skipped: missing Supabase service role configuration.');
    return;
  }

  const row = {
    source: payload.source,
    status: payload.status,
    user_id: normalizeUuid(payload.userId),
    exam_id: normalizeUuid(payload.examId),
    question_id: payload.questionId ? String(payload.questionId) : null,
    request_type: payload.requestType ? String(payload.requestType) : null,
    model: payload.model ? String(payload.model) : null,
    prompt_tokens: normalizeNonNegativeInteger(payload.promptTokens),
    completion_tokens: normalizeNonNegativeInteger(payload.completionTokens),
    total_tokens: normalizeNonNegativeInteger(payload.totalTokens),
    duration_ms: payload.durationMs === null || payload.durationMs === undefined
      ? null
      : normalizeNonNegativeInteger(payload.durationMs),
    metadata: normalizeMetadata(payload.metadata),
    error_message: payload.errorMessage ? String(payload.errorMessage).slice(0, 1000) : null,
  };

  const { error } = await client.from(AI_USAGE_LOG_TABLE).insert(row);
  if (error) {
    console.error('AI usage log insert failed:', error);
  }
}
