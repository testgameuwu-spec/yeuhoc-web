import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON không hợp lệ.' }, { status: 400 });
  }

  const { currentPassword, newPassword, accessToken } = body || {};

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Không tìm thấy phiên đăng nhập.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Lỗi cấu hình server.' }, { status: 500 });
  }

  // Step 1: Verify the current password by attempting to sign in
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get user info from the access token
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: userError } = await adminSupabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ.' }, { status: 401 });
  }

  // Verify current password by trying to sign in
  const { error: signInError } = await anonSupabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng.' }, { status: 400 });
  }

  // Step 2: Update the password using admin client
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: 'Không thể cập nhật mật khẩu: ' + updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Đã đổi mật khẩu thành công.' });
}
