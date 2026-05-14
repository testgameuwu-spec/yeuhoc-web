'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleNotch as Loader2, WarningCircle as AlertCircle } from '@phosphor-icons/react';
import Link from 'next/link';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');

        // Check if there's a code in the URL (PKCE flow)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          // Exchange auth code for session using client-side Supabase
          // The code verifier is automatically retrieved from localStorage by the SDK
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setError('Không thể xác thực. Vui lòng thử lại.');
            return;
          }

          if (data?.session) {
            // Success! Redirect to home
            window.location.href = '/';
            return;
          }
        }

        // Also check for hash-based tokens (implicit flow fallback)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          // Let Supabase detect the session from the URL hash automatically
          // (detectSessionInUrl is enabled in the client config)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Không thể tạo phiên đăng nhập.');
            return;
          }

          if (session) {
            window.location.href = '/';
            return;
          }
        }

        // If no code or hash, wait a moment for auth state change
        // (Supabase might still be processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe();
            window.location.href = '/';
          }
        });

        // Timeout after 8 seconds
        setTimeout(() => {
          subscription.unsubscribe();
          // Last check before giving up
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              window.location.href = '/';
            } else {
              setError('Phiên đăng nhập đã hết hạn. Vui lòng thử lại.');
            }
          });
        }, 8000);

      } catch (err) {
        console.error('Callback error:', err);
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        <div className="auth-card text-center max-w-md w-full">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            <AlertCircle weight="fill" className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Đăng nhập thất bại</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <Link
            href="/login"
            className="auth-btn-primary no-underline inline-flex"
            style={{ width: 'auto', display: 'inline-flex' }}
          >
            Thử lại
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
      <Loader2 weight="bold" className="w-12 h-12 text-[var(--home-brand-primary)] animate-spin mb-4" />
      <p className="text-gray-500 font-medium animate-pulse">Đang xác thực...</p>
    </div>
  );
}
