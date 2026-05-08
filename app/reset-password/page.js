'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeSlash, WarningCircle as AlertCircle, CheckCircle as CheckCircle2, LockKey } from '@phosphor-icons/react';
import AuthHeader from '@/components/AuthHeader';
import LogoIcon from '@/components/LogoIcon';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');

        // Listen for PASSWORD_RECOVERY event from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setSessionReady(true);
            setChecking(false);
          }
        });

        // Also check if we already have a session (user clicked link and is on the page)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
        }
        setChecking(false);

        return () => subscription.unsubscribe();
      } catch {
        setChecking(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message.toLowerCase().includes('same password')) {
          setError('Mật khẩu mới không được trùng với mật khẩu cũ.');
        } else {
          setError(updateError.message);
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        <AuthHeader active="" />
        <div className="flex items-center justify-center px-4 py-12 sm:py-20">
          <div className="w-full max-w-md">
            <div className="auth-card text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  animation: 'otpSuccessPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                <CheckCircle2 weight="fill" className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Đặt lại mật khẩu thành công! 🎉</h2>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Mật khẩu đã được cập nhật. Đang chuyển hướng...
              </p>
              <div className="auth-spinner mx-auto" style={{ borderTopColor: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' }} />
            </div>
          </div>
        </div>
        <style jsx global>{`
          @keyframes otpSuccessPop {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Checking session
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        <AuthHeader active="" />
        <div className="flex items-center justify-center px-4 py-12 sm:py-20">
          <div className="w-full max-w-md">
            <div className="auth-card text-center">
              <div className="auth-spinner mx-auto mb-4" style={{ borderTopColor: '#6366f1', borderColor: 'rgba(99, 102, 241, 0.2)' }} />
              <p className="text-sm text-gray-500">Đang xác thực phiên...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No valid session
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        <AuthHeader active="" />
        <div className="flex items-center justify-center px-4 py-12 sm:py-20">
          <div className="w-full max-w-md">
            <div className="auth-card text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                <AlertCircle weight="fill" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Link không hợp lệ</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu gửi lại.
              </p>
              <Link
                href="/forgot-password"
                className="auth-btn-primary no-underline inline-flex"
                style={{ width: 'auto', display: 'inline-flex' }}
              >
                Gửi lại link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  const strength = password.length >= 12 ? 4 : password.length >= 8 ? 3 : password.length >= 6 ? 2 : 1;

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
      <AuthHeader active="" />

      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">
          <div className="auth-card">
            {/* Header */}
            <div className="text-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                <LockKey weight="fill" className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                Đặt lại mật khẩu
              </h1>
              <p className="text-sm text-gray-500">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fadeIn">
                <AlertCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="auth-label">Mật khẩu mới</label>
                <div className="auth-input-wrap">
                  <Lock weight="duotone" className="w-[18px] h-[18px] text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="auth-input"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer bg-transparent border-0 p-0"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password Strength */}
                {password && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map((i) => {
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
                <label className="auth-label">Xác nhận mật khẩu mới</label>
                <div className="auth-input-wrap">
                  <Lock weight="duotone" className="w-[18px] h-[18px] text-gray-400" />
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
                    {showConfirm ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle weight="fill" className="w-3 h-3" /> Mật khẩu không khớp
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-btn-primary"
              >
                {loading ? (
                  <div className="auth-spinner" />
                ) : (
                  <>
                    <LockKey weight="fill" className="w-4 h-4" />
                    Đặt lại mật khẩu
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
