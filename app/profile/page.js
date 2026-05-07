'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Mail, Camera, LogOut, Save, Shield, BookOpen,
  AlertCircle, CheckCircle2, Loader2, FileText, History, Activity, PauseCircle, PlayCircle, Flag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import QuestionCard from '@/components/QuestionCard';
import { ChevronRight, X } from 'lucide-react';
import { markResolvedReportsAsSeen } from '@/lib/reportSeenStorage';

const REPORT_REASON_LABELS = {
  wrong_question: 'Sai đề / Đề bị lỗi',
  wrong_answer: 'Sai đáp án',
  wrong_solution: 'Sai lời giải',
  unclear: 'Đề không rõ ràng',
  missing_image: 'Thiếu hình ảnh',
  other: 'Lý do khác',
};

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | info | history | reports
  const [pausedExams, setPausedExams] = useState([]);
  const [myReports, setMyReports] = useState([]);

  const dataLoadedRef = useRef(false);
  const avatarFileInputRef = useRef(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'reports') setActiveTab('reports');
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== 'reports') return;
    const resolvedIds = myReports.filter((r) => r.status === 'resolved' && r.id).map((r) => r.id);
    if (resolvedIds.length) markResolvedReportsAsSeen(resolvedIds);
  }, [activeTab, myReports]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async (sessionUser) => {
      if (dataLoadedRef.current || !isMounted) return;
      dataLoadedRef.current = true; // Prevent double fetching immediately

      setUser(sessionUser);

      try {
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        const historyPromise = supabase
          .from('exam_attempts')
          .select('*, exams(title, subject)')
          .eq('user_id', sessionUser.id)
          .order('created_at', { ascending: false });

        const reportsPromise = supabase
          .from('question_reports')
          .select('id, exam_id, question_id, question_content, reason, note, exam_title, status, resolved_at, created_at, admin_reply, admin_replied_at')
          .eq('user_id', sessionUser.id)
          .order('created_at', { ascending: false });

        const [profileRes, historyRes, reportsRes] = await Promise.allSettled([profilePromise, historyPromise, reportsPromise]);

        const keys = Object.keys(localStorage);
        const prefix = `yeuhoc_progress_${sessionUser.id}_`;
        const savedExamIds = [];
        keys.forEach(k => {
          if (k.startsWith(prefix)) {
            savedExamIds.push(k.substring(prefix.length));
          }
        });

        if (isMounted) {
          if (savedExamIds.length > 0) {
            const { data } = await supabase.from('exams').select('id, title, subject').in('id', savedExamIds);
            if (data) setPausedExams(data);
          }

          if (profileRes.status === 'fulfilled' && profileRes.value.data) {
            const profileData = profileRes.value.data;
            setProfile(profileData);
            setFullName(profileData.full_name || '');
            setUsername(profileData.username || '');
            setBio(profileData.bio || '');
            setAvatarUrl(profileData.avatar_url || '');
          }

          if (historyRes.status === 'fulfilled' && historyRes.value.data) {
            setAttempts(historyRes.value.data);
          }

          if (reportsRes.status === 'fulfilled' && reportsRes.value.data) {
            setMyReports(reportsRes.value.data);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const init = async () => {
      try {
        // 1. Dùng getSession() để lấy ngay session hiện tại (không phụ thuộc event)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          if (isMounted) window.location.href = '/login';
          return;
        }

        // 2. Fetch dữ liệu
        await loadData(session.user);
      } catch (err) {
        console.error("Lỗi khởi tạo session:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    // 3. Lắng nghe thay đổi đăng xuất (nếu có)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login';
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Dự phòng trường hợp getSession() bị miss
        // loadData sẽ tự kiểm tra dataLoadedRef để không fetch 2 lần
        loadData(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const reportChannel = supabase
      .channel(`profile-question-reports-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'question_reports',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setMyReports((prev) => {
            let nextReports = prev;
            if (payload.eventType === 'INSERT' && payload.new) {
              nextReports = [payload.new, ...prev.filter((r) => r.id !== payload.new.id)];
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              nextReports = prev.map((r) => (r.id === payload.new.id ? payload.new : r));
            } else if (payload.eventType === 'DELETE' && payload.old?.id) {
              nextReports = prev.filter((r) => r.id !== payload.old.id);
            }
            return [...nextReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          });
          window.dispatchEvent(new Event('yeuhoc-reports-seen'));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportChannel);
    };
  }, [user?.id]);

  const handleViewAttemptDetails = async (attempt) => {
    setSelectedAttempt(attempt);
    setLoadingDetails(true);
    try {
      const { data: examData } = await supabase
        .from('exams')
        .select('*, questions(*)')
        .eq('id', attempt.exam_id)
        .single();
      
      if (examData) {
        // Map DB column names to JS property names for TF questions
        const mappedExam = {
          ...examData,
          questions: (examData.questions || []).map(q => {
            const tfSubs = q.tf_sub_questions || undefined;
            const stmts = q.statements || undefined;
            // Reconstruct TF answer object from tfSubQuestions
            let answer = q.answer;
            if (q.type === 'TF' && tfSubs && Array.isArray(tfSubs)) {
              const obj = {};
              tfSubs.forEach((sub, i) => {
                const letter = String.fromCharCode(97 + i);
                obj[letter] = sub.answer ? 'D' : 'S';
              });
              answer = obj;
            }
            return {
              ...q,
              answer,
              tfSubQuestions: tfSubs,
              statements: stmts,
            };
          })
        };
        setAttemptDetails({
          exam: mappedExam,
          answers: attempt.user_answers || {}
        });
      } else {
        alert("Không tìm thấy chi tiết đề thi.");
      }
    } catch (e) {
      alert("Lỗi khi tải chi tiết đề thi.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Vui lòng chọn file hình ảnh hợp lệ.' });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Kích thước ảnh tối đa là 2MB.' });
        return;
      }

      setUploadingAvatar(true);
      setMessage({ type: '', text: '' });

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setMessage({ type: 'success', text: 'Đã tải ảnh lên! Hãy nhấn Cập nhật để lưu lại.' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: 'Lỗi tải ảnh lên: ' + error.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!fullName.trim()) {
      return setMessage({ type: 'error', text: 'Vui lòng nhập họ tên.' });
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq('id', user.id);

      if (error) {
        setMessage({ type: 'error', text: 'Lưu thất bại: ' + error.message });
      } else {
        setMessage({ type: 'success', text: 'Đã lưu thay đổi!' });
        // Cập nhật lại state nội bộ
        setProfile(prev => ({
          ...prev,
          full_name: fullName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim()
        }));
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi hệ thống.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const isAdmin = profile?.role === 'admin';


  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Đang tải dữ liệu hồ sơ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Hồ sơ cá nhân</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý thông tin tài khoản của bạn</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Left Sidebar: Avatar & Info ─── */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar || !user}
                />
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-28 h-28 rounded-full object-cover ring-4 ring-indigo-100 shadow-lg"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-indigo-100 shadow-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  title="Đổi ảnh đại diện"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar || !user}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Name */}
              <h2 className="text-lg font-bold text-gray-900 mb-0.5">{displayName}</h2>
              <p className="text-xs text-gray-400 mb-3">{user?.email}</p>

              {/* Role Badge */}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <User className="w-3.5 h-3.5" />
                  User
                </span>
              )}

              {/* Stats */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                  <BookOpen className="w-3.5 h-3.5" />
                  Thành viên từ {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
                    : '—'}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          </div>

          {/* ─── Right Content ─── */}
          <div className="flex-1 space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Activity className="w-4 h-4" /> Tổng quan
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <History className="w-4 h-4" /> Lịch sử làm bài
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'reports' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Flag className="w-4 h-4" /> Báo cáo câu hỏi
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" /> Thông tin cá nhân
              </button>
            </div>

            {/* Content */}
            {activeTab === 'overview' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Tổng quan học tập
                </h3>
                <p className="text-xs text-gray-400 mb-6">Thống kê và tiến trình học tập của bạn</p>

                {(() => {
                  const highestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score || 0)).toFixed(1) : 0;
                  const averageScore = attempts.length > 0 ? (attempts.reduce((acc, a) => acc + (a.score || 0), 0) / attempts.length).toFixed(1) : 0;
                  const totalExams = attempts.length;
                  const recentAttempts = attempts.slice(0, 5);

                  return (
                    <div className="space-y-8">
                      {/* Stats grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                          <p className="text-xs text-indigo-600 font-semibold mb-1 uppercase tracking-wider">Điểm cao nhất</p>
                          <p className="text-2xl font-black text-indigo-700">{highestScore}</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                          <p className="text-xs text-green-600 font-semibold mb-1 uppercase tracking-wider">Điểm trung bình</p>
                          <p className="text-2xl font-black text-green-700">{averageScore}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                          <p className="text-xs text-amber-600 font-semibold mb-1 uppercase tracking-wider">Số bài đã làm</p>
                          <p className="text-2xl font-black text-amber-700">{totalExams}</p>
                        </div>
                      </div>

                      {/* Paused Exams */}
                      {pausedExams.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <PauseCircle className="w-4 h-4 text-amber-500" /> Bài thi đang bỏ dở
                          </h4>
                          <div className="space-y-3">
                            {pausedExams.map(exam => (
                              <div key={exam.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors gap-4 shadow-sm">
                                <div>
                                  <h4 className="font-bold text-gray-900">{exam.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><BookOpen className="w-3 h-3"/> {exam.subject}</p>
                                </div>
                                <button onClick={() => router.push(`/de-thi/${exam.id}?resume=1`)} className="px-4 py-2 rounded-lg font-bold text-xs bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                  <PlayCircle className="w-4 h-4" /> Tiếp tục làm
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Recent Exams */}
                      {recentAttempts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <History className="w-4 h-4 text-indigo-500" /> 5 Đề thi gần nhất
                          </h4>
                          <div className="space-y-3">
                            {recentAttempts.map((attempt, index) => (
                                <div key={attempt.id || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all gap-4">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{attempt.exams?.title || 'Đề thi đã bị xóa'}</h4>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {attempt.exams?.subject || 'Không rõ'}</span>
                                      <span>•</span>
                                      <span>{new Date(attempt.created_at).toLocaleDateString('vi-VN')} {new Date(attempt.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                                    <div className="text-center">
                                      <p className="text-xs text-gray-400 mb-0.5">Số điểm</p>
                                      <p className="font-black text-indigo-600">{attempt.score?.toFixed(1) || 0}</p>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200"></div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-400 mb-0.5">Đúng</p>
                                      <p className="font-bold text-gray-900">{attempt.correct_answers}/{attempt.total_questions}</p>
                                    </div>
                                    <button
                                      onClick={() => handleViewAttemptDetails(attempt)}
                                      className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors flex items-center gap-1"
                                    >
                                      Chi tiết <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {attempts.length === 0 && pausedExams.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 font-medium">Bạn chưa tham gia học tập</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === 'reports' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-indigo-500" />
                  Báo cáo của tôi
                </h3>
                <p className="text-xs text-gray-400 mb-6">
                  Danh sách câu hỏi bạn đã báo cáo và trạng thái xử lý. Khi chuyển sang trạng thái đã xử lý, bạn sẽ thấy tại đây; nếu đang mở trang đề thi, ứng dụng có thể báo ngay khi Supabase Realtime được bật cho bảng báo cáo.
                </p>

                {myReports.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {myReports.map((r) => {
                      const rawContent = (r.question_content || '').replace(/\s+/g, ' ').trim();
                      const preview = rawContent.slice(0, 120);
                      const previewTruncated = rawContent.length > 120;
                      const reasonLabel = REPORT_REASON_LABELS[r.reason] || r.reason;
                      const isPending = r.status === 'pending';
                      const hasAdminReply = Boolean(r.admin_reply);
                      return (
                        <div
                          key={r.id}
                          className="p-3.5 sm:p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{r.exam_title || 'Đề thi'}</p>
                              <p className="text-sm text-gray-900 font-medium line-clamp-2">
                                {preview || '(Không có nội dung câu)'}
                                {previewTruncated ? '…' : ''}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                Lý do: <span className="text-gray-700">{reasonLabel}</span>
                                {r.note ? (
                                  <span className="block mt-1 italic">Ghi chú: {r.note}</span>
                                ) : null}
                              </p>
                              {hasAdminReply && (
                                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                                    Phản hồi từ Đội ngũ YeuHoc
                                  </p>
                                  <p className="text-xs text-emerald-800 mt-1">{r.admin_reply}</p>
                                </div>
                              )}
                            </div>
                            <div className="w-full sm:w-auto flex flex-col sm:items-end gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                              <span
                                className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-green-100 text-green-800 border border-green-200'
                                }`}
                              >
                                {isPending ? 'Đang chờ xử lý' : 'Đã xử lý'}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                Gửi {new Date(r.created_at).toLocaleString('vi-VN')}
                              </span>
                              {!isPending && r.resolved_at && (
                                <span className="text-[11px] text-gray-500">
                                  Xử lý {new Date(r.resolved_at).toLocaleString('vi-VN')}
                                </span>
                              )}
                              {hasAdminReply && r.admin_replied_at && (
                                <span className="text-[11px] text-emerald-600">
                                  Phản hồi {new Date(r.admin_replied_at).toLocaleString('vi-VN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Bạn chưa gửi báo cáo nào</p>
                    <p className="text-xs text-gray-400 mt-1">Khi làm bài, dùng mục báo cáo trên từng câu hỏi để gửi phản hồi.</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'info' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Cập nhật thông tin
                </h3>
                <p className="text-xs text-gray-400 mb-6">Chỉnh sửa thông tin cá nhân hiển thị trên hồ sơ</p>

              {/* Message Alert */}
              {message.text && (
                <div
                  className={`flex items-start gap-2.5 p-3.5 mb-5 rounded-xl text-sm animate-fadeIn ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                {/* Email (read-only) */}
                <div>
                  <label className="auth-label">Email</label>
                  <div className="auth-input-wrap bg-gray-50 cursor-not-allowed">
                    <Mail className="w-4 h-4 text-gray-300" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="auth-input bg-transparent text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Email không thể thay đổi</p>
                </div>

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
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="auth-label">Tên người dùng</label>
                  <div className="auth-input-wrap">
                    <span className="text-gray-400 text-sm font-medium">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="username"
                      className="auth-input"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Chỉ chữ cái, số và dấu gạch dưới</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="auth-label">Giới thiệu</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Viết vài dòng về bản thân..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                    style={{ fontFamily: 'inherit' }}
                  />
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{bio.length}/200</p>
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="auth-label">Ảnh đại diện</label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="relative flex-shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Preview"
                          className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold border border-gray-200 shadow-sm">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                        <Camera className="w-4 h-4 text-gray-500" />
                        <span>Tải ảnh mới lên</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                      </label>
                      <p className="text-[11px] text-gray-400 mt-1.5">PNG, JPG tối đa 2MB. Tỉ lệ 1:1.</p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="auth-btn-primary"
                >
                  {saving ? (
                    <div className="auth-spinner" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Cập nhật thông tin
                    </>
                  )}
                </button>
              </form>
            </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  Lịch sử làm bài
                </h3>
                <p className="text-xs text-gray-400 mb-6">Danh sách các đề thi bạn đã hoàn thành</p>

                {loadingAttempts ? (
                  <div className="py-16 flex justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : historyError ? (
                  <div className="py-12 text-center border-2 border-dashed border-red-200 rounded-2xl bg-red-50">
                    <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
                    <p className="text-sm text-red-600 font-medium">{historyError}</p>
                    <button
                      onClick={() => setActiveTab('info')}
                      className="mt-3 text-xs text-red-500 underline hover:text-red-700"
                    >
                      Quay lại thông tin cá nhân
                    </button>
                  </div>
                ) : attempts.length > 0 ? (
                  <div className="space-y-4">
                    {attempts.map((attempt, index) => (
                      <div key={attempt.id || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{attempt.exams?.title || 'Đề thi đã bị xóa'}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {attempt.exams?.subject || 'Không rõ'}</span>
                            <span>•</span>
                            <span>{new Date(attempt.created_at).toLocaleDateString('vi-VN')} {new Date(attempt.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm flex-shrink-0">
                          <div className="text-center">
                            <p className="text-xs text-gray-400 mb-0.5">Số điểm</p>
                            <p className="font-black text-indigo-600">{attempt.score?.toFixed(1) || 0}</p>
                          </div>
                          <div className="w-px h-8 bg-gray-200"></div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400 mb-0.5">Đúng</p>
                            <p className="font-bold text-gray-900">{attempt.correct_answers}/{attempt.total_questions}</p>
                          </div>
                          <div className="w-px h-8 bg-gray-200"></div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400 mb-0.5">Thời gian</p>
                            <p className="font-bold text-gray-900">{Math.floor(attempt.time_spent / 60)}p {attempt.time_spent % 60}s</p>
                          </div>
                          <button
                            onClick={() => handleViewAttemptDetails(attempt)}
                            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors flex items-center gap-1"
                          >
                            Chi tiết <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Bạn chưa làm bài thi nào</p>
                    <p className="text-xs text-gray-400 mt-1">Hãy ra trang chủ và thử sức với một đề thi nhé!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attempt Details Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8f9fb] animate-fadeIn">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Chi tiết bài làm: {selectedAttempt.exams?.title}
              </h2>
              <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                <span>Điểm: <span className="font-bold text-indigo-600">{selectedAttempt.score?.toFixed(1)}</span></span>
                <span>Số câu đúng: <span className="font-bold text-green-600">{selectedAttempt.correct_answers}/{selectedAttempt.total_questions}</span></span>
                <span>Thời gian: {Math.floor(selectedAttempt.time_spent / 60)}p {selectedAttempt.time_spent % 60}s</span>
              </div>
            </div>
            <button
              onClick={() => { setSelectedAttempt(null); setAttemptDetails(null); }}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              {loadingDetails ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : attemptDetails?.exam?.questions ? (
                <div className="space-y-6">
                  {attemptDetails.exam.questions.map((q, i) => (
                    <QuestionCard
                      key={q.id || i}
                      question={q}
                      index={i}
                      selectedAnswer={attemptDetails.answers[q.id] || (q.type === 'TF' ? {} : '')}
                      onAnswerChange={() => {}}
                      showResult
                      disabled
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  Không có dữ liệu chi tiết cho đề thi này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          <Navbar />
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mt-20" />
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}
