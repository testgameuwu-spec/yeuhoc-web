'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Envelope as Mail, Camera, SignOut as LogOut, FloppyDisk as Save, Shield, BookOpen, CalendarBlank as CalendarDays,
  WarningCircle as AlertCircle, CheckCircle as CheckCircle2, CircleNotch as Loader2, FileText, ClockCounterClockwise as History, ActivityIcon as Activity, Flag,
  CaretRight as ChevronRight
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ContinueExamsPanel from '@/components/ContinueExamsPanel';
import { markResolvedReportsAsSeen } from '@/lib/reportSeenStorage';
import { getAllFolders, getPublishedExams } from '@/lib/examStore';
import { getContinueExamItems } from '@/lib/continueExamStore';
import { getTargetExams, getUserTargetExams, syncUserTargetExams } from '@/lib/targetExamStore';
import { formatTargetExamDate } from '@/lib/targetExamDisplay';

const PROFILE_TABS = new Set(['overview', 'history', 'reports', 'info']);

function getProfileTab(tab) {
  return PROFILE_TABS.has(tab) ? tab : 'overview';
}

const REPORT_REASON_LABELS = {
  wrong_question: 'Sai đề / Đề bị lỗi',
  wrong_answer: 'Sai đáp án',
  wrong_solution: 'Sai lời giải',
  unclear: 'Đề không rõ ràng',
  missing_image: 'Thiếu hình ảnh',
  other: 'Lý do khác',
};

const COVER_GRADIENTS = [
  { id: 'default', name: 'Indigo Night', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'ocean', name: 'Ocean Blue', css: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)' },
  { id: 'sunset', name: 'Sunset', css: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
  { id: 'aurora', name: 'Aurora', css: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%)' },
  { id: 'emerald', name: 'Emerald', css: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' },
  { id: 'cherry', name: 'Cherry', css: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)' },
  { id: 'peach', name: 'Peach', css: 'linear-gradient(135deg, #fecaca 0%, #fde68a 100%)' },
  { id: 'lavender', name: 'Lavender', css: 'linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 100%)' },
  { id: 'midnight', name: 'Midnight', css: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #312e81 100%)' },
  { id: 'forest', name: 'Forest', css: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' },
  { id: 'arctic', name: 'Arctic', css: 'linear-gradient(135deg, #67e8f9 0%, #a5b4fc 100%)' },
  { id: 'warmflame', name: 'Warm Flame', css: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
  { id: 'slate', name: 'Slate', css: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)' },
  { id: 'rose', name: 'Rose Garden', css: 'linear-gradient(135deg, #fda4af 0%, #e879f9 100%)' },
  { id: 'deepblue', name: 'Deep Blue', css: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)' },
  { id: 'mint', name: 'Mint Fresh', css: 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 50%, #5eead4 100%)' },
];

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialActiveTab = getProfileTab(tabParam);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [attempts, setAttempts] = useState([]);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState(initialActiveTab); // overview | history | reports | info
  const [continueItems, setContinueItems] = useState([]);
  const [continueLoading, setContinueLoading] = useState(true);
  const [myReports, setMyReports] = useState([]);
  const [targetExams, setTargetExams] = useState([]);
  const [selectedTargetExams, setSelectedTargetExams] = useState([]);
  const [selectedTargetExamIds, setSelectedTargetExamIds] = useState([]);
  const [coverGradient, setCoverGradient] = useState('');
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  const dataLoadedRef = useRef(false);
  const avatarFileInputRef = useRef(null);

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
      setContinueLoading(true);

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

        const targetExamsPromise = getTargetExams();
        const selectedTargetExamsPromise = getUserTargetExams(sessionUser.id);
        const publishedExamsPromise = getPublishedExams();
        const foldersPromise = getAllFolders();

        const [
          profileRes,
          historyRes,
          reportsRes,
          targetExamsRes,
          selectedTargetExamsRes,
          publishedExamsRes,
          foldersRes,
        ] = await Promise.allSettled([
          profilePromise,
          historyPromise,
          reportsPromise,
          targetExamsPromise,
          selectedTargetExamsPromise,
          publishedExamsPromise,
          foldersPromise,
        ]);

        let nextContinueItems = [];
        if (publishedExamsRes.status === 'fulfilled' && foldersRes.status === 'fulfilled') {
          nextContinueItems = await getContinueExamItems(
            sessionUser.id,
            publishedExamsRes.value,
            foldersRes.value
          );
        } else {
          if (publishedExamsRes.status === 'rejected') console.warn('Published exams fetch failed:', publishedExamsRes.reason);
          if (foldersRes.status === 'rejected') console.warn('Folders fetch failed:', foldersRes.reason);
        }

        if (isMounted) {
          setContinueItems(nextContinueItems);

          if (profileRes.status === 'fulfilled' && profileRes.value.data) {
            const profileData = profileRes.value.data;
            setProfile(profileData);
            setFullName(profileData.full_name || '');
            setUsername(profileData.username || '');
            setBio(profileData.bio || '');
            setAvatarUrl(profileData.avatar_url || '');
            setCoverGradient(profileData.cover_gradient || '');
          }

          if (historyRes.status === 'fulfilled' && historyRes.value.data) {
            setAttempts(historyRes.value.data);
          }

          if (reportsRes.status === 'fulfilled' && reportsRes.value.data) {
            setMyReports(reportsRes.value.data);
          }

          if (targetExamsRes.status === 'fulfilled') {
            setTargetExams(targetExamsRes.value);
          } else {
            console.warn('Target exams fetch failed:', targetExamsRes.reason);
          }

          if (selectedTargetExamsRes.status === 'fulfilled') {
            const selectedTargets = selectedTargetExamsRes.value;
            setSelectedTargetExams(selectedTargets);
            setSelectedTargetExamIds(selectedTargets.map((exam) => exam.id));
          } else {
            console.warn('Selected target exams fetch failed:', selectedTargetExamsRes.reason);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setContinueLoading(false);
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

  const handleViewAttemptDetails = (attempt) => {
    if (!attempt?.id) return;
    router.push(`/profile/history/${attempt.id}/`);
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
        await syncUserTargetExams(user.id, selectedTargetExamIds);
        const nextTargets = await getUserTargetExams(user.id);
        setSelectedTargetExams(nextTargets);
        setSelectedTargetExamIds(nextTargets.map((exam) => exam.id));
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

  const handleTargetExamToggle = (targetExamId) => {
    setSelectedTargetExamIds((prev) => (
      prev.includes(targetExamId)
        ? prev.filter((id) => id !== targetExamId)
        : [...prev, targetExamId]
    ));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleCoverChange = async (gradientCss) => {
    setCoverGradient(gradientCss);
    setShowCoverPicker(false);
    if (user) {
      try {
        await supabase.from('profiles').update({ cover_gradient: gradientCss }).eq('id', user.id);
      } catch (e) {
        console.warn('Could not save cover gradient:', e);
      }
    }
  };

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const isAdmin = profile?.role === 'admin';
  const targetExamOptions = [...selectedTargetExams, ...targetExams]
    .filter((exam, index, exams) => exams.findIndex((item) => item.id === exam.id) === index)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0) || new Date(`${a.examDate}T00:00:00`) - new Date(`${b.examDate}T00:00:00`) || a.name.localeCompare(b.name));


  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 weight="bold" className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Đang tải dữ liệu hồ sơ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {/* Cover Banner */}
          <div
            className="h-40 sm:h-56 w-full relative group cursor-default"
            style={{ background: coverGradient || COVER_GRADIENTS[0].css }}
          >
            <button
              onClick={() => setShowCoverPicker(true)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-sm text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all hover:bg-black/50 cursor-pointer"
            >
              Đổi bìa
            </button>
          </div>

          {/* Cover Picker Modal */}
          {showCoverPicker && (
            <>
              <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={() => setShowCoverPicker(false)} />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[440px] max-w-[92vw] max-h-[80vh] overflow-y-auto">
                <h3 className="text-base font-bold font-outfit text-gray-900 mb-1">Chọn ảnh bìa</h3>
                <p className="text-xs text-gray-400 mb-4">Chọn một gradient để làm ảnh bìa hồ sơ của bạn</p>
                <p className="text-[11px] text-gray-500 mb-3 font-bold uppercase tracking-wider">Color & Gradient</p>
                <div className="grid grid-cols-4 gap-2">
                  {COVER_GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      title={g.name}
                      onClick={() => handleCoverChange(g.css)}
                      className={`h-16 rounded-xl cursor-pointer transition-all hover:scale-105 hover:shadow-md border-2 ${
                        coverGradient === g.css || (!coverGradient && g.id === 'default')
                          ? 'border-indigo-500 shadow-md scale-105'
                          : 'border-transparent'
                      }`}
                      style={{ background: g.css }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Profile Header (Avatar + Info + Actions) */}
          <div className="px-6 sm:px-10 pb-6 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-16 sm:-mt-20 mb-4 gap-4">
              {/* Avatar */}
              <div className="relative inline-block">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar || !user}
                />
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={144}
                    height={144}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-4 ring-white bg-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-5xl font-bold ring-4 ring-white shadow-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  title="Đổi ảnh đại diện"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar || !user}
                  className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-md hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed z-10"
                >
                  {uploadingAvatar ? (
                    <Loader2 weight="bold" className="w-5 h-5 text-indigo-500 animate-spin" />
                  ) : (
                    <Camera weight="fill" className="w-[20px] h-[20px] text-gray-600" />
                  )}
                </button>
              </div>

              {/* Actions (Logout) */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors font-semibold text-sm flex items-center gap-2"
                >
                  <LogOut weight="bold" className="w-4 h-4" /> Đăng xuất
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold font-outfit text-gray-900 flex items-center gap-2">
                {displayName}
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
                    <Shield weight="fill" className="w-3.5 h-3.5" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <User weight="fill" className="w-3.5 h-3.5" />
                    User
                  </span>
                )}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <CalendarDays weight="duotone" className="w-[18px] h-[18px]" /> 
                  Tham gia {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-gray-100 overflow-x-auto whitespace-nowrap hide-scrollbar">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Activity weight="duotone" className="w-[18px] h-[18px]" /> Tổng quan
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-3 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <History weight="duotone" className="w-[18px] h-[18px]" /> Lịch sử làm bài
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`pb-3 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === 'reports' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Flag weight="duotone" className="w-[18px] h-[18px]" /> Báo cáo câu hỏi
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`pb-3 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileText weight="duotone" className="w-[18px] h-[18px]" /> Thông tin cá nhân
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 sm:p-10 bg-slate-50/50 min-h-[400px]">
            {/* Content */}
            {activeTab === 'overview' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Activity weight="duotone" className="w-[22px] h-[22px] text-indigo-500" />
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

                      {/* Continue Exams */}
                      {continueItems.length > 0 && (
                        <ContinueExamsPanel
                          items={continueItems}
                          loading={continueLoading}
                          title="Bài thi đang làm"
                          description="Các đề và phiên ôn luyện bạn chưa làm xong:"
                        />
                      )}
                      
                      {/* Recent Exams */}
                      {recentAttempts.length > 0 && (
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                              <History className="w-4 h-4 text-indigo-500" /> 5 Đề thi gần nhất
                            </h4>
                            <button
                              onClick={() => setActiveTab('history')}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              Xem tất cả
                            </button>
                          </div>
                          <div className="space-y-3">
                            {recentAttempts.map((attempt, index) => (
                                <div key={attempt.id || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all gap-4">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{attempt.exams?.title || 'Đề thi đã bị xóa'}</h4>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                      <span className="flex items-center gap-1"><BookOpen weight="duotone" className="w-[14px] h-[14px]" /> {attempt.exams?.subject || 'Không rõ'}</span>
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
                                      Chi tiết <ChevronRight weight="bold" className="w-[14px] h-[14px]" />
                                    </button>
                                  </div>
                                </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {attempts.length === 0 && continueItems.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 font-medium">Bạn chưa tham gia học tập</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === 'history' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <History weight="duotone" className="w-[22px] h-[22px] text-indigo-500" />
                  Lịch sử làm bài
                </h3>
                <p className="text-xs text-gray-400 mb-6">Xem lại các bài thi đã nộp và chi tiết từng câu trả lời</p>

                {attempts.length > 0 ? (
                  <div className="space-y-3">
                    {attempts.map((attempt, index) => (
                      <div
                        key={attempt.id || index}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900">{attempt.exams?.title || 'Đề thi đã bị xóa'}</h4>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><BookOpen weight="duotone" className="w-[14px] h-[14px]" /> {attempt.exams?.subject || 'Không rõ'}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{new Date(attempt.created_at).toLocaleDateString('vi-VN')} {new Date(attempt.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 text-sm flex-shrink-0">
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
                            className="ml-0 sm:ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors flex items-center gap-1"
                          >
                            Chi tiết <ChevronRight weight="bold" className="w-[14px] h-[14px]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Bạn chưa có lịch sử làm bài</p>
                    <p className="text-xs text-gray-400 mt-1">Sau khi nộp bài, kết quả sẽ xuất hiện tại đây.</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'reports' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Flag weight="duotone" className="w-[22px] h-[22px] text-indigo-500" />
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
                  <FileText weight="duotone" className="w-[22px] h-[22px] text-indigo-500" />
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
                    <CheckCircle2 weight="fill" className="w-[18px] h-[18px] mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle weight="fill" className="w-[18px] h-[18px] mt-0.5 flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                {/* Email (read-only) */}
                <div>
                  <label className="auth-label">Email</label>
                  <div className="auth-input-wrap bg-gray-50 cursor-not-allowed">
                    <Mail weight="duotone" className="w-[18px] h-[18px] text-gray-300" />
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
                    <User weight="duotone" className="w-[18px] h-[18px] text-gray-400" />
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

                {/* Target Exams */}
                <div>
                  <label className="auth-label">Kỳ thi mục tiêu</label>
                  {targetExamOptions.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {targetExamOptions.map((exam) => {
                        const checked = selectedTargetExamIds.includes(exam.id);
                        return (
                          <label
                            key={exam.id}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                              checked
                                ? 'border-indigo-200 bg-indigo-50'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTargetExamToggle(exam.id)}
                              className="mt-1 w-4 h-4 accent-indigo-600"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900">{exam.name}</span>
                                {!exam.isActive && (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-200">
                                    Inactive
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                <CalendarDays weight="duotone" className="w-[14px] h-[14px]" />
                                {formatTargetExamDate(exam.examDate)}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                      Admin chưa cấu hình kỳ thi mục tiêu.
                    </div>
                  )}
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="auth-label">Ảnh đại diện</label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="relative flex-shrink-0">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt="Preview"
                          width={64}
                          height={64}
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
                          <Loader2 weight="bold" className="w-6 h-6 text-indigo-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                        <Camera weight="duotone" className="w-[18px] h-[18px] text-gray-500" />
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
                      <Save weight="duotone" className="w-[18px] h-[18px]" />
                      Cập nhật thông tin
                    </>
                  )}
                </button>
              </form>
            </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
          <Navbar />
          <Loader2 weight="bold" className="w-12 h-12 text-indigo-500 animate-spin mt-20" />
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}
