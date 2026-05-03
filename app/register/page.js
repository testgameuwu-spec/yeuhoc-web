'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, UserPlus, Eye, EyeOff, BookOpen, AlertCircle,
  ArrowRight, User, CheckCircle2, ShieldCheck, RefreshCw, ArrowLeft,
} from 'lucide-react';
import LogoIcon from '@/components/LogoIcon';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

const OTP_LENGTH = 8;
const RESEND_COOLDOWN = 60; // seconds

export default function RegisterPage() {
  const router = useRouter();

  // ── Registration form state ──
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── OTP verification state ──
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef([]);

  // ── Resend cooldown timer ──
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Auto-focus first OTP input when OTP screen shows ──
  useEffect(() => {
    if (otpSent && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [otpSent]);

  // ── Validation ──
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

  // ── Handle Registration (Step 1) ──
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
      const msg = authError.message.toLowerCase();
      let friendlyMsg = authError.message;
      if (msg.includes('user already registered')) {
        friendlyMsg = 'Email này đã được sử dụng.';
      } else if (msg.includes('rate limit') || msg.includes('email rate limit')) {
        friendlyMsg = 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại.';
      } else if (msg.includes('signup is disabled')) {
        friendlyMsg = 'Chức năng đăng ký đang tạm thời bị tắt.';
      }
      setError(friendlyMsg);
      setLoading(false);
      return;
    }

    if (data && data.session) {
      // Auto logged in because email confirmation is disabled
      window.location.href = '/yeuhoc/';
      return;
    }

    // OTP was sent via email — show OTP input screen
    setOtpSent(true);
    setResendCooldown(RESEND_COOLDOWN);
    setLoading(false);
  };

  // ── Handle OTP input ──
  const handleOtpChange = useCallback((index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    setOtp((prev) => {
      const newOtp = [...prev];
      newOtp[index] = digit;
      return newOtp;
    });

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleOtpPaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  }, []);

  // ── Verify OTP (Step 2) ──
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setOtpError('Vui lòng nhập đủ 8 chữ số.');
      return;
    }

    setVerifying(true);
    setOtpError('');

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode,
      type: 'email',
    });

    if (verifyError) {
      setOtpError(
        verifyError.message === 'Token has expired or is invalid'
          ? 'Mã xác nhận không đúng hoặc đã hết hạn. Vui lòng thử lại.'
          : verifyError.message
      );
      setOtp(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
      setVerifying(false);
      return;
    }

    // Verified successfully!
    setVerified(true);
    setVerifying(false);

    // Redirect after a short delay to show success animation
    setTimeout(() => {
      window.location.href = '/yeuhoc/';
    }, 1500);
  };

  // ── Resend OTP ──
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setOtpError('');
    setResendCooldown(RESEND_COOLDOWN);

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });

    if (resendError) {
      const msg = resendError.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('email rate limit')) {
        setOtpError('Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại.');
      } else {
        setOtpError('Không thể gửi lại mã. Vui lòng thử lại sau.');
      }
      setResendCooldown(0);
    }
  };

  // ── Back to register form ──
  const handleBackToRegister = () => {
    setOtpSent(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError('');
    setResendCooldown(0);
  };

  // ══════════════════════════════════════════
  // ── SCREEN 3: Verified Success ──
  // ══════════════════════════════════════════
  if (verified) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <Navbar />
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
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Xác thực thành công! 🎉</h2>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng...
              </p>
              <div className="auth-spinner mx-auto" style={{ borderTopColor: '#22c55e' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // ── SCREEN 2: OTP Verification ──
  // ══════════════════════════════════════════
  if (otpSent) {
    const otpCode = otp.join('');
    const isOtpComplete = otpCode.length === OTP_LENGTH;

    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <Navbar />
        <div className="flex items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-md">
            <div className="auth-card">
              {/* Header */}
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  }}
                >
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                  Xác thực Email
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Chúng tôi đã gửi mã xác nhận 8 số đến
                </p>
                <p className="text-sm font-semibold text-indigo-600 mt-1">
                  {email}
                </p>
              </div>

              {/* OTP Error */}
              {otpError && (
                <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fadeIn">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* OTP Inputs */}
              <div className="flex justify-center gap-1 sm:gap-2 mb-6 px-1">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    disabled={verifying}
                    className="otp-input flex-1 min-w-0"
                    style={{
                      maxWidth: '48px',
                      height: 'clamp(40px, 12vw, 56px)',
                      textAlign: 'center',
                      fontSize: 'clamp(16px, 5vw, 22px)',
                      fontWeight: '700',
                      borderRadius: 'clamp(8px, 2vw, 12px)',
                      border: digit
                        ? '2px solid #6366f1'
                        : '2px solid #e5e7eb',
                      background: digit ? '#eef2ff' : '#f9fafb',
                      color: '#1f2937',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      caretColor: '#6366f1',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = digit ? '#6366f1' : '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!isOtpComplete || verifying}
                className="auth-btn-primary"
                style={{
                  opacity: isOtpComplete && !verifying ? 1 : 0.5,
                  cursor: isOtpComplete && !verifying ? 'pointer' : 'not-allowed',
                }}
              >
                {verifying ? (
                  <div className="auth-spinner" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Xác nhận
                  </>
                )}
              </button>

              {/* Resend & Back */}
              <div className="mt-6 text-center space-y-3">
                {/* Resend */}
                <p className="text-sm text-gray-500">
                  Không nhận được mã?{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-400">
                      Gửi lại sau <span className="font-semibold text-indigo-500">{resendCooldown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors bg-transparent border-0 p-0 cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Gửi lại mã
                    </button>
                  )}
                </p>

                {/* Back to register */}
                <button
                  type="button"
                  onClick={handleBackToRegister}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-0 p-0 cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Quay lại đăng ký
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* OTP specific animations */}
        <style jsx global>{`
          @keyframes otpSuccessPop {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
          .otp-input::selection {
            background: rgba(99, 102, 241, 0.2);
          }
          .otp-input:focus {
            border-color: #6366f1 !important;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
          }
        `}</style>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // ── SCREEN 1: Registration Form ──
  // ══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <Navbar />

      <div className="flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">
          {/* ── Card ── */}
          <div className="auth-card">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                  <LogoIcon size={20} color="white" />
                </div>
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
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? colors[strength - 1] : 'bg-gray-200'
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
