import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUsageTokenCounts, insertAiUsageLog } from '@/lib/aiUsageLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL = process.env.DEEPSEEK_NOTIFICATION_MODEL || 'deepseek-v4-flash';
const MAX_ITEMS = 20;
const MAX_PRIOR_NOTIFICATIONS = 12;
const MAX_OUTPUT_TOKENS = 1600;
const GENERATION_TIMEOUT_MS = 55 * 1000;
const RECENT_OVERVIEW_DAYS = 7;

function getBearerToken(req) {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function getGenerationErrorMessage(error) {
  const message = error?.message || '';
  if (
    error?.name === 'TimeoutError'
    || message.toLowerCase().includes('timeout')
    || message.toLowerCase().includes('aborted')
  ) {
    return 'AI viết nháp quá lâu và đã hết thời gian chờ. Vui lòng thử lại sau ít phút.';
  }
  return message || 'Không thể tạo nháp thông báo.';
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

function normalizeUuidList(value) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return [...new Set((Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim())
    .filter((item) => uuidPattern.test(item)))];
}

function normalizeComparableText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
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
    mentionedExamIds: normalizeUuidList(parsed.mentionedExamIds),
  };
}

function compactExam(row, folderMap, mentionedExamIds = new Set()) {
  const folder = row.folder_id ? folderMap.get(row.folder_id) : null;
  return {
    id: row.id,
    title: truncate(row.title, 140),
    subject: truncate(row.subject, 60),
    examType: truncate(row.exam_type, 40),
    year: row.year || null,
    folder: folder ? truncate(folder.name, 90) : 'Đề thi khác',
    alreadyMentioned: mentionedExamIds.has(row.id),
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

function compactNotification(row) {
  return {
    title: truncate(row.title, 120),
    body: truncate(row.body, 320),
    status: row.is_published ? 'published' : 'draft',
    publishedAt: row.published_at || null,
    createdAt: row.created_at,
    mentionedExamIds: normalizeUuidList(row.mentioned_exam_ids),
  };
}

function compactResolvedReport(row) {
  return {
    questionContent: truncate(row.question_content, 180),
    examTitle: truncate(row.exam_title, 120),
    resolvedAt: row.resolved_at,
    adminReply: truncate(row.admin_reply, 180),
  };
}

function isAfter(value, cutoffTime) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time > cutoffTime;
}

function uniqueRowsById(rows) {
  const byId = new Map();
  (rows || []).forEach((row) => {
    if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
  });
  return [...byId.values()];
}

function collectPreviouslyMentionedExamIds(exams, notifications) {
  const mentionedIds = new Set();
  const notificationText = normalizeComparableText(
    (notifications || []).map((notification) => `${notification.title || ''}\n${notification.body || ''}`).join('\n')
  );

  (notifications || []).forEach((notification) => {
    normalizeUuidList(notification.mentioned_exam_ids).forEach((id) => mentionedIds.add(id));
  });

  (exams || []).forEach((exam) => {
    const title = normalizeComparableText(exam.title);
    if (title && notificationText.includes(title)) {
      mentionedIds.add(exam.id);
    }
  });

  return mentionedIds;
}

function inferMentionedExamIdsFromDraft(draft, exams) {
  const text = normalizeComparableText(`${draft.title || ''}\n${draft.body || ''}`);
  return (exams || [])
    .filter((exam) => {
      const title = normalizeComparableText(exam.title);
      return title && text.includes(title);
    })
    .map((exam) => exam.id);
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
  const overviewSince = new Date(Date.now() - RECENT_OVERVIEW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: previousNotifications, error: previousNotificationsError },
    { data: visibleFolders, error: foldersError },
    { data: changedFolders, error: changedFoldersError },
  ] = await Promise.all([
    supabaseAdmin
      .from('notifications')
      .select('title, body, is_published, published_at, mentioned_exam_ids, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_PRIOR_NOTIFICATIONS),
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

  if (previousNotificationsError) {
    await logDraftAttempt({
      status: 'failed',
      errorMessage: previousNotificationsError.message || 'Không thể đọc các thông báo cũ.',
      metadata: { stage: 'previous_notifications', hasChanges: null },
    });
    return NextResponse.json(
      { error: previousNotificationsError.message || 'Không thể đọc các thông báo cũ.' },
      { status: 500 }
    );
  }

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

  const [
    { data: changedExams, error: changedExamsError },
    { data: recentExams, error: recentExamsError },
    { data: recentResolvedReports, error: resolvedReportsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('exams')
      .select('id, title, subject, exam_type, year, folder_id, published, created_at, updated_at')
      .eq('published', true)
      .or(changedAfterFilter)
      .order('updated_at', { ascending: false })
      .limit(MAX_ITEMS * 2),
    supabaseAdmin
      .from('exams')
      .select('id, title, subject, exam_type, year, folder_id, published, created_at, updated_at')
      .eq('published', true)
      .gte('created_at', overviewSince)
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS),
    supabaseAdmin
      .from('question_reports')
      .select('id, exam_id, question_content, exam_title, resolved_at, admin_reply')
      .eq('status', 'resolved')
      .gte('resolved_at', overviewSince)
      .order('resolved_at', { ascending: false })
      .limit(MAX_ITEMS),
  ]);

  if (changedExamsError || recentExamsError) {
    await logDraftAttempt({
      status: 'failed',
      errorMessage: changedExamsError?.message || recentExamsError?.message || 'Không thể đọc đề thi.',
      metadata: { stage: 'exams', hasChanges: null },
    });
    return NextResponse.json(
      { error: changedExamsError?.message || recentExamsError?.message || 'Không thể đọc đề thi.' },
      { status: 500 }
    );
  }

  if (resolvedReportsError) {
    await logDraftAttempt({
      status: 'failed',
      errorMessage: resolvedReportsError.message || 'Không thể đọc câu hỏi vừa sửa.',
      metadata: { stage: 'resolved_reports', hasChanges: null },
    });
    return NextResponse.json(
      { error: resolvedReportsError.message || 'Không thể đọc câu hỏi vừa sửa.' },
      { status: 500 }
    );
  }

  const examsForHome = (changedExams || [])
    .filter((exam) => !exam.folder_id || visibleFolderIds.has(exam.folder_id))
    .slice(0, MAX_ITEMS);
  const recentExamsForHome = (recentExams || [])
    .filter((exam) => !exam.folder_id || visibleFolderIds.has(exam.folder_id))
    .slice(0, MAX_ITEMS);
  const foldersForHome = (changedFolders || []).slice(0, MAX_ITEMS).map(compactFolder);
  const reportExamIds = [...new Set((recentResolvedReports || []).map((report) => report.exam_id).filter(Boolean))];
  let visibleReportExamIds = new Set();

  if (reportExamIds.length > 0) {
    const { data: reportExams, error: reportExamsError } = await supabaseAdmin
      .from('exams')
      .select('id, folder_id, published')
      .in('id', reportExamIds);

    if (reportExamsError) {
      await logDraftAttempt({
        status: 'failed',
        errorMessage: reportExamsError.message || 'Không thể kiểm tra đề của câu hỏi vừa sửa.',
        metadata: { stage: 'resolved_report_exams', hasChanges: null },
      });
      return NextResponse.json(
        { error: reportExamsError.message || 'Không thể kiểm tra đề của câu hỏi vừa sửa.' },
        { status: 500 }
      );
    }

    visibleReportExamIds = new Set((reportExams || [])
      .filter((exam) => exam.published === true && (!exam.folder_id || visibleFolderIds.has(exam.folder_id)))
      .map((exam) => exam.id));
  }

  const resolvedReportsForHome = (recentResolvedReports || [])
    .filter((report) => !report.exam_id || visibleReportExamIds.has(report.exam_id))
    .slice(0, MAX_ITEMS);
  const inputExamRows = uniqueRowsById([...recentExamsForHome, ...examsForHome]);
  const previouslyMentionedExamIds = collectPreviouslyMentionedExamIds(inputExamRows, previousNotifications || []);
  const unmentionedExamRows = inputExamRows.filter((exam) => !previouslyMentionedExamIds.has(exam.id));

  if (unmentionedExamRows.length === 0 && foldersForHome.length === 0 && resolvedReportsForHome.length === 0) {
    await logDraftAttempt({
      status: 'success',
      metadata: {
        hasChanges: false,
        counts: {
          totalExamsInInput: inputExamRows.length,
          unmentionedExamsInInput: 0,
          updatedExamsAfterCutoff: 0,
          foldersInInput: 0,
          resolvedReportsInInput: 0,
        },
      },
    });
    return NextResponse.json({
      hasChanges: false,
      title: '',
      body: '',
      mentionedExamIds: [],
      sourceSummary: 'Không có đề public/locked chưa từng nhắc, thư mục mới hoặc câu hỏi vừa sửa trong 7 ngày gần nhất.',
    });
  }

  const cutoffTime = new Date(cutoff).getTime();
  const newExamCount = unmentionedExamRows.filter((exam) => isAfter(exam.created_at, cutoffTime)).length;
  const updatedExamCount = Math.max(0, unmentionedExamRows.length - newExamCount);

  const sourcePayload = {
    cutoff,
    overviewWindowDays: RECENT_OVERVIEW_DAYS,
    counts: {
      totalExamsInInput: inputExamRows.length,
      unmentionedExamsInInput: unmentionedExamRows.length,
      newExamsCreatedAfterCutoff: newExamCount,
      updatedExamsAfterCutoff: updatedExamCount,
      foldersInInput: foldersForHome.length,
      resolvedReportsInInput: resolvedReportsForHome.length,
      alreadyMentionedExamsInInput: inputExamRows.length - unmentionedExamRows.length,
      previousNotificationsInInput: previousNotifications?.length || 0,
    },
    exams: inputExamRows.map((exam) => compactExam(exam, folderMap, previouslyMentionedExamIds)),
    folders: foldersForHome,
    resolvedReports: resolvedReportsForHome.map(compactResolvedReport),
    previousNotifications: (previousNotifications || []).map(compactNotification),
  };

  const system = `Bạn viết nháp thông báo cho học sinh Việt Nam trên YeuHoc.
Quy tắc:
- Chỉ trả JSON hợp lệ dạng {"title":"...","body":"...","sourceSummary":"...","mentionedExamIds":["..."]}.
- JSON phải nằm trên một object duy nhất, không bọc markdown code fence.
- Tiêu đề tối đa 12 từ.
- Body giọng vui vẻ, thân thiện, gần gũi; xưng hô với người đọc là "anh em", không dùng "bạn", "các bạn", "các em"; được dùng emoji phù hợp.
- Body được dùng Markdown và xuống dòng bằng ký tự \\n trong JSON string.
- Không giới hạn số câu trong body, nhưng viết gọn, dễ đọc, không lan man.
- Dữ liệu exams và resolvedReports là dữ liệu 7 ngày gần nhất; ưu tiên exams có alreadyMentioned=false.
- Không nhắc lại đề có alreadyMentioned=true, trừ khi thật cần làm ngữ cảnh phụ.
- Nói rõ số lượng đề mới/chưa nhắc theo counts.unmentionedExamsInInput hoặc counts.newExamsCreatedAfterCutoff. Nếu có câu hỏi vừa sửa, có thể nhắc ngắn gọn theo counts.resolvedReportsInInput.
- Nêu vài tên đề/thư mục nổi bật nếu dữ liệu có, ưu tiên thông tin hữu ích cho học sinh.
- Đọc previousNotifications và tạo thông báo mới khác các thông báo cũ; không lặp lại tiêu đề, câu mở đầu, cấu trúc body hoặc góc nhấn chính.
- mentionedExamIds phải chứa id của mọi đề trong exams được nhắc trực tiếp trong title/body; nếu không nhắc đề cụ thể thì trả [].
- sourceSummary tóm tắt nguồn dữ liệu nội bộ thật ngắn.
- Không nhắc đến API, prompt, model, JSON, admin, hay dữ liệu nội bộ trong title/body.`;

  const prompt = `Dữ liệu 7 ngày gần nhất từ khối "Đề thi mới tạo" và "Câu hỏi vừa sửa", kèm thông báo cũ để tránh trùng:
${JSON.stringify(sourcePayload, null, 2)}

Hãy viết một nháp thông báo để admin review.`;

  try {
    const result = await generateText({
      model: deepseek(MODEL),
      system,
      prompt,
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
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

    const inputExamIds = new Set(inputExamRows.map((exam) => exam.id));
    const mentionedExamIds = [...new Set([
      ...draft.mentionedExamIds,
      ...inferMentionedExamIdsFromDraft(draft, inputExamRows),
    ])].filter((id) => inputExamIds.has(id));
    const usage = getUsageTokenCounts(result.usage);
    await logDraftAttempt({
      status: 'success',
      ...usage,
      metadata: {
        hasChanges: true,
        counts: sourcePayload.counts,
        mentionedExamIds,
      },
    });

    return NextResponse.json({
      hasChanges: true,
      ...draft,
      mentionedExamIds,
    });
  } catch (error) {
    console.error('Notification draft generation error:', error);
    const message = getGenerationErrorMessage(error);
    await logDraftAttempt({
      status: 'failed',
      errorMessage: message,
      metadata: {
        hasChanges: true,
        counts: sourcePayload.counts,
        stage: 'generate_text',
      },
    });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
