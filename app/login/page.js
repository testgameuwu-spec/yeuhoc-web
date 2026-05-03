'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Eye, EyeOff, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import LogoIcon from '@/components/LogoIcon';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu không đúng.'
          : authError.message
      );
      setLoading(false);
      return;
    }

    window.location.href = '/yeuhoc/';
  };

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <Navbar />

      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">
          {/* ── Card ── */}
          <div className="auth-card">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                <LogoIcon size={1000} color="white" />
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
                <label className="auth-label">Mật khẩu</label>
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
                disabled={loading}
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
                  href="/yeuhoc/register"
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
