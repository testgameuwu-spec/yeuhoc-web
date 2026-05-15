import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const MODEL = process.env.DEEPSEEK_ANALYSIS_MODEL || 'deepseek-chat';
const MAX_OUTPUT_TOKENS = 700;

function truncateText(value, maxLength = 240) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function sanitizeAttempt(attempt = {}) {
  return {
    title: truncateText(attempt.title, 160),
    subject: truncateText(attempt.subject, 80),
    examType: truncateText(attempt.examType, 80),
    score: clampNumber(attempt.score, 0, 10),
    date: truncateText(attempt.date, 40),
    timeSpentMinutes: clampNumber(attempt.timeSpentMinutes, 0, 600),
  };
}

function sanitizeSubject(item = {}) {
  return {
    subject: truncateText(item.subject || item.examType || item.name, 80),
    averageScore: clampNumber(item.averageScore, 0, 10),
    attempts: clampNumber(item.attempts, 0, 1000),
  };
}

function sanitizeSummary(summary = {}) {
  return {
    averageScore: clampNumber(summary.averageScore, 0, 10),
    highestScore: clampNumber(summary.highestScore, 0, 10),
    totalAttempts: clampNumber(summary.totalAttempts, 0, 10000),
    averageTimeMinutes: clampNumber(summary.averageTimeMinutes, 0, 600),
    trend: ['up', 'down', 'stable', 'insufficient'].includes(summary.trend)
      ? summary.trend
      : 'insufficient',
    weakestSubject: summary.weakestSubject ? sanitizeSubject(summary.weakestSubject) : null,
    weakestExamType: truncateText(summary.weakestExamType, 80),
    subjects: Array.isArray(summary.subjects)
      ? summary.subjects.slice(0, 8).map(sanitizeSubject)
      : [],
    thptSubjects: Array.isArray(summary.thptSubjects)
      ? summary.thptSubjects.slice(0, 8).map(sanitizeSubject)
      : [],
    aptitudeExams: Array.isArray(summary.aptitudeExams)
      ? summary.aptitudeExams.slice(0, 4).map(sanitizeSubject)
      : [],
    recentAttempts: Array.isArray(summary.recentAttempts)
      ? summary.recentAttempts.slice(0, 5).map(sanitizeAttempt)
      : [],
  };
}

function parseSuggestions(text) {
  const cleaned = String(text || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions;
    if (Array.isArray(suggestions)) {
      return suggestions
        .map((item) => truncateText(typeof item === 'string' ? item : item?.text, 220))
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    // Fall back to line parsing below.
  }

  return cleaned
    .split('\n')
    .map((line) => line.replace(/^[-*\d.]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function POST(req) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return Response.json({ error: 'Bạn cần đăng nhập để dùng gợi ý AI.' }, { status: 401 });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json({ error: 'Thiếu DEEPSEEK_API_KEY trên server.' }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body JSON không hợp lệ.' }, { status: 400 });
  }

  const summary = sanitizeSummary(body?.summary || {});
  if (summary.totalAttempts < 1) {
    return Response.json({ error: 'Chưa đủ dữ liệu để tạo gợi ý AI.' }, { status: 400 });
  }

  const system = `Bạn là cố vấn học tập cho học sinh Việt Nam đang luyện thi trên YeuHoc.
Nhiệm vụ: dựa trên dữ liệu tổng hợp đã được server lọc sẵn, tạo 3-5 gợi ý ôn tập cá nhân hóa.
Quy tắc:
- Chỉ trả về JSON hợp lệ dạng {"suggestions":["..."]}.
- Mỗi gợi ý dưới 28 từ, cụ thể, có hành động học tập rõ ràng.
- Không bịa dữ liệu, không nhắc đến prompt, API, token, hoặc hệ thống nội bộ.
- Không đưa lời khuyên y tế/tâm lý; chỉ tập trung ôn luyện, phân bổ thời gian, làm đề và xem lại lỗi.`;

  const prompt = `Dữ liệu học tập tổng hợp:
${JSON.stringify(summary, null, 2)}

Hãy tạo gợi ý ôn tập phù hợp với điểm yếu, xu hướng điểm, môn THPT yếu, nhóm HSA/TSA yếu và lịch sử gần đây.`;

  const result = await generateText({
    model: deepseek(MODEL),
    system,
    prompt,
    temperature: 0.2,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: AbortSignal.timeout(35 * 1000),
  });

  const suggestions = parseSuggestions(result.text);
  if (!suggestions.length) {
    return Response.json({ error: 'AI chưa tạo được gợi ý phù hợp.' }, { status: 502 });
  }

  return Response.json({ suggestions });
}
