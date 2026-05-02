import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ai-exam/logs/detail?requestId=xxx
 * 
 * Fetches the full OCR log entry (including structured_text) using the
 * service role key so it bypasses RLS. This is the fallback when the
 * frontend Supabase client can't read structured_text due to RLS or
 * payload size limits.
 */
export async function GET(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase config on server.' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json({ error: 'Missing requestId param.' }, { status: 400 });
  }

  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/ocr_import_logs?request_id=eq.${encodeURIComponent(requestId)}&select=request_id,status,stage,structured_text,image_candidates,question_count,file_name,used_ocr,duration_ms&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Supabase query failed: ${response.status}`, detail: text.slice(0, 500) },
        { status: 502 },
      );
    }

    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;

    if (!row) {
      return NextResponse.json({ error: 'Log not found.' }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('OCR log detail fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
