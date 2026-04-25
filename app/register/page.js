'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, UserPlus, Eye, EyeOff, BookOpen, AlertCircle,
  ArrowRight, User, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!fullName.trim()) return 'Vui lòng nhập họ tên.';
    if (fullName.trim().length < 2) return 'Họ tên phải có ít nhất 2 ký tự.';
    if (!email.trim()) return 'Vui lòng nhập email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không hợp lệ.';
    if (!password) return 'Vui lòng nhập mật khẩu.';
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp.';
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: email.split('@')[0],
        },
      },
    });

    if (authError) {
      setError(
        authError.message === 'User already registered'
          ? 'Email này đã được sử dụng.'
          : authError.message
      );
      setLoading(false);
      return;
    }

    if (data && data.session) {
      // Auto logged in because email confirmation is disabled
      window.location.href = '/yeuhoc/';
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  // ── Success screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <Navbar />
        <div className="flex items-center justify-center px-4 py-12 sm:py-20">
          <div className="w-full max-w-md">
            <div className="auth-card text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Đăng ký thành công! 🎉</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Chúng tôi đã gửi email xác nhận đến <strong className="text-gray-700">{email}</strong>.
                Vui lòng kiểm tra hộp thư và nhấn vào liên kết xác nhận để kích hoạt tài khoản.
              </p>
              <a
                href="/yeuhoc/login"
                className="auth-btn-primary inline-flex no-underline"
              >
                Đi đến Đăng nhập <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <Navbar />

      <div className="flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">
          {/* ── Card ── */}
          <div className="auth-card">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                <BookOpen className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                Tạo tài khoản
              </h1>
              <p className="text-sm text-gray-500">
                Đăng ký miễn phí để bắt đầu luyện thi ngay!
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
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="auth-label">Họ và tên</label>
                <div className="auth-input-wrap">
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="auth-input"
                    autoComplete="name"
                  />
                </div>
              </div>

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
                    placeholder="Tối thiểu 6 ký tự"
                    className="auth-input"
                    autoComplete="new-password"
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
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map((i) => {
                      const strength = password.length >= 12 ? 4 : password.length >= 8 ? 3 : password.length >= 6 ? 2 : 1;
                      const colors = ['bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-400'];
                      return (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength ? colors[strength - 1] : 'bg-gray-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="auth-label">Xác nhận mật khẩu</label>
                <div className="auth-input-wrap">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="auth-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer bg-transparent border-0 p-0"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Mật khẩu không khớp
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="auth-btn-primary"
              >
                {loading ? (
                  <div className="auth-spinner" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Đăng ký
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Đã có tài khoản?{' '}
                <a
                  href="/yeuhoc/login"
                  className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors no-underline"
                >
                  Đăng nhập <ArrowRight className="w-3.5 h-3.5 inline" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
