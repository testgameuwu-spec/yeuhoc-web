'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import AuthHeader from '@/components/AuthHeader';
import LogoIcon from '@/components/LogoIcon';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) return 'Vui lòng nhập email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không hợp lệ.';
    if (!password) return 'Vui lòng nhập mật khẩu.';
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const response = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(
        response.status === 429
          ? 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.'
          : result.error || 'Không thể đăng nhập. Vui lòng thử lại.'
      );
      setLoading(false);
      return;
    }

    if (!result.session?.access_token || !result.session?.refresh_token) {
      setError('Không thể tạo phiên đăng nhập. Vui lòng thử lại.');
      setLoading(false);
      return;
    }

    const { supabase } = await import('@/lib/supabase');
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError('Không thể đăng nhập bằng Google. Vui lòng thử lại.');
        setGoogleLoading(false);
      }
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
      <AuthHeader active="login" />

      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">
          {/* ── Card ── */}
          <div className="auth-card">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                <LogoIcon size={20} color="white" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                Đăng nhập
              </h1>
              <p className="text-sm text-gray-500">
                Chào mừng trở lại! Hãy đăng nhập để tiếp tục.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fadeIn">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="auth-btn-google"
            >
              {googleLoading ? (
                <div className="auth-spinner" style={{ borderColor: 'rgba(0,0,0,0.15)', borderTopColor: '#4285f4' }} />
              ) : (
                <>
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Đăng nhập bằng Google
                </>
              )}
            </button>

            {/* Divider */}
            <div className="auth-divider">
              <span>hoặc đăng nhập bằng email</span>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="auth-label">Email</label>
                <div className="auth-input-wrap">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="auth-label" style={{ marginBottom: 0 }}>Mật khẩu</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors no-underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="auth-input-wrap">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer bg-transparent border-0 p-0"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="auth-btn-primary"
              >
                {loading ? (
                  <div className="auth-spinner" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Đăng nhập
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Chưa có tài khoản?{' '}
                <a
                  href="/register"
                  className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors no-underline"
                >
                  Đăng ký ngay <ArrowRight className="w-3.5 h-3.5 inline" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
