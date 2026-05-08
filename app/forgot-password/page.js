'use client';

import { useState } from 'react';
import { Envelope as Mail, ArrowLeft, WarningCircle as AlertCircle, CheckCircle as CheckCircle2, PaperPlaneTilt } from '@phosphor-icons/react';
import AuthHeader from '@/components/AuthHeader';
import LogoIcon from '@/components/LogoIcon';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email không hợp lệ.');
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        const msg = resetError.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('email rate limit')) {
          setError('Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại.');
        } else {
          setError(resetError.message);
        }
      } else {
        setSent(true);
      }
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        <AuthHeader active="" />
        <div className="flex items-center justify-center px-4 py-12 sm:py-20">
          <div className="w-full max-w-md">
            <div className="auth-card text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  animation: 'otpSuccessPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                <PaperPlaneTilt weight="fill" className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email đã được gửi! ✉️</h2>
              <p className="text-sm text-gray-500 mb-2 leading-relaxed">
                Chúng tôi đã gửi link đặt lại mật khẩu đến
              </p>
              <p className="text-sm font-semibold text-indigo-600 mb-4">{email}</p>
              <p className="text-xs text-gray-400 mb-6">
                Vui lòng kiểm tra hộp thư (bao gồm thư mục spam). Link có hiệu lực trong 1 giờ.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors no-underline"
              >
                <ArrowLeft weight="bold" className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>
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

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
      <AuthHeader active="" />

      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">
          <div className="auth-card">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                <LogoIcon size={20} color="white" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                Quên mật khẩu
              </h1>
              <p className="text-sm text-gray-500">
                Nhập email đăng ký để nhận link đặt lại mật khẩu.
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
              <div>
                <label className="auth-label">Email</label>
                <div className="auth-input-wrap">
                  <Mail weight="duotone" className="w-[18px] h-[18px] text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
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
                    <PaperPlaneTilt weight="fill" className="w-4 h-4" />
                    Gửi link đặt lại
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors no-underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
