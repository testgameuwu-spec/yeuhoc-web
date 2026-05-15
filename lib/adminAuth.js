import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function authError(message, status) {
  return Response.json({ error: message }, { status });
}

export async function requireAdmin(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { errorResponse: authError('Bạn cần đăng nhập để dùng API admin.', 401) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { errorResponse: authError('Thiếu cấu hình Supabase admin trên server.', 500) };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return { errorResponse: authError('Phiên đăng nhập không hợp lệ.', 401) };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Admin role check error:', profileError);
    return { errorResponse: authError('Không thể kiểm tra quyền admin.', 500) };
  }

  if (profile?.role !== 'admin') {
    return { errorResponse: authError('Bạn không có quyền admin.', 403) };
  }

  return { supabaseAdmin, user, profile };
}
