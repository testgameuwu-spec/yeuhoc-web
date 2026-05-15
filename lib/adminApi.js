import { supabase } from '@/lib/supabase';

export async function getAdminApiHeaders(headers = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return {
    ...headers,
    Authorization: `Bearer ${session.access_token}`,
  };
}
