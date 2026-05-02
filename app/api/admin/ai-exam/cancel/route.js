export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OCR_LOG_TABLE = 'ocr_import_logs';

async function upsertOcrLog(payload) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${OCR_LOG_TABLE}?on_conflict=request_id`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([payload]),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Không thể cập nhật trạng thái hủy OCR: ${text.slice(0, 300)}`);
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body JSON không hợp lệ.' }, { status: 400 });
  }

  const requestId = (body?.requestId || '').trim();
  const cancelledBy = (body?.cancelledBy || 'user').trim();
  if (!requestId) {
    return Response.json({ error: 'Thiếu requestId.' }, { status: 400 });
  }

  try {
    await upsertOcrLog({
      request_id: requestId,
      status: 'failed',
      stage: cancelledBy === 'admin' ? 'cancelled_by_admin' : 'cancelled_by_user',
      error_message: cancelledBy === 'admin' ? 'Đã hủy bởi admin.' : 'Đã hủy bởi người dùng.',
      duration_ms: 0,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Không thể hủy OCR.' }, { status: 500 });
  }
}
