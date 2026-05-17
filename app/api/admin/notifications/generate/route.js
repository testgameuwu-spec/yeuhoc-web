import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUsageTokenCounts, insertAiUsageLog } from '@/lib/aiUsageLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const MODEL = process.env.DEEPSEEK_NOTIFICATION_MODEL || 'deepseek-v4-pro';
const MAX_ITEMS = 20;
const MAX_OUTPUT_TOKENS = 1600;

function getBearerToken(req) {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

async function requireNotificationAdmin(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { errorResponse: jsonError('Bạn cần đăng nhập để dùng API admin.', 401) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    return { errorResponse: jsonError('Thiếu cấu hình Supabase trên server.', 500) };
  }

  const supabaseAdmin = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return { errorResponse: jsonError('Phiên đăng nhập không hợp lệ.', 401) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Notification admin role check error:', profileError);
    return { errorResponse: jsonError('Không thể kiểm tra quyền admin.', 500) };
  }

  if (profile?.role !== 'admin') {
    return { errorResponse: jsonError('Bạn không có quyền admin.', 403) };
  }

  return { supabaseAdmin, user, profile };
}

function truncate(value, maxLength = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeBody(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function cleanJsonText(text) {
  return String(text || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractJsonObject(text) {
  const cleaned = cleanJsonText(text);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

function normalizeField(value, { preserveNewlines = false } = {}) {
  const text = String(value || '')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');

  if (preserveNewlines) return normalizeBody(text);

  return text.replace(/\s+/g, ' ').trim();
}

function readJsonLikeField(text, key, nextKey, options) {
  const source = extractJsonObject(text);
  const nextPattern = nextKey
    ? `\\s*,\\s*"${nextKey}"\\s*:`
    : '\\s*}';
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"${nextPattern}`, 'i');
  const match = source.match(pattern);
  return normalizeField(match?.[1], options);
}

function readTaggedField(text, label, nextLabel, options) {
  const nextPattern = nextLabel ? `\\n${nextLabel}:` : '$';
  const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)${nextPattern}`, 'i');
  const match = String(text || '').match(pattern);
  return normalizeField(match?.[1], options);
}

function parseDraft(text) {
  const jsonCandidate = extractJsonObject(text);
  let parsed = null;

  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    parsed = {
      title: readJsonLikeField(text, 'title', 'body') || readTaggedField(text, 'TITLE', 'BODY'),
      body: readJsonLikeField(text, 'body', 'sourceSummary', { preserveNewlines: true })
        || readTaggedField(text, 'BODY', 'SOURCE_SUMMARY', { preserveNewlines: true }),
      sourceSummary: readJsonLikeField(text, 'sourceSummary') || readTaggedField(text, 'SOURCE_SUMMARY'),
    };
  }

  return {
    title: truncate(parsed.title, 90),
    body: normalizeBody(parsed.body),
    sourceSummary: truncate(parsed.sourceSummary, 500),
  };
}

function compactExam(row, folderMap) {
  const folder = row.folder_id ? folderMap.get(row.folder_id) : null;
  return {
    title: truncate(row.title, 140),
    subject: truncate(row.subject, 60),
    examType: truncate(row.exam_type, 40),
    year: row.year || null,
    folder: folder ? truncate(folder.name, 90) : 'Đề thi khác',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function compactFolder(row) {
  return {
    name: truncate(row.name, 120),
    subject: truncate(row.subject, 60),
    examType: truncate(row.exam_type, 40),
    year: row.year || null,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function isAfter(value, cutoffTime) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time > cutoffTime;
}

export async function POST(req) {
  const startedAt = Date.now();
  const auth = await requireNotificationAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;

  const logDraftAttempt = (payload) => insertAiUsageLog({
    source: 'notification_draft',
    userId: auth.user.id,
    model: MODEL,
    durationMs: Date.now() - startedAt,
    ...payload,
  });

  if (!process.env.DEEPSEEK_API_KEY) {
    await logDraftAttempt({
      status: 'failed',
      errorMessage: 'Thiếu DEEPSEEK_API_KEY trên server.',
      metadata: { stage: 'config', hasChanges: null },
    });
    return NextResponse.json({ error: 'Thiếu DEEPSEEK_API_KEY trên server.' }, { status: 503 });
  }

  const { supabaseAdmin } = auth;

  const { data: latestNotification, error: latestError } = await supabaseAdmin
    .from('notifications')
    .select('published_at')
    .eq('is_published', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    await logDraftAttempt({
      status: 'failed',
      errorMessage: latestError.message || 'Không thể đọc notification gần nhất.',
      metadata: { stage: 'latest_notification', hasChanges: null },
    });
    return NextResponse.json({ error: latestError.message || 'Không thể đọc notification gần nhất.' }, { status: 500 });
  }

  const cutoff = latestNotification?.published_at || '1970-01-01T00:00:00.000Z';
  const changedAfterFilter = `created_at.gt.${cutoff},updated_at.gt.${cutoff}`;

  const [{ data: visibleFolders, error: foldersError }, { data: changedFolders, error: changedFoldersError }] = await Promise.all([
    supabaseAdmin
      .from('folders')
      .select('id, name, visibility')
      .in('visibility', ['public', 'locked']),
    supabaseAdmin
      .from('folders')
      .select('id, name, subject, exam_type, year, visibility, created_at, updated_at')
      .in('visibility', ['public', 'locked'])
      .or(changedAfterFilter)
      .order('updated_at', { ascending: false })
      .limit(MAX_ITEMS),
  ]);

  if (foldersError || changedFoldersError) {
    await logDraftAttempt({
      status: 'failed',
      errorMessage: foldersError?.message || changedFoldersError?.message || 'Không thể đọc thư mục.',
      metadata: { stage: 'folders', hasChanges: null },
    });
    return NextResponse.json(
      { error: foldersError?.message || changedFoldersError?.message || 'Không thể đọc thư mục.' },
      { status: 500 }
    );
  }

  const folderMap = new Map((visibleFolders || []).map((folder) => [folder.id, folder]));
  const visibleFolderIds = new Set(folderMap.keys());

  const { data: changedExams, error: examsError } = await supabaseAdmin
    .from('exams')
    .select('id, title, subject, exam_type, year, folder_id, published, created_at, updated_at')
    .eq('published', true)
    .or(changedAfterFilter)
    .order('updated_at', { ascending: false })
    .limit(MAX_ITEMS * 2);

  if (examsError) {
    await logDraftAttempt({
      status: 'failed',
      errorMessage: examsError.message || 'Không thể đọc đề thi.',
      metadata: { stage: 'exams', hasChanges: null },
    });
    return NextResponse.json({ error: examsError.message || 'Không thể đọc đề thi.' }, { status: 500 });
  }

  const examsForHome = (changedExams || [])
    .filter((exam) => !exam.folder_id || visibleFolderIds.has(exam.folder_id))
    .slice(0, MAX_ITEMS);
  const foldersForHome = (changedFolders || []).slice(0, MAX_ITEMS).map(compactFolder);

  if (examsForHome.length === 0 && foldersForHome.length === 0) {
    await logDraftAttempt({
      status: 'success',
      metadata: {
        hasChanges: false,
        counts: {
          totalExamsInInput: 0,
          newExamsCreatedAfterCutoff: 0,
          updatedExamsAfterCutoff: 0,
          foldersInInput: 0,
        },
      },
    });
    return NextResponse.json({
      hasChanges: false,
      title: '',
      body: '',
      sourceSummary: 'Không có đề hoặc thư mục public/locked mới hay vừa cập nhật từ lần publish thông báo gần nhất.',
    });
  }

  const cutoffTime = new Date(cutoff).getTime();
  const newExamCount = examsForHome.filter((exam) => isAfter(exam.created_at, cutoffTime)).length;
  const updatedExamCount = Math.max(0, examsForHome.length - newExamCount);

  const sourcePayload = {
    cutoff,
    counts: {
      totalExamsInInput: examsForHome.length,
      newExamsCreatedAfterCutoff: newExamCount,
      updatedExamsAfterCutoff: updatedExamCount,
      foldersInInput: foldersForHome.length,
    },
    exams: examsForHome.map((exam) => compactExam(exam, folderMap)),
    folders: foldersForHome,
  };

  const system = `Bạn viết nháp thông báo cho học sinh Việt Nam trên YeuHoc.
Quy tắc:
- Chỉ trả JSON hợp lệ dạng {"title":"...","body":"...","sourceSummary":"..."}.
- JSON phải nằm trên một object duy nhất, không bọc markdown code fence.
- Tiêu đề tối đa 12 từ.
- Body giọng vui vẻ, thân thiện, gần gũi; được dùng emoji phù hợp.
- Body được dùng Markdown và xuống dòng bằng ký tự \\n trong JSON string.
- Không giới hạn số câu trong body, nhưng viết gọn, dễ đọc, không lan man.
- Nói rõ chi tiết số lượng đề đã tạo mới theo counts.newExamsCreatedAfterCutoff. Nếu có đề cập nhật, nói thêm counts.updatedExamsAfterCutoff.
- Nêu vài tên đề/thư mục nổi bật nếu dữ liệu có, ưu tiên thông tin hữu ích cho học sinh.
- sourceSummary tóm tắt nguồn dữ liệu nội bộ thật ngắn.
- Không nhắc đến API, prompt, model, JSON, admin, hay dữ liệu nội bộ trong title/body.`;

  const prompt = `Dữ liệu đề/thư mục mới hoặc vừa cập nhật đang có thể hiển thị trên trang chủ:
${JSON.stringify(sourcePayload, null, 2)}

Hãy viết một nháp thông báo để admin review.`;

  try {
    const result = await generateText({
      model: deepseek(MODEL),
      system,
      prompt,
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(35 * 1000),
    });

    const draft = parseDraft(result.text);
    if (!draft.title || !draft.body) {
      const usage = getUsageTokenCounts(result.usage);
      await logDraftAttempt({
        status: 'failed',
        ...usage,
        errorMessage: 'AI chưa tạo được nháp thông báo hợp lệ.',
        metadata: {
          hasChanges: true,
          counts: sourcePayload.counts,
          stage: 'parse_draft',
        },
      });
      return NextResponse.json({ error: 'AI chưa tạo được nháp thông báo hợp lệ.' }, { status: 502 });
    }

    const usage = getUsageTokenCounts(result.usage);
    await logDraftAttempt({
      status: 'success',
      ...usage,
      metadata: {
        hasChanges: true,
        counts: sourcePayload.counts,
      },
    });

    return NextResponse.json({
      hasChanges: true,
      ...draft,
    });
  } catch (error) {
    console.error('Notification draft generation error:', error);
    await logDraftAttempt({
      status: 'failed',
      errorMessage: error.message || 'Không thể tạo nháp thông báo.',
      metadata: {
        hasChanges: true,
        counts: sourcePayload.counts,
        stage: 'generate_text',
      },
    });
    return NextResponse.json(
      { error: error.message || 'Không thể tạo nháp thông báo.' },
      { status: 500 }
    );
  }
}
