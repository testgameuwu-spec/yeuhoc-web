export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OCR_LOG_TABLE = 'ocr_import_logs';

async function deleteOcrLogByRequestId(requestId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${OCR_LOG_TABLE}?request_id=eq.${encodeURIComponent(requestId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Xóa OCR log thất bại: ${text.slice(0, 300)}`);
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
  if (!requestId) {
    return Response.json({ error: 'Thiếu requestId.' }, { status: 400 });
  }

  try {
    await deleteOcrLogByRequestId(requestId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Không thể xóa OCR log.' }, { status: 500 });
  }
}
