import { createClient } from '@supabase/supabase-js';

// Các biến này cần được thêm vào file .env.local
// Lưu ý: NEXT_PUBLIC_ sẽ được công khai ở phía client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (typeof window !== 'undefined') {
  if (supabaseUrl.includes('placeholder')) {
    console.warn('⚠️ Supabase URL is missing! Authentication will not work.');
    console.log('Check your GitHub Secrets or .env.local file.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, { ...options, cache: 'no-store' });
    }
  }
});
