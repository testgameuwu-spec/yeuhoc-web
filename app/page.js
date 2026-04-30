'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, User, ArrowLeft, ChevronRight, ChevronLeft, RotateCcw, Clock, X, BarChart2, Award, Calendar, Eye, CheckCircle2, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import UserProfile from '@/components/UserProfile';
import { getPublishedExams, getExamById } from '@/lib/examStore';
import FilterBar from '@/components/FilterBar';
import ExamCard from '@/components/ExamCard';
import QuestionCard from '@/components/QuestionCard';
import MathRenderer from '@/components/MathRenderer';
import Pagination from '@/components/Pagination';
import ResultsView from '@/components/ResultsView';
import Timer from '@/components/Timer';
import { supabase } from '@/lib/supabase';

// ── Topbar (exam-tool style) ──
const Topbar = ({ activeExam, handleReset, children }) => (
  <div className="et-topbar">
    <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={handleReset}>
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--et-blue)" strokeWidth="2.2" strokeLinecap="round" style={{ width: 22, height: 22 }}>
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
      <span className="hidden sm:inline font-bold text-[17px] text-[var(--et-blue)]">YeuHoc</span>
    </div>
    <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-400 flex-1 min-w-0 ml-4">
      <span className="cursor-pointer shrink-0 hover:text-indigo-600 transition-colors" onClick={handleReset}>Trang chủ</span>
      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
      <span className="text-gray-800 font-semibold truncate">{activeExam?.title || 'Đề thi'}</span>
    </div>
    <div className="flex items-center gap-3 shrink-0 ml-auto">
      {children}
      <UserProfile />
      <button className="et-btn-outline desktop-only" onClick={handleReset} style={{ fontSize: 12, padding: '5px 11px' }}>
        <ArrowLeft style={{ width: 13, height: 13 }} /> Quay lại
      </button>
    </div>
  </div>
);


// ── Custom UI Modal ──
const CustomModal = ({ isOpen, type, title, message, onConfirm, onCancel, confirmText = 'Xác nhận', cancelText = 'Hủy', extraBtn = null, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-[90%] max-w-sm p-6 shadow-xl transform transition-all scale-100">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3 flex-wrap">
          {extraBtn && (
            <button onClick={() => { extraBtn.onClick(); onClose(); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              {extraBtn.text}
            </button>
          )}
          {type === 'confirm' && (
            <button onClick={() => { if (onCancel) onCancel(); onClose(); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
              {cancelText}
            </button>
          )}
          <button onClick={() => { if (onConfirm) onConfirm(); onClose(); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md">
            {type === 'confirm' ? confirmText : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};

// SVG Icons for Pause and Play
const PauseIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 14, height: 14 }}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;

export default function HomePage() {

  const router = useRouter();
  const [allExams, setAllExams] = useState([]);

  // Quiz flow states
  const [activeExam, setActiveExam] = useState(null);
  const [quizPhase, setQuizPhase] = useState('browse'); // browse | preview | quiz | results | practice
  const [answers, setAnswers] = useState({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Pause & Resume states
  const [isPaused, setIsPaused] = useState(false);
  const [savedSecondsLeft, setSavedSecondsLeft] = useState(null);
  const [savedExams, setSavedExams] = useState(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Browse filter & pagination states (must be before any conditional returns)
  const [searchQuery, setSearchQuery] = useState('');
  const [selYear, setSelYear] = useState(null);
  const [selType, setSelType] = useState(null);
  const [selSubject, setSelSubject] = useState(null);
  const [sortOrder, setSortOrder] = useState('default');
  const ITEMS_PER_PAGE = 9;
  const [browsePage, setBrowsePage] = useState(1);

  // Preview Stats
  const [examStats, setExamStats] = useState(null);
  const [examLeaderboard, setExamLeaderboard] = useState([]);
  const [loadingPreviewStats, setLoadingPreviewStats] = useState(false);

  // Anti-cheat fullscreen states
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const MAX_VIOLATIONS = 5;
  const isSubmittingRef = useRef(false);

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null, onCancel: null, confirmText: 'Xác nhận', cancelText: 'Hủy', extraBtn: null });

  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null, onCancel: null, extraBtn: null });
  const showConfirm = (title, message, onConfirm, onCancel = null, confirmText = 'Xác nhận', cancelText = 'Hủy', extraBtn = null) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm, onCancel, confirmText, cancelText, extraBtn });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const mainRef = useRef(null);

  const getProgressKey = (examId) => `yeuhoc_progress_${user?.id}_${examId}`;

  // Read saved exams (fixed: extract examId properly for UUIDs)
  useEffect(() => {
    if (user && quizPhase === 'browse') {
      const keys = Object.keys(localStorage);
      const saved = new Set();
      const prefix = `yeuhoc_progress_${user.id}_`;
      keys.forEach(k => {
        if (k.startsWith(prefix)) {
          const examId = k.substring(prefix.length);
          saved.add(examId);
        }
      });
      setSavedExams(saved);
    }
  }, [user, quizPhase]);

  // Reset browse pagination when filters change
  useEffect(() => {
    setBrowsePage(1);
  }, [searchQuery, selYear, selType, selSubject, sortOrder]);

  // Fetch preview stats
  useEffect(() => {
    if (quizPhase === 'preview' && activeExam) {
      async function fetchStats() {
        setLoadingPreviewStats(true);
        const { data, error } = await supabase
          .from('exam_attempts')
          .select('*, profiles(full_name, avatar_url)')
          .eq('exam_id', activeExam.id)
          .order('score', { ascending: false })
          .order('time_spent', { ascending: true });

        if (data) {
          const highestAttemptsMap = new Map();
          data.forEach(attempt => {
            if (!highestAttemptsMap.has(attempt.user_id)) {
              highestAttemptsMap.set(attempt.user_id, attempt);
            }
          });
          const highestAttempts = Array.from(highestAttemptsMap.values());

          const totalParticipants = highestAttempts.length;
          const totalScore = highestAttempts.reduce((acc, curr) => acc + curr.score, 0);
          const avgScore = totalParticipants ? (totalScore / totalParticipants).toFixed(2) : 0;

          const sortedScores = [...highestAttempts].map(d => d.score).sort((a, b) => a - b);
          let medianScore = 0;
          if (totalParticipants > 0) {
            const mid = Math.floor(totalParticipants / 2);
            medianScore = totalParticipants % 2 !== 0 ? sortedScores[mid] : ((sortedScores[mid - 1] + sortedScores[mid]) / 2).toFixed(2);
          }

          const totalTime = highestAttempts.reduce((acc, curr) => acc + curr.time_spent, 0);
          const avgTime = totalParticipants ? Math.floor(totalTime / totalParticipants) : 0;

          setExamStats({ totalParticipants, avgScore, medianScore, avgTime });
          setExamLeaderboard(highestAttempts.slice(0, 10)); // top 10
        }
        setLoadingPreviewStats(false);
      }
      fetchStats();
    }
  }, [quizPhase, activeExam]);

  // Load published exams from store
  useEffect(() => {
    async function init() {
      const exams = await getPublishedExams();
      setAllExams(exams);

      // Auto preview if from Admin
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const pid = urlParams.get('preview_exam_id');
        if (pid) {
          let ex = exams.find(e => e.id.toString() === pid);
          if (!ex) {
            ex = await getExamById(pid); // Fetch directly in case it's a draft
          }
          if (ex) {
            setActiveExam(ex);
            setAnswers({});
            setCurrentQ(0);
            setBookmarks(new Set());
            setQuizPhase('preview');
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }
    }
    init();
  }, []);

  // Fetch session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setAuthLoaded(true);
      if (!session?.user) router.push('/login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) router.push('/login');
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [router]);

  // ── Quiz flow ──
  const questions = activeExam?.questions || [];
  const realQuestions = questions.filter(q => q.type !== 'TEXT');

  // Logic gộp nhóm (Grouping)
  const groupedQuestions = [];
  let currentGroup = null;

  questions.forEach(q => {
    if (q.type === 'TEXT') {
      currentGroup = { context: q, children: [] };
      groupedQuestions.push(currentGroup);
    } else {
      if (q.linkedTo && currentGroup && currentGroup.context.id === q.linkedTo) {
        currentGroup.children.push(q);
      } else {
        const parentGroup = q.linkedTo ? groupedQuestions.find(g => g.context?.id === q.linkedTo) : null;
        if (parentGroup) {
          parentGroup.children.push(q);
        } else {
          groupedQuestions.push({ context: null, children: [q] });
        }
      }
    }
  });

  const isTHPT = activeExam?.examType === 'THPT';
  const isAntiCheatEnabled = activeExam?.antiCheatEnabled !== false;
  realQuestions.forEach((q, i) => {
    q._isFirstMCQ = isTHPT && q.type === 'MCQ' && (i === 0 || realQuestions[i - 1].type !== 'MCQ');
    q._isFirstTF = isTHPT && q.type === 'TF' && (i === 0 || realQuestions[i - 1].type !== 'TF');
    q._isFirstSA = isTHPT && q.type === 'SA' && (i === 0 || realQuestions[i - 1].type !== 'SA');
  });

  const answeredCount = realQuestions.filter(q => {
    const a = answers[q.id];
    if (!a) return false;
    if (typeof a === 'object') return Object.keys(a).length > 0;
    return a !== '';
  }).length;

  const handleStartExam = (exam) => {
    if (!exam.questions || exam.questions.length === 0) { showAlert('Thông báo', 'Đề thi này chưa có câu hỏi.'); return; }
    setActiveExam(exam);
    setAnswers({});
    setCurrentQ(0);
    setBookmarks(new Set());
    setSavedSecondsLeft(null);
    setIsPaused(false);
    setQuizPhase('preview');
  };

  // ── Practice mode (ôn luyện) ──
  const [practiceRevealed, setPracticeRevealed] = useState({});

  const handleStartPractice = () => {
    setAnswers({});
    setCurrentQ(0);
    setPracticeRevealed({});
    setQuizPhase('practice');
  };

  const handlePracticeReveal = () => {
    setPracticeRevealed(prev => ({ ...prev, [currentQ]: true }));
  };

  // ── Fullscreen helpers ──
  const canFullscreen = typeof document !== 'undefined' && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

  const requestFullscreen = useCallback(() => {
    if (!canFullscreen) return;
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, [canFullscreen]);

  const exitFullscreen = useCallback(() => {
    if (!canFullscreen) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen?.();
    }
  }, [canFullscreen]);

  const startFreshQuiz = () => {
    setAnswers({});
    setBookmarks(new Set());
    setCurrentQ(0);
    setSavedSecondsLeft(null);
    setIsPaused(false);
    setViolationCount(0);
    setShowViolationWarning(false);
    isSubmittingRef.current = false;
    setQuizPhase('quiz');
    setTimerRunning(true);
    setStartTime(Date.now());
    if (isAntiCheatEnabled) requestFullscreen();
  };

  const handleBeginQuiz = () => {
    const key = getProgressKey(activeExam.id);
    const saved = localStorage.getItem(key);

    if (saved && user) {
      showConfirm(
        'Tiếp tục làm bài',
        'Bạn đang có một phiên làm bài chưa nộp. Bạn có muốn tiếp tục phiên làm bài đó không?',
        () => {
          // Resume
          try {
            const data = JSON.parse(saved);
            setAnswers(data.answers || {});
            setBookmarks(new Set(data.bookmarks || []));
            setCurrentQ(data.currentQ || 0);
            setSavedSecondsLeft(data.secondsLeft);
            setIsPaused(false);
            setViolationCount(0);
            setShowViolationWarning(false);
            isSubmittingRef.current = false;
            setQuizPhase('quiz');
            setTimerRunning(true);
            setStartTime(Date.now());
            if (isAntiCheatEnabled) requestFullscreen();
          } catch (e) {
            startFreshQuiz();
          }
        },
        () => {
          // Cancel / Fresh start
          localStorage.removeItem(key);
          startFreshQuiz();
        },
        'Làm tiếp',
        'Làm lại từ đầu',
        { text: 'Quay lại trang chủ', onClick: () => handleReset() }
      );
    } else {
      startFreshQuiz();
    }
  };

  // ── Anti-cheat: detect fullscreen exit (desktop) & tab switch (all devices) ──
  useEffect(() => {
    if (quizPhase !== 'quiz' || !isAntiCheatEnabled) return;

    const addViolation = () => {
      setViolationCount(prev => {
        const next = prev + 1;
        if (next >= MAX_VIOLATIONS) {
          showAlert('⛔ Tự động nộp bài', `Bạn đã vi phạm ${MAX_VIOLATIONS} lần. Hệ thống tự động nộp bài của bạn.`);
          setTimeout(() => handleSubmit(), 100);
          return next;
        }
        setShowViolationWarning(true);
        return next;
      });
    };

    const handleFullscreenChange = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFS && !isSubmittingRef.current) addViolation();
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current) addViolation();
    };

    // Fullscreen change only on desktop (where API is supported)
    if (canFullscreen) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
    // Visibility change works on ALL devices (mobile + desktop)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (canFullscreen) {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quizPhase, canFullscreen, isAntiCheatEnabled]);

  const handleDismissViolationWarning = () => {
    setShowViolationWarning(false);
    if (canFullscreen && isAntiCheatEnabled) requestFullscreen();
  };

  const handleTick = (sec) => {
    setSavedSecondsLeft(sec);
  };

  const handlePause = () => {
    setIsPaused(true);
    setTimerRunning(false);
  };

  const handleResume = () => {
    setIsPaused(false);
    setTimerRunning(true);
  };

  // Auto-save progress
  useEffect(() => {
    if (quizPhase === 'quiz' && activeExam && user && !isPaused && savedSecondsLeft !== null) {
      const data = {
        answers,
        bookmarks: Array.from(bookmarks),
        secondsLeft: savedSecondsLeft,
        currentQ,
      };
      localStorage.setItem(getProgressKey(activeExam.id), JSON.stringify(data));
    }
  }, [answers, bookmarks, savedSecondsLeft, currentQ, quizPhase, activeExam, user, isPaused]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    // Guard against double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setTimerRunning(false);
    setShowViolationWarning(false);
    setQuizPhase('results');
    exitFullscreen();

    if (user && activeExam) {
      // Clear auto-saved progress
      localStorage.removeItem(getProgressKey(activeExam.id));

      const timeSpentSecs = savedSecondsLeft !== null ? (activeExam.duration * 60 - savedSecondsLeft) : (startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);
      let correctCount = 0;

      const realQs = activeExam.questions.filter(q => q.type !== 'TEXT');
      realQs.forEach(q => {
        const ua = answers[q.id] || '';
        if (q.type === 'MCQ') {
          if (ua === q.answer) correctCount++;
        } else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
          const s = typeof ua === 'object' ? ua : {};
          if (Object.keys(q.answer).every(k => s[k] === q.answer[k])) correctCount++;
        } else {
          if (ua && (ua.toString().trim().toLowerCase() === (q.answer || '').toString().trim().toLowerCase())) correctCount++;
        }
      });

      const score = realQs.length > 0 ? (correctCount / realQs.length) * 10 : 0;

      const { error } = await supabase.from('exam_attempts').insert({
        user_id: user.id,
        exam_id: activeExam.id,
        score: score,
        correct_answers: correctCount,
        total_questions: realQs.length,
        time_spent: timeSpentSecs,
        user_answers: answers,
        violation_count: violationCount,
      });

      if (error) {
        console.error("Error saving exam attempt:", error);
        showAlert("Lỗi lưu kết quả", "Không lưu được kết quả bài thi: " + error.message + "\n(Hãy kiểm tra RLS Policy)");
      }
    }
  };

  const handleTimeUp = () => { handleSubmit(); };
  const handleReset = () => {
    // Suppress anti-cheat listener before exiting fullscreen
    isSubmittingRef.current = true;
    exitFullscreen();
    setActiveExam(null);
    setQuizPhase('browse');
    setAnswers({});
    setTimerRunning(false);
    setCurrentQ(0);
    setStartTime(null);
    setIsPaused(false);
    setViolationCount(0);
    setShowViolationWarning(false);
    // Reset ref after fullscreenchange event has fired
    setTimeout(() => { isSubmittingRef.current = false; }, 300);
  };
  const handleRetry = () => {
    if (activeExam && user) localStorage.removeItem(getProgressKey(activeExam.id));
    startFreshQuiz();
  };

  const scrollToQ = (i) => {
    setCurrentQ(i);
    const el = document.getElementById(`q-card-${i}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderNavButtons = (renderBtn) => {
    const isTHPT = activeExam?.examType === 'THPT';
    if (!isTHPT) {
      return (
        <div className="et-nav-grid">
          {realQuestions.map((q, i) => renderBtn(q, i))}
        </div>
      );
    }

    let p1 = [], p2 = [], p3 = [];
    realQuestions.forEach((q, i) => {
      if (q.type === 'MCQ') p1.push({ q, i });
      else if (q.type === 'TF') p2.push({ q, i });
      else if (q.type === 'SA') p3.push({ q, i });
    });

    return (
      <div className="flex flex-col gap-4">
        {p1.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần I</div>
            <div className="et-nav-grid">{p1.map(({ q, i }) => renderBtn(q, i))}</div>
          </div>
        )}
        {p2.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần II</div>
            <div className="et-nav-grid">{p2.map(({ q, i }) => renderBtn(q, i))}</div>
          </div>
        )}
        {p3.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần III</div>
            <div className="et-nav-grid">{p3.map(({ q, i }) => renderBtn(q, i))}</div>
          </div>
        )}
      </div>
    );
  };

  if (!authLoaded || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div style={{ color: 'var(--et-gray-500)', fontSize: 16, fontWeight: 500 }}>Đang tải...</div>
      </div>
    );
  }

  // ── PRACTICE MODE ──
  if (quizPhase === 'practice' && activeExam) {
    const q = questions[currentQ];
    const isRevealed = practiceRevealed[currentQ] || false;
    const ua = answers[q?.id];
    const hasAnswered = ua !== undefined && ua !== '' && (typeof ua !== 'object' || Object.keys(ua).length > 0);

    let isCorrect = false;
    if (isRevealed && q) {
      if (q.type === 'MCQ') isCorrect = ua === q.answer;
      else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
        const s = typeof ua === 'object' ? ua : {};
        isCorrect = Object.keys(q.answer).every(k => s[k] === q.answer[k]);
      } else {
        isCorrect = (ua || '').toString().trim().toLowerCase() === (q.answer || '').toString().trim().toLowerCase();
      }
    }

    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-bold">
            📖 Chế độ ôn luyện
          </div>
        </Topbar>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Progress dots */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-600">Câu {currentQ + 1}/{questions.length}</span>
                <span className="text-xs font-semibold text-gray-400">{Object.keys(practiceRevealed).length} đã xem</span>
              </div>
              <div className="flex flex-wrap gap-[5px]">
                {questions.map((qItem, i) => {
                  const done = practiceRevealed[i];
                  const isCurrent = i === currentQ;
                  const isMarked = bookmarks.has(qItem.id);
                  let bg = '#e2e8f0';
                  if (isCurrent) bg = '#6366f1';
                  else if (isMarked) bg = '#f59e0b';
                  else if (done) bg = '#10b981';
                  return (
                    <button key={i} onClick={() => setCurrentQ(i)} style={{
                      width: isCurrent ? 22 : 9, height: 9, borderRadius: 20, border: 'none', cursor: 'pointer',
                      background: bg, transition: 'all .2s', flexShrink: 0,
                    }} title={`Câu ${i + 1}${isMarked ? ' (đã đánh dấu)' : ''}`} />
                  );
                })}
              </div>
            </div>

            {q && (
              <div className="practice-card-wrap" style={{ fontSize: '1.1em' }}>
                <QuestionCard
                  question={q}
                  index={currentQ}
                  selectedAnswer={answers[q.id] || (q.type === 'TF' ? {} : '')}
                  onAnswerChange={(val) => !isRevealed && handleAnswerChange(q.id, val)}
                  showResult={isRevealed}
                  disabled={isRevealed}
                  isBookmarked={bookmarks.has(q.id)}
                  onToggleBookmark={!isRevealed ? () => {
                    const next = new Set(bookmarks);
                    if (next.has(q.id)) next.delete(q.id);
                    else next.add(q.id);
                    setBookmarks(next);
                  } : null}
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-4 sm:mt-6 gap-2 sm:gap-4">
              <button
                onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                disabled={currentQ === 0}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all"
                style={{
                  background: currentQ === 0 ? '#f1f5f9' : '#fff',
                  color: currentQ === 0 ? '#94a3b8' : '#4b5563',
                  border: '1.5px solid ' + (currentQ === 0 ? '#e2e8f0' : '#d1d5db'),
                  cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Câu trước</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                {!isRevealed && (
                  <button
                    onClick={handlePracticeReveal}
                    disabled={!hasAnswered}
                    className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
                    style={{
                      background: hasAnswered ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0',
                      color: hasAnswered ? '#fff' : '#94a3b8',
                      border: 'none',
                      cursor: hasAnswered ? 'pointer' : 'not-allowed',
                      boxShadow: hasAnswered ? '0 4px 14px rgba(16,185,129,.3)' : 'none',
                    }}
                  >
                    <Eye className="w-4 h-4" /> Xem đáp án
                  </button>
                )}
              </div>

              <button
                onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQ === questions.length - 1}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all"
                style={{
                  background: currentQ === questions.length - 1 ? '#f1f5f9' : 'var(--et-blue)',
                  color: currentQ === questions.length - 1 ? '#94a3b8' : '#fff',
                  border: 'none',
                  cursor: currentQ === questions.length - 1 ? 'not-allowed' : 'pointer',
                  boxShadow: currentQ === questions.length - 1 ? 'none' : '0 4px 14px rgba(59,111,212,.3)',
                }}
              >
                <span className="hidden sm:inline">Câu tiếp</span> <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {bookmarks.size > 0 && (
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-fadeIn">
                <div className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                  🚩 Câu đã đánh dấu ({bookmarks.size})
                </div>
                <div className="flex flex-wrap gap-2">
                  {questions.map((qItem, i) => bookmarks.has(qItem.id) && (
                    <button key={i} onClick={() => setCurrentQ(i)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: i === currentQ ? '#d97706' : '#fff',
                        color: i === currentQ ? '#fff' : '#92400e',
                        border: '1.5px solid #fbbf24',
                        cursor: 'pointer',
                      }}
                    >
                      Câu {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(practiceRevealed).length === questions.length && (
              <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-200 text-center shadow-sm animate-fadeIn">
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Hoàn thành ôn luyện!</h3>
                <p className="text-sm text-gray-500 mb-4">Bạn đã xem hết {questions.length} câu hỏi.</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <button onClick={() => { setAnswers({}); setCurrentQ(0); setPracticeRevealed({}); setBookmarks(new Set()); }} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Ôn lại từ đầu
                  </button>
                  <button onClick={handleReset} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Chọn đề khác
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── PREVIEW ──
  if (quizPhase === 'preview' && activeExam) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset} />
        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-8">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              <span className="et-tag et-tag-blue">📚 {activeExam.subject}</span>
              <span className="et-tag et-tag-amber">⏱ {activeExam.duration} phút</span>
              <span className="et-tag et-tag-green">📝 {questions.length} câu</span>
              {activeExam.examType && <span className="et-tag">{activeExam.examType} · {activeExam.year}</span>}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-gray-800">{activeExam.title}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mb-6">
              Chọn chế độ phù hợp để bắt đầu.
            </p>

            {/* Mode selection cards */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap', maxWidth: 560, margin: '0 auto 24px' }}>
              {/* Exam mode card */}
              <div style={{
                flex: '1 1 240px', maxWidth: 270, background: '#fff', border: '2px solid #e0e7ff',
                borderRadius: 16, padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all .2s', position: 'relative'
              }}
              onClick={handleBeginQuiz}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,.15)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e0e7ff'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{isAntiCheatEnabled ? '🔒' : '📝'}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e2533', marginBottom: 6 }}>Làm bài thi</div>
                <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                  {isAntiCheatEnabled
                    ? 'Tính thời gian, toàn màn hình, chống gian lận. Kết quả được lưu lại.'
                    : 'Tính thời gian, không chống gian lận. Kết quả được lưu lại.'}
                </p>
                <div style={{ marginTop: 14, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>⏱ Giới hạn thời gian</span>
                  {isAntiCheatEnabled && (
                    <span style={{ fontSize: 10, background: '#fce7f3', color: '#9d174d', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>🔒 Fullscreen</span>
                  )}
                </div>
              </div>

              {/* Practice mode card */}
              <div style={{
                flex: '1 1 240px', maxWidth: 270, background: '#fff', border: '2px solid #d1fae5',
                borderRadius: 16, padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all .2s', position: 'relative'
              }}
              onClick={handleStartPractice}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,.15)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#d1fae5'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e2533', marginBottom: 6 }}>Ôn luyện</div>
                <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                  Từng câu một, xem đáp án ngay. Không giới hạn thời gian, thoải mái học.
                </p>
                <div style={{ marginTop: 14, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>✅ Đáp án tức thì</span>
                  <span style={{ fontSize: 10, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>🧘 Không áp lực</span>
                </div>
              </div>
            </div>

            {/* Preview Statistics & Leaderboard */}
            <div className="mt-12 text-left">
              {loadingPreviewStats ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Đang tải dữ liệu thống kê...</p>
                </div>
              ) : examStats ? (
                <div className="space-y-8 animate-fadeIn">

                  {/* --- Thống kê --- */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Chi tiết thống kê</h3>
                    </div>
                    <div className="flex bg-white border border-gray-200/60 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-indigo-600 text-white w-12 flex items-center justify-center shrink-0">
                        <span className="font-bold tracking-widest text-sm" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>CHI TIẾT</span>
                      </div>
                      <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50">
                        {/* Hàng 1 */}
                        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm">
                          <div className="text-xs text-gray-500 font-medium mb-1">Tổng thí sinh</div>
                          <div className="text-2xl font-black text-indigo-900">{examStats.totalParticipants} <span className="text-xs font-normal text-gray-400">(Thí sinh tham gia)</span></div>
                        </div>
                        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm">
                          <div className="text-xs text-gray-500 font-medium mb-1">Điểm trung bình</div>
                          <div className="text-2xl font-black text-indigo-900">{examStats.avgScore} <span className="text-xs font-normal text-gray-400">(Điểm)</span></div>
                        </div>
                        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm">
                          <div className="text-xs text-gray-500 font-medium mb-1">Điểm trung vị</div>
                          <div className="text-2xl font-black text-indigo-900">{examStats.medianScore} <span className="text-xs font-normal text-gray-400">(Điểm)</span></div>
                        </div>
                        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm">
                          <div className="text-xs text-gray-500 font-medium mb-1">Thời gian làm bài tb</div>
                          <div className="text-xl font-black text-indigo-900">
                            {Math.floor(examStats.avgTime / 60)} <span className="text-sm font-medium text-gray-500">Phút</span> {examStats.avgTime % 60} <span className="text-sm font-medium text-gray-500">Giây</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- Bảng xếp hạng --- */}
                  {examLeaderboard.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Award className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Bảng xếp hạng (Top 10)</h3>
                      </div>
                      <div className="bg-white border border-gray-200/60 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-[#1f4e79] text-white text-xs font-semibold uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3 text-center w-12">Stt</th>
                                <th className="px-4 py-3 text-center w-16">Ảnh</th>
                                <th className="px-4 py-3">Tên học sinh</th>
                                <th className="px-4 py-3 text-center">Điểm thi</th>
                                <th className="px-4 py-3 text-center">Ngày thi</th>
                                <th className="px-4 py-3 text-right">Thời gian làm bài</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {examLeaderboard.map((attempt, index) => (
                                <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-center">
                                    <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold text-white
                                      ${index === 0 ? 'bg-amber-500 shadow-md shadow-amber-500/20' :
                                        index === 1 ? 'bg-slate-400 shadow-md shadow-slate-400/20' :
                                          index === 2 ? 'bg-amber-700 shadow-md shadow-amber-700/20' : 'bg-gray-300'}
                                    `}>
                                      {index + 1}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {attempt.profiles?.avatar_url ? (
                                      <img src={attempt.profiles.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full mx-auto object-cover ring-2 ring-gray-100" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto font-bold text-xs">
                                        {(attempt.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </td>
                                  <td className={`px-4 py-3 font-semibold ${index < 3 ? 'text-indigo-600' : 'text-gray-700'}`}>
                                    {attempt.profiles?.full_name || 'Học sinh ẩn danh'}
                                  </td>
                                  <td className={`px-4 py-3 text-center font-bold ${index < 3 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {attempt.score.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-500 text-xs font-medium">
                                    {new Date(attempt.created_at).toLocaleDateString('vi-VN')}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-600 font-medium">
                                    {Math.floor(attempt.time_spent / 60)} phút {attempt.time_spent % 60} giây
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── QUIZ (2-column layout) ──
  if (quizPhase === 'quiz' && activeExam) {
    const pct = realQuestions.length > 0 ? Math.round((answeredCount / realQuestions.length) * 100) : 0;
    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={() => {
          showConfirm('Xác nhận thoát', 'Tiến trình làm bài của bạn sẽ được lưu lại tự động. Bạn có chắc chắn muốn thoát?', () => handleReset());
        }}>
          <div className="mobile-only bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-indigo-600" />
            <Timer compact initialMinutes={activeExam.duration || 90} initialSeconds={savedSecondsLeft} onTick={handleTick} onTimeUp={handleTimeUp} isRunning={timerRunning} />
          </div>
          <button className="et-btn-outline" style={{ fontSize: 12, padding: '5px 11px' }} onClick={handlePause} title="Tạm dừng">
            <PauseIcon /> <span className="hidden sm:inline">Tạm dừng</span>
          </button>
          {isAntiCheatEnabled && violationCount > 0 && (
            <div title={`Vi phạm: ${violationCount}/${MAX_VIOLATIONS}`} style={{
              background: violationCount >= 3 ? '#ef4444' : '#f59e0b',
              color: '#fff', fontSize: 10, fontWeight: 800,
              padding: '3px 8px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              ⚠ {violationCount}/{MAX_VIOLATIONS}
            </div>
          )}
        </Topbar>
        <div className={`et-screen ${isSidebarCollapsed ? 'sidebar-hidden' : ''}`} style={{ position: 'relative' }}>

          <button className="et-fab mobile-only" onClick={() => setIsDrawerOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>

          {isPaused && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 100,
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              background: 'rgba(255,255,255,0.6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 16
            }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, color: 'var(--et-blue)' }}>Đã tạm dừng</h2>
              <p style={{ color: 'var(--et-gray-600)', marginBottom: 32, fontSize: 15 }}>Tiến độ làm bài và thời gian của bạn đã được lưu lại.</p>
              <button onClick={handleResume} style={{
                padding: '12px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--et-blue)', color: '#fff', fontSize: 15, fontWeight: 600,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <PlayIcon /> Tiếp tục làm bài
              </button>
            </div>
          )}

          {/* Violation Warning Overlay */}
          {showViolationWarning && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 200,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              background: 'rgba(220, 38, 38, 0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#dc2626', textAlign: 'center' }}>
                Cảnh báo vi phạm!
              </h2>
              <p style={{ color: '#991b1b', marginBottom: 8, fontSize: 15, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
                Bạn đã thoát khỏi chế độ toàn màn hình hoặc chuyển tab.
                Đây là hành vi không được phép trong khi thi.
              </p>
              <div style={{
                background: violationCount >= 4 ? '#fef2f2' : '#fefce8',
                border: `1px solid ${violationCount >= 4 ? '#fecaca' : '#fef08a'}`,
                borderRadius: 12, padding: '12px 20px', marginBottom: 24,
                fontSize: 14, fontWeight: 700, textAlign: 'center',
                color: violationCount >= 4 ? '#dc2626' : '#92400e',
              }}>
                Lần vi phạm: <span style={{ fontSize: 20 }}>{violationCount}</span> / {MAX_VIOLATIONS}
                {violationCount >= 4 && <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>⚠ Lần vi phạm tiếp theo sẽ tự động nộp bài!</div>}
              </div>
              <button onClick={handleDismissViolationWarning} style={{
                padding: '12px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
                onMouseOver={e => e.target.style.background = '#b91c1c'}
                onMouseOut={e => e.target.style.background = '#dc2626'}
              >
                🔒 {canFullscreen ? 'Quay lại làm bài (Toàn màn hình)' : 'Quay lại làm bài'}
              </button>
            </div>
          )}

          {/* Main area */}
          <div className="et-main" ref={mainRef}>
            <div className="et-exam-hd">
              <div>
                <div className="et-exam-title">{activeExam.title}</div>
                <div className="et-exam-sub">{activeExam.subject} · {realQuestions.length} câu</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="et-btn-outline" style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => { showConfirm('Làm lại từ đầu', 'Toàn bộ câu trả lời hiện tại sẽ bị xóa. Bạn có chắc chắn?', () => handleRetry()); }}>
                  <RotateCcw style={{ width: 13, height: 13 }} /> Làm lại
                </button>
              </div>
            </div>

            {(() => {
              let realQIndex = 0;
              return groupedQuestions.map((group, gIdx) => {
                const firstChild = group.children[0];
                const isFirstMCQ = firstChild?._isFirstMCQ;
                const isFirstTF = firstChild?._isFirstTF;
                const isFirstSA = firstChild?._isFirstSA;

                const sectionHeader = (
                  <>
                    {isFirstMCQ && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần I: Câu hỏi trắc nghiệm nhiều phương án lựa chọn</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstTF && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần II: Câu hỏi trắc nghiệm đúng sai</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstSA && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần III: Câu hỏi trắc nghiệm trả lời ngắn</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                  </>
                );

                if (group.context) {
                  return (
                    <div key={`group-${gIdx}`}>
                      {sectionHeader}
                      <div className="mb-8 border-2 border-dashed border-indigo-200/80 rounded-2xl p-4 sm:p-6 bg-transparent transition-all">
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Dựa vào thông tin sau để trả lời các câu hỏi bên dưới:</p>
                          </div>
                          <div className="et-q-text text-gray-800 leading-relaxed text-[15px]">
                            <MathRenderer text={group.context.content} />
                          </div>
                          {group.context.image && (
                            <img src={group.context.image} alt="Context image" className="max-w-full rounded-xl border border-gray-200 mt-4 max-h-[300px] object-contain" />
                          )}
                        </div>

                        <div className="flex flex-col gap-5 pl-2 sm:pl-4 border-l-2 border-indigo-100">
                          {group.children.map(childQ => {
                            const currentI = realQIndex++;
                            return (
                              <div key={childQ.id} id={`q-card-${currentI}`} onClick={() => setCurrentQ(currentI)}>
                                <QuestionCard
                                  question={childQ}
                                  index={currentI}
                                  selectedAnswer={answers[childQ.id] || (childQ.type === 'TF' ? {} : '')}
                                  onAnswerChange={(val) => handleAnswerChange(childQ.id, val)}
                                  isBookmarked={bookmarks.has(childQ.id)}
                                  onToggleBookmark={() => {
                                    const next = new Set(bookmarks);
                                    if (next.has(childQ.id)) next.delete(childQ.id);
                                    else next.add(childQ.id);
                                    setBookmarks(next);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Single normal question
                  if (!firstChild) return null;
                  const currentI = realQIndex++;
                  return (
                    <div key={firstChild.id} id={`q-card-${currentI}`} onClick={() => setCurrentQ(currentI)}>
                      {sectionHeader}

                      {firstChild.contextHint && (
                        <div className="et-section-hint">
                          <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{firstChild.contextHint}</span>
                        </div>
                      )}

                      <QuestionCard
                        question={firstChild}
                        index={currentI}
                        selectedAnswer={answers[firstChild.id] || (firstChild.type === 'TF' ? {} : '')}
                        onAnswerChange={(val) => handleAnswerChange(firstChild.id, val)}
                        isBookmarked={bookmarks.has(firstChild.id)}
                        onToggleBookmark={() => {
                          const next = new Set(bookmarks);
                          if (next.has(firstChild.id)) next.delete(firstChild.id);
                          else next.add(firstChild.id);
                          setBookmarks(next);
                        }}
                      />
                    </div>
                  );
                }
              });
            })()}

            {/* Bottom Submit Button */}
            <div className="mt-8 mb-24 flex justify-center">
              <button
                onClick={() => {
                  const unanswered = realQuestions.length - answeredCount;
                  const msg = unanswered > 0
                    ? `⚠️ CẢNH BÁO: Bạn còn ${unanswered} câu chưa làm!\n\nBạn đã trả lời ${answeredCount}/${realQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`
                    : `Bạn đã trả lời ${answeredCount}/${realQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`;
                  showConfirm('Xác nhận nộp bài', msg, () => handleSubmit());
                }}
                className="px-8 py-3.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 18, height: 18 }}><polyline points="20 6 9 17 4 12" /></svg>
                Hoàn thành & Nộp bài
              </button>
            </div>
          </div>

          {/* Drawer Overlay for Mobile */}
          <div className={`et-drawer-overlay mobile-only ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />

          {/* Mobile Drawer */}
          <div className={`et-drawer mobile-only flex flex-col ${isDrawerOpen ? 'open' : ''}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Danh sách câu hỏi</div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="et-prog-row mt-2"><span>Đã làm</span><span>{answeredCount} / {realQuestions.length}</span></div>
            <div className="et-prog-bg mb-4"><div className="et-prog-fill" style={{ width: `${pct}%` }} /></div>

            <div className="mb-4">
              {renderNavButtons((q, i) => {
                const a = answers[q.id];
                const isAnswered = a && (typeof a === 'object' ? Object.keys(a).length > 0 : a !== '');
                const isBookmarked = bookmarks.has(q.id);
                let cls = '';
                if (i === currentQ) cls = 'current';
                else if (isBookmarked) cls = 'bookmarked';
                else if (isAnswered) cls = 'answered';
                return (
                  <button key={i} className={`et-nav-btn ${cls}`} onClick={() => { setIsDrawerOpen(false); scrollToQ(i); }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl" onClick={() => { setIsDrawerOpen(false); handlePause(); }}>
                Tạm dừng
              </button>
              <button className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2" onClick={() => {
                setIsDrawerOpen(false);
                const unanswered = realQuestions.length - answeredCount;
                const msg = unanswered > 0
                  ? `⚠️ CẢNH BÁO: Bạn còn ${unanswered} câu chưa làm!\n\nBạn đã trả lời ${answeredCount}/${realQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`
                  : `Bạn đã trả lời ${answeredCount}/${realQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`;
                showConfirm('Xác nhận nộp bài', msg, () => handleSubmit());
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
                Nộp bài
              </button>
            </div>
          </div>

          {/* Sidebar Toggle (outside sidebar to avoid overflow clipping) */}
          {isSidebarCollapsed && (
            <button className="et-sidebar-toggle desktop-only" onClick={() => setIsSidebarCollapsed(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 25, height: 25 }}><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
          )}

          {/* Sidebar */}
          <div className={`et-sidebar desktop-only ${isSidebarCollapsed ? 'et-sidebar-collapsed' : ''}`}>
            <div style={{ position: 'relative' }}>
              <button className="absolute right-3 top-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setIsSidebarCollapsed(true)} title="Đóng panel">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 25, height: 25 }}><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <Timer initialMinutes={activeExam.duration || 90} initialSeconds={savedSecondsLeft} onTick={handleTick} onTimeUp={handleTimeUp} isRunning={timerRunning} />
            </div>

            <button className="et-btn-submit" onClick={() => {
              const unanswered = realQuestions.length - answeredCount;
              const msg = unanswered > 0
                ? `⚠️ CẢNH BÁO: Bạn còn ${unanswered} câu chưa làm!\n\nBạn đã trả lời ${answeredCount}/${realQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`
                : `Bạn đã trả lời ${answeredCount}/${realQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`;
              showConfirm('Xác nhận nộp bài', msg, () => handleSubmit());
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12" /></svg>
              Nộp bài
            </button>

            <div className="et-prog-block">
              <div className="et-prog-row"><span>Đã làm</span><span>{answeredCount} / {realQuestions.length}</span></div>
              <div className="et-prog-bg"><div className="et-prog-fill" style={{ width: `${pct}%` }} /></div>
            </div>

            <div className="et-nav-block">
              <div className="et-nav-title">Danh sách câu hỏi</div>
              {renderNavButtons((q, i) => {
                const a = answers[q.id];
                const isAnswered = a && (typeof a === 'object' ? Object.keys(a).length > 0 : a !== '');
                const isBookmarked = bookmarks.has(q.id);
                let cls = '';
                if (i === currentQ) cls = 'current';
                else if (isBookmarked) cls = 'bookmarked';
                else if (isAnswered) cls = 'answered';
                return (
                  <button key={i} className={`et-nav-btn ${cls}`} onClick={() => scrollToQ(i)}>
                    {i + 1}
                  </button>
                );
              })}
              <div className="et-nav-legend mt-4">
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: '#e0e7ff', border: '1.5px solid #4f46e5' }} />Đã trả lời</div>
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: '#fef3c7', border: '1.5px solid #d97706' }} />Đánh dấu</div>
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: '#fff', border: '1.5px solid #d1d5db' }} />Chưa làm</div>
              </div>
            </div>
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── RESULTS SUMMARY ──
  if (quizPhase === 'results' && activeExam) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset} />
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm text-center animate-fadeIn">
            <ResultsView questions={questions} answers={answers} onReset={handleRetry} />
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => setQuizPhase('results-detail')}
                className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2"
              >
                Xem chi tiết bài thi <ChevronRight className="w-4 h-4" />
              </button>
              <button className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2" onClick={handleReset}>
                <ArrowLeft className="w-4 h-4" /> Chọn đề khác
              </button>
            </div>
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── RESULTS DETAIL (2-column layout) ──
  if (quizPhase === 'results-detail' && activeExam) {
    let correctCount = 0;
    realQuestions.forEach(q => {
      const ua = answers[q.id] || '';
      let ok = false;
      if (q.type === 'MCQ') ok = ua === q.answer;
      else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
        const s = typeof ua === 'object' ? ua : {};
        ok = Object.keys(q.answer).every(k => s[k] === q.answer[k]);
      } else ok = (ua || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
      if (ok) correctCount++;
    });
    const pct = realQuestions.length > 0 ? Math.round((correctCount / realQuestions.length) * 100) : 0;

    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset} />
        <div className={`et-screen ${isSidebarCollapsed ? 'sidebar-hidden' : ''}`} style={{ position: 'relative' }}>
          <div className="et-main">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button className="et-btn-outline" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setQuizPhase('results')}>
                <ArrowLeft style={{ width: 14, height: 14 }} /> Quay lại kết quả
              </button>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--et-gray-400)' }}>
                Chi tiết từng câu
              </div>
            </div>
            {(() => {
              let realQIndex = 0;
              return groupedQuestions.map((group, gIdx) => {
                const firstChild = group.children[0];
                const isFirstMCQ = firstChild?._isFirstMCQ;
                const isFirstTF = firstChild?._isFirstTF;
                const isFirstSA = firstChild?._isFirstSA;

                const sectionHeader = (
                  <>
                    {isFirstMCQ && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần I: Câu hỏi trắc nghiệm nhiều phương án lựa chọn</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstTF && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần II: Câu hỏi trắc nghiệm đúng sai</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstSA && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần III: Câu hỏi trắc nghiệm trả lời ngắn</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                  </>
                );

                if (group.context) {
                  return (
                    <div key={`group-${gIdx}`}>
                      {sectionHeader}
                      <div className="mb-8 border-2 border-dashed border-indigo-200/80 rounded-2xl p-4 sm:p-6 bg-transparent transition-all">
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Dựa vào thông tin sau để trả lời các câu hỏi bên dưới:</p>
                          </div>
                          <div className="et-q-text text-gray-800 leading-relaxed text-[15px]">
                            <MathRenderer text={group.context.content} />
                          </div>
                          {group.context.image && (
                            <img src={group.context.image} alt="Context image" className="max-w-full rounded-xl border border-gray-200 mt-4 max-h-[300px] object-contain" />
                          )}
                        </div>

                        <div className="flex flex-col gap-5 pl-2 sm:pl-4 border-l-2 border-indigo-100">
                          {group.children.map(childQ => {
                            const currentI = realQIndex++;
                            return (
                              <div key={childQ.id} id={`q-card-${currentI}`}>
                                <QuestionCard
                                  question={childQ}
                                  index={currentI}
                                  selectedAnswer={answers[childQ.id] || (childQ.type === 'TF' ? {} : '')}
                                  onAnswerChange={() => { }}
                                  showResult
                                  disabled
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Single normal question
                  if (!firstChild) return null;
                  const currentI = realQIndex++;
                  return (
                    <div key={firstChild.id} id={`q-card-${currentI}`}>
                      {sectionHeader}

                      {firstChild.contextHint && (
                        <div className="et-section-hint">
                          <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{firstChild.contextHint}</span>
                        </div>
                      )}

                      <QuestionCard
                        question={firstChild}
                        index={currentI}
                        selectedAnswer={answers[firstChild.id] || (firstChild.type === 'TF' ? {} : '')}
                        onAnswerChange={() => { }}
                        showResult
                        disabled
                      />
                    </div>
                  );
                }
              });
            })()}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '24px 0' }}>
              <button className="et-btn-outline" onClick={handleRetry}><RotateCcw style={{ width: 13, height: 13 }} /> Làm lại đề này</button>
              <button className="et-btn-outline" onClick={handleReset}><ArrowLeft style={{ width: 13, height: 13 }} /> Chọn đề khác</button>
            </div>
          </div>

          <button className="et-fab mobile-only" onClick={() => setIsDrawerOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>

          {/* Drawer Overlay for Mobile */}
          <div className={`et-drawer-overlay mobile-only ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />

          {/* Mobile Drawer */}
          <div className={`et-drawer mobile-only flex flex-col ${isDrawerOpen ? 'open' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Chi tiết bài làm</div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Summary */}
            <div className="flex items-center justify-between bg-indigo-50 rounded-xl p-4 mb-5">
              <div>
                <div className="text-2xl font-black text-indigo-600">{correctCount}/{realQuestions.length}</div>
                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-1">Câu đúng</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">{(realQuestions.length > 0 ? (correctCount / realQuestions.length * 10) : 0).toFixed(1)}</div>
                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-1">Điểm số</div>
              </div>
            </div>

            <div className="mb-4">
              {renderNavButtons((q, i) => {
                const ua = answers[q.id] || '';
                let ok = false;
                if (q.type === 'MCQ') ok = ua === q.answer;
                else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
                  const s = typeof ua === 'object' ? ua : {};
                  ok = Object.keys(q.answer).every(k => s[k] === q.answer[k]);
                } else ok = (ua || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
                return (
                  <button key={i} className={`et-nav-btn ${ok ? 'correct' : 'wrong'}`} onClick={() => { setIsDrawerOpen(false); scrollToQ(i); }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="et-nav-legend flex-row justify-center gap-6 mt-0">
              <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-green-lt)', border: '1.5px solid var(--et-green)' }} />Đúng</div>
              <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-red-lt)', border: '1.5px solid var(--et-red)' }} />Sai</div>
            </div>
          </div>

          {/* Sidebar Toggle (outside sidebar to avoid overflow clipping) */}
          {isSidebarCollapsed && (
            <button className="et-sidebar-toggle desktop-only" onClick={() => setIsSidebarCollapsed(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
          )}

          {/* Results sidebar with nav */}
          <div className={`et-sidebar desktop-only ${isSidebarCollapsed ? 'et-sidebar-collapsed' : ''}`}>
            <div className="et-timer-block" style={{ position: 'relative' }}>
              <button className="absolute right-3 top-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setIsSidebarCollapsed(true)} title="Đóng panel">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <div className="et-timer-lbl">📊 Kết quả</div>
              <div className="et-timer-disp" style={{ fontSize: 28 }}>Hoàn thành</div>
            </div>
            <div className="et-nav-block">
              <div className="et-nav-title">Danh sách câu hỏi</div>
              {renderNavButtons((q, i) => {
                const ua = answers[q.id] || '';
                let ok = false;
                if (q.type === 'MCQ') ok = ua === q.answer;
                else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
                  const s = typeof ua === 'object' ? ua : {};
                  ok = Object.keys(q.answer).every(k => s[k] === q.answer[k]);
                } else ok = (ua || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
                return (
                  <button key={i} className={`et-nav-btn ${ok ? 'correct' : 'wrong'}`} onClick={() => scrollToQ(i)}>
                    {i + 1}
                  </button>
                );
              })}
              <div className="et-nav-legend mt-4">
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-green-lt)', border: '1.5px solid var(--et-green)' }} />Đúng</div>
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-red-lt)', border: '1.5px solid var(--et-red)' }} />Sai</div>
              </div>
            </div>
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── BROWSE (Home Page with Filtering and Pagination) ──
  const filteredExams = allExams.filter(ex => {
    if (searchQuery && !ex.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selYear && String(ex.year) !== String(selYear)) return false;
    if (selType && ex.examType !== selType) return false;
    if (selSubject && ex.subject !== selSubject) return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'default') return 0; // Giữ nguyên thứ tự order_index từ database
    if (sortOrder === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortOrder === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (sortOrder === 'az') return a.title.localeCompare(b.title);
    return 0;
  });

  const browseTotalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const visibleExams = filteredExams.slice((browsePage - 1) * ITEMS_PER_PAGE, browsePage * ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelYear(null);
    setSelType(null);
    setSelSubject(null);
  };

  return (
    <main className="min-h-screen bg-gray-50" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 flex flex-col gap-6">
        {/* Banner Section */}
        <div className="relative bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mb-2 flex items-center gap-2">
              Kho đề thi luyện tập <span className="text-2xl">📚</span>
            </h1>
            <p className="text-sm sm:text-base text-indigo-800/80 mb-3 font-medium">
              {allExams.length} đề — THPT Quốc gia · HSA · TSA
            </p>
            <p className="text-sm text-indigo-900/60 leading-relaxed max-w-md">
              Luyện tập với kho đề đa dạng, bám sát cấu trúc đề thi thật, giúp bạn nâng cao kỹ năng và tự tin chinh phục kỳ thi.
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-50/50 to-transparent z-0 pointer-events-none" />
        </div>

        {/* Filter Bar */}
        <FilterBar
          search={searchQuery} onSearch={setSearchQuery}
          selYear={selYear} onYear={setSelYear}
          selType={selType} onType={setSelType}
          selSubject={selSubject} onSubject={setSelSubject}
          resultCount={filteredExams.length}
          totalCount={allExams.length}
          onClear={handleClearFilters}
          sortOrder={sortOrder} onSortOrder={setSortOrder}
        />

        {/* Exam Grid */}
        {visibleExams.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleExams.map(exam => (
                <ExamCard key={exam.id} exam={exam} onStart={handleStartExam} isSaved={savedExams.has(exam.id.toString())} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={browsePage}
                totalPages={browseTotalPages}
                onPageChange={setBrowsePage}
                variant="light"
              />
            </div>
          </>
        ) : (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Không tìm thấy đề thi</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem các đề thi khác.</p>
            <button onClick={handleClearFilters} className="px-5 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-sm hover:bg-indigo-100 transition-colors">
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
