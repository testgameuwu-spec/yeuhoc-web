'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, CaretRight, CaretLeft, ArrowCounterClockwise, Clock, X, ChartBar, Medal, Eye, Robot, FloppyDisk, Lock, Users, Exam } from '@phosphor-icons/react';
import UserProfile from '@/components/UserProfile';
import { getExamById } from '@/lib/examStore';
import QuestionCard from '@/components/QuestionCard';
import ReportModal, { REPORT_REASONS } from '@/components/QuestionReportModal';
import MathRenderer from '@/components/MathRenderer';
import ResultsView from '@/components/ResultsView';
import Timer from '@/components/Timer';
import ThemeToggle from '@/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { getEmptyAnswerForType, getQuestionResultState } from '@/lib/questionResult';
import {
  calculateExamResult,
  getTsaSectionByIndex,
  getTsaSectionElapsedSeconds,
  getTsaSectionIndex,
  isTsaExam,
  TSA_SECTIONS,
  TSA_TOTAL_DURATION_MINUTES,
} from '@/lib/examScoring';

const PRACTICE_BUTTON_TONES = {
  nav: { bg: 'var(--practice-nav-bg)', color: 'var(--practice-nav-text)', border: 'var(--practice-nav-border)', shadow: 'var(--practice-nav-shadow)' },
  hint: { bg: 'var(--practice-hint-bg)', color: 'var(--practice-hint-text)', border: 'var(--practice-hint-border)', shadow: 'var(--practice-hint-shadow)' },
  answer: { bg: 'var(--practice-answer-bg)', color: 'var(--practice-answer-text)', border: 'var(--practice-answer-border)', shadow: 'var(--practice-answer-shadow)' },
};

const PREVIEW_BADGE_TONES = {
  subject: { bg: 'var(--et-blue-lt)', color: 'var(--et-blue)', dark: '#60a5fa' },
  duration: { bg: 'var(--et-amber-lt)', color: 'var(--et-amber)', dark: '#fcd34d' },
  questions: { bg: 'var(--et-green-lt)', color: 'var(--et-green)', dark: '#86efac' },
  meta: { bg: 'var(--et-gray-100)', color: 'var(--et-gray-600)', dark: '#bfdbfe' },
  fullscreen: { bg: '#fce7f3', color: '#9d174d', dark: '#f9a8d4' },
  calm: { bg: '#ede9fe', color: '#5b21b6', dark: '#c4b5fd' },
};

const PracticeAIChatbox = dynamic(() => import('@/components/PracticeAIChatbox'), { ssr: false });

function getPracticeButtonStyle(toneKey, disabled = false) {
  const tone = PRACTICE_BUTTON_TONES[toneKey] || PRACTICE_BUTTON_TONES.nav;
  const color = disabled ? 'var(--practice-button-disabled-text)' : tone.color;
  const borderColor = disabled ? 'var(--practice-button-disabled-border)' : tone.border;

  return {
    background: disabled ? 'var(--practice-button-disabled-bg)' : tone.bg,
    color,
    border: `1.5px solid ${borderColor}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : `0 8px 20px ${tone.shadow}`,
    opacity: disabled ? .68 : 1,
  };
}

function getPreviewBadgeStyle(toneKey) {
  const tone = PREVIEW_BADGE_TONES[toneKey] || PREVIEW_BADGE_TONES.meta;

  return {
    '--preview-badge-bg': tone.bg,
    '--preview-badge-color': tone.color,
    '--preview-badge-dark-color': tone.dark,
  };
}

// ── Topbar (exam-tool style) ──
const Topbar = ({ activeExam, handleReset, children }) => (
  <div className="et-topbar">
    <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={handleReset}>
      <svg viewBox="0 0 970 836" xmlns="http://www.w3.org/2000/svg" width="70" height="70" className="" style={{ display: 'block' }}>
        <g>
          <path d="M 610.08 611.00 C581.86,569.21 553.33,543.51 489.00,501.97 C461.93,484.48 451.48,476.62 439.82,464.96 C420.52,445.66 409.10,422.51 406.06,396.50 C405.44,391.18 405.01,363.58 405.01,329.00 C405.01,282.32 405.30,268.67 406.48,261.44 C413.24,219.74 448.63,184.49 492.43,175.82 C500.34,174.25 525.44,174.26 535.00,175.82 C562.27,180.30 592.85,197.09 617.34,221.04 L 627.42 230.90 L 637.96 220.67 C662.60,196.76 687.66,182.37 715.00,176.45 C731.18,172.94 755.67,173.66 772.00,178.12 C781.66,180.76 797.70,188.68 806.03,194.93 C814.41,201.22 827.95,215.32 832.63,222.63 C840.84,235.47 847.11,252.28 848.42,265.00 C849.60,276.47 849.32,396.28 848.09,403.00 C844.13,424.72 833.54,444.97 817.07,462.30 C804.78,475.22 796.19,481.81 763.00,503.80 C746.78,514.54 728.10,527.26 721.50,532.05 C690.28,554.73 666.05,579.63 644.46,611.22 C641.18,616.02 638.14,619.96 637.71,619.97 C637.27,619.99 637.06,578.94 637.25,528.75 L 637.58 437.50 L 640.22 427.50 C652.45,381.16 687.64,346.72 748.50,321.53 C756.89,318.05 777.00,311.15 785.04,308.99 L 789.17 307.88 L 788.79 287.19 C788.43,267.58 788.27,266.14 785.73,259.70 C782.18,250.69 777.78,244.76 770.69,239.43 C759.94,231.35 742.88,228.23 726.94,231.44 C696.46,237.58 673.87,254.15 656.28,283.29 C645.64,300.91 639.38,306.13 628.80,306.20 C616.74,306.28 609.87,301.68 602.18,288.38 C581.24,252.15 548.25,230.08 514.93,230.02 C507.02,230.00 496.27,232.33 489.58,235.52 C483.06,238.63 473.66,248.21 470.25,255.22 C465.65,264.68 464.84,270.32 465.19,290.39 L 465.50 308.27 L 470.59 309.57 C473.39,310.29 481.26,312.76 488.09,315.06 C523.75,327.10 554.78,344.49 575.17,363.86 C595.52,383.20 606.88,402.20 613.76,428.42 L 616.41 438.50 L 616.75 519.00 C616.93,563.28 616.95,604.22 616.79,610.00 L 616.50 620.50 L 610.08 611.00 ZM 566.60 473.25 C565.60,463.38 562.30,447.66 559.31,438.50 C549.12,407.32 525.31,386.77 477.08,367.56 C470.79,365.06 465.48,363.19 465.27,363.40 C465.05,363.61 464.90,369.57 464.93,376.64 C465.02,398.17 470.12,411.37 483.41,424.51 C490.54,431.56 496.70,435.74 522.50,450.98 C538.43,460.40 564.48,477.35 565.46,478.94 C566.92,481.30 567.24,479.67 566.60,473.25 ZM 702.01 469.48 C715.99,460.12 727.00,453.28 747.50,441.23 C754.10,437.34 762.20,431.98 765.50,429.30 C773.63,422.71 781.36,412.19 785.18,402.50 C788.14,395.00 788.36,393.51 788.79,378.75 C789.04,370.09 789.00,363.00 788.70,363.00 C787.17,363.00 760.29,374.32 752.45,378.26 C724.22,392.47 704.57,411.85 696.22,433.74 C693.25,441.54 688.76,460.75 687.52,471.00 C687.15,474.02 686.62,477.34 686.33,478.36 C685.93,479.74 686.15,479.99 687.15,479.36 C687.90,478.89 694.58,474.44 702.01,469.48 Z" fill="var(--et-blue)"></path>
        </g>
      </svg>
      <span className="hidden sm:inline font-bold text-[17px] text-[var(--et-blue)]">YeuHoc</span>
    </div>
    <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-400 flex-1 min-w-0 ml-4">
      <span className="cursor-pointer shrink-0 hover:text-indigo-600 transition-colors" onClick={handleReset}>Trang chủ</span>
      <CaretRight weight="bold" className="w-3.5 h-3.5 shrink-0" />
      <span className="text-gray-800 font-semibold truncate">{activeExam?.title || 'Đề thi'}</span>
    </div>
    <div className="flex items-center gap-3 shrink-0 ml-auto">
      {children}
      <ThemeToggle />
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

const formatClock = (seconds) => {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const hasPracticeAnswer = (answer) => {
  if (!answer) return false;
  if (typeof answer === 'object') return Object.keys(answer).length > 0;
  return answer !== '';
};

const isValidImageSrc = (src) => {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'không') return false;
  return trimmed.startsWith('/') || trimmed.startsWith('http');
};

const createPracticeSnapshot = ({ answers, bookmarks, currentQ, practiceRevealed, realQuestions }) => {
  const nextAnswers = answers || {};
  const nextRevealed = practiceRevealed || {};
  const bookmarkList = bookmarks instanceof Set ? Array.from(bookmarks) : (Array.isArray(bookmarks) ? bookmarks : []);
  const revealedCount = Object.values(nextRevealed).filter(Boolean).length;
  const totalQuestions = realQuestions.length;
  const savedAt = new Date().toISOString();

  return {
    answers: nextAnswers,
    bookmarks: bookmarkList,
    currentQ: Math.min(Math.max(Number(currentQ) || 0, 0), Math.max(totalQuestions - 1, 0)),
    practiceRevealed: nextRevealed,
    answeredCount: realQuestions.filter(question => hasPracticeAnswer(nextAnswers[question.id])).length,
    revealedCount,
    totalQuestions,
    completed: totalQuestions > 0 && revealedCount >= totalQuestions,
    savedAt,
  };
};

const createQuizProgressSnapshot = ({ answers, bookmarks, secondsLeft, currentQ, violationCount, tsaSectionIndex = 0, tsaElapsedSeconds = 0 }) => ({
  answers: answers || {},
  bookmarks: bookmarks instanceof Set ? Array.from(bookmarks) : (Array.isArray(bookmarks) ? bookmarks : []),
  secondsLeft,
  currentQ: Number(currentQ) || 0,
  violationCount: Number(violationCount) || 0,
  tsaSectionIndex: Number(tsaSectionIndex) || 0,
  tsaElapsedSeconds: Number(tsaElapsedSeconds) || 0,
  savedAt: new Date().toISOString(),
});

export default function ExamSessionPage({ examId, shouldResume = false, shouldResumePractice = false }) {

  const router = useRouter();

  // Quiz flow states
  const [activeExam, setActiveExam] = useState(null);
  const [quizPhase, setQuizPhase] = useState('preview'); // preview | quiz | results | practice
  const [answers, setAnswers] = useState({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [tsaSectionIndex, setTsaSectionIndex] = useState(0);
  const [tsaElapsedSeconds, setTsaElapsedSeconds] = useState(0);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [examLoadError, setExamLoadError] = useState('');

  // Pause & Resume states
  const [isPaused, setIsPaused] = useState(false);
  const [savedSecondsLeft, setSavedSecondsLeft] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiChatMounted, setAiChatMounted] = useState(false);

  // Time spent per question tracking
  const [currentQStartTime, setCurrentQStartTime] = useState(0);
  const [currentQElapsed, setCurrentQElapsed] = useState(0);

  useEffect(() => {
    setCurrentQStartTime(Date.now());
    setCurrentQElapsed(0);
  }, [currentQ]);

  useEffect(() => {
    if (quizPhase === 'quiz' && timerRunning) {
      const interval = setInterval(() => {
        setCurrentQElapsed(Math.floor((Date.now() - currentQStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quizPhase, timerRunning, currentQStartTime]);

  // Preview Stats
  const [examStats, setExamStats] = useState(null);
  const [examLeaderboard, setExamLeaderboard] = useState([]);
  const [loadingPreviewStats, setLoadingPreviewStats] = useState(false);

  // Anti-cheat fullscreen states
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const MAX_VIOLATIONS = 5;
  const isSubmittingRef = useRef(false);
  const isAdvancingTsaSectionRef = useRef(false);
  const resumeHandledRef = useRef(false);
  const practiceResumeHandledRef = useRef(false);
  const exitViolationRecordedRef = useRef(false);

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null, onCancel: null, confirmText: 'Xác nhận', cancelText: 'Hủy', extraBtn: null });

  const showAlert = useCallback((title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null, onCancel: null, extraBtn: null }), []);
  const showConfirm = useCallback((title, message, onConfirm, onCancel = null, confirmText = 'Xác nhận', cancelText = 'Hủy', extraBtn = null) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm, onCancel, confirmText, cancelText, extraBtn }), []);
  const closeModal = useCallback(() => setModal(prev => ({ ...prev, isOpen: false })), []);

  // Report modal states
  const [reportModal, setReportModal] = useState({ isOpen: false, question: null });

  const handleOpenReport = (question) => {
    setReportModal({ isOpen: true, question });
  };

  const mainRef = useRef(null);

  // ── Swipe-to-close gesture support ──
  const swipeTouchRef = useRef({ startX: 0, startY: 0 });
  const makeSwipeHandlers = useCallback((onClose) => ({
    onTouchStart: (e) => {
      swipeTouchRef.current.startX = e.touches[0].clientX;
      swipeTouchRef.current.startY = e.touches[0].clientY;
    },
    onTouchEnd: (e) => {
      const dx = e.changedTouches[0].clientX - swipeTouchRef.current.startX;
      const dy = e.changedTouches[0].clientY - swipeTouchRef.current.startY;
      if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onClose();
    },
  }), []);

  const drawerSwipeHandlers = useMemo(() => makeSwipeHandlers(() => setIsDrawerOpen(false)), [makeSwipeHandlers]);
  const tsaSidebarSwipeHandlers = useMemo(() => makeSwipeHandlers(() => {
    const el = document.querySelector('.tsa-sidebar');
    el?.classList.remove('tsa-sidebar-open');
  }), [makeSwipeHandlers]);

  const getProgressKey = useCallback((examId) => `yeuhoc_progress_${user?.id}_${examId}`, [user?.id]);
  const getPracticeProgressKey = useCallback((examId) => `yeuhoc_practice_progress_${user?.id}_${examId}`, [user?.id]);
  const getRestoredQuizSecondsLeft = useCallback((data) => {
    const rawSeconds = Number(data?.secondsLeft);
    if (!Number.isFinite(rawSeconds)) return null;
    if (!isTsaExam(activeExam)) return rawSeconds;
    const section = getTsaSectionByIndex(data?.tsaSectionIndex || 0);
    return Math.min(rawSeconds, section.durationMinutes * 60);
  }, [activeExam]);

  const openAIChat = useCallback(() => {
    setAiChatMounted(true);
    setIsAIChatOpen(true);
  }, []);

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

  // Load the requested exam for this dedicated route.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      resumeHandledRef.current = false;
      practiceResumeHandledRef.current = false;
      setLoadingExam(true);
      setExamLoadError('');
      const ex = await getExamById(examId);
      if (cancelled) return;
      if (!ex) {
        setActiveExam(null);
        setExamLoadError('Không tìm thấy đề thi.');
      } else {
        setActiveExam(ex);
        setAnswers({});
        setCurrentQ(0);
        setTsaSectionIndex(0);
        setTsaElapsedSeconds(0);
        setBookmarks(new Set());
        setSavedSecondsLeft(null);
        setIsPaused(false);
        setQuizPhase('preview');
      }
      setLoadingExam(false);
    }
    if (examId) init();
    return () => { cancelled = true; };
  }, [examId]);

  // Auto-resume from profile
  useEffect(() => {
    if (!shouldResume || resumeHandledRef.current || !user || !activeExam || typeof window === 'undefined') return;
    resumeHandledRef.current = true;
    const resumeTimer = setTimeout(() => {
      const key = `yeuhoc_progress_${user.id}_${activeExam.id}`;
      const saved = localStorage.getItem(key);
      if (!saved) return;
      try {
        const data = JSON.parse(saved);
        setAnswers(data.answers || {});
        setBookmarks(new Set(data.bookmarks || []));
        setCurrentQ(data.currentQ || 0);
        setTsaSectionIndex(data.tsaSectionIndex || 0);
        setTsaElapsedSeconds(data.tsaElapsedSeconds || 0);
        setSavedSecondsLeft(getRestoredQuizSecondsLeft(data));
        setIsPaused(false);
        setViolationCount(data.violationCount || 0);
        setShowViolationWarning(false);
        isSubmittingRef.current = false;
        isAdvancingTsaSectionRef.current = false;
        exitViolationRecordedRef.current = false;
        setQuizPhase('quiz');
        setTimerRunning(true);
        setStartTime(() => Date.now());
        window.history.replaceState({}, '', window.location.pathname);

        // Try fullscreen if enabled
        if (activeExam.antiCheatEnabled !== false) {
          const el = document.documentElement;
          if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return () => clearTimeout(resumeTimer);
  }, [shouldResume, user, activeExam, getRestoredQuizSecondsLeft]);

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

  // Thông báo khi báo cáo câu hỏi được đánh dấu đã xử lý (cần Realtime trên bảng question_reports)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`question-reports-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'question_reports',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const next = payload.new;
          const prev = payload.old;
          if (next?.status === 'resolved' && prev?.status === 'pending') {
            setModal({
              isOpen: true,
              type: 'alert',
              title: 'Báo cáo đã được xử lý',
              message: `Báo cáo của bạn về câu hỏi trong "${next.exam_title || 'đề thi'}" đã được đội ngũ xem xét. Chi tiết xem tại Hồ sơ → Báo cáo câu hỏi.`,
              onConfirm: null,
              onCancel: null,
              extraBtn: null,
            });
            window.dispatchEvent(new Event('yeuhoc-reports-seen'));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Quiz flow ──
  const questions = activeExam?.questions || [];
  const realQuestions = questions.filter(q => q.type !== 'TEXT');
  const isTSA = isTsaExam(activeExam);
  const currentTsaSection = getTsaSectionByIndex(tsaSectionIndex);
  const isLastTsaSection = tsaSectionIndex >= TSA_SECTIONS.length - 1;
  const activeQuizDuration = isTSA ? currentTsaSection.durationMinutes : (activeExam?.duration || 90);
  const tsaSectionQuestionEntries = realQuestions
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => getTsaSectionIndex(i) === tsaSectionIndex);
  const tsaSectionQuestionIds = new Set(tsaSectionQuestionEntries.map(({ q }) => q.id));

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

  const quizGroupedQuestions = isTSA
    ? groupedQuestions
      .map(group => ({
        context: group.context,
        children: group.children.filter(q => tsaSectionQuestionIds.has(q.id)),
      }))
      .filter(group => group.children.length > 0)
    : groupedQuestions;

  const isTHPT = activeExam?.examType === 'THPT';
  const isAntiCheatEnabled = activeExam?.antiCheatEnabled !== false;
  realQuestions.forEach((q, i) => {
    q._globalIndex = i;
    q._isFirstMCQ = isTHPT && q.type === 'MCQ' && (i === 0 || realQuestions[i - 1].type !== 'MCQ');
    q._isFirstMA = isTHPT && q.type === 'MA' && (i === 0 || realQuestions[i - 1].type !== 'MA');
    q._isFirstTF = isTHPT && q.type === 'TF' && (i === 0 || realQuestions[i - 1].type !== 'TF');
    q._isFirstSA = isTHPT && q.type === 'SA' && (i === 0 || realQuestions[i - 1].type !== 'SA');
    q._isFirstDRAG = isTHPT && q.type === 'DRAG' && (i === 0 || realQuestions[i - 1].type !== 'DRAG');
  });

  // ── Practice mode (ôn luyện) ──
  const [practiceRevealed, setPracticeRevealed] = useState({});
  const [practiceSaving, setPracticeSaving] = useState(false);
  const practiceSaveTimerRef = useRef(null);

  const savePracticeProgress = async ({ notify = false, showSpinner = false, overrides = {} } = {}) => {
    if (!activeExam?.id || !user?.id) return false;

    const snapshot = createPracticeSnapshot({
      answers: overrides.answers ?? answers,
      bookmarks: overrides.bookmarks ?? bookmarks,
      currentQ: overrides.currentQ ?? currentQ,
      practiceRevealed: overrides.practiceRevealed ?? practiceRevealed,
      realQuestions,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem(getPracticeProgressKey(activeExam.id), JSON.stringify(snapshot));
    }

    if (showSpinner) setPracticeSaving(true);
    try {
      const { error } = await supabase
        .from('practice_progress')
        .upsert({
          user_id: user.id,
          exam_id: activeExam.id,
          current_question: snapshot.currentQ,
          answered_count: snapshot.answeredCount,
          revealed_count: snapshot.revealedCount,
          total_questions: snapshot.totalQuestions,
          answers: snapshot.answers,
          bookmarks: snapshot.bookmarks,
          revealed_map: snapshot.practiceRevealed,
          completed: snapshot.completed,
          saved_at: snapshot.savedAt,
          updated_at: snapshot.savedAt,
        }, { onConflict: 'user_id,exam_id' });

      if (error) {
        console.error('Error saving practice progress:', error);
        if (notify) showAlert('Lỗi lưu ôn luyện', 'Không lưu được tiến trình ôn luyện: ' + error.message);
        return false;
      }

      if (notify) showAlert('Đã lưu', 'Tiến trình ôn luyện đã được lưu.');
      return true;
    } finally {
      if (showSpinner) setPracticeSaving(false);
    }
  };

  const applyPracticeSnapshot = (snapshot) => {
    setAnswers(snapshot?.answers || {});
    setBookmarks(new Set(snapshot?.bookmarks || []));
    setCurrentQ(Math.min(Math.max(Number(snapshot?.currentQ) || 0, 0), Math.max(realQuestions.length - 1, 0)));
    setPracticeRevealed(snapshot?.practiceRevealed || {});
    setIsAIChatOpen(false);
    setQuizPhase('practice');
  };

  const startFreshPractice = () => {
    setAnswers({});
    setBookmarks(new Set());
    setCurrentQ(0);
    setPracticeRevealed({});
    setIsAIChatOpen(false);
    setQuizPhase('practice');
  };

  const loadPracticeProgress = async () => {
    if (!activeExam?.id || !user?.id || typeof window === 'undefined') return null;

    let localProgress = null;
    const localSaved = localStorage.getItem(getPracticeProgressKey(activeExam.id));
    if (localSaved) {
      try {
        localProgress = JSON.parse(localSaved);
      } catch {
        localProgress = null;
      }
    }

    try {
      const { data, error } = await supabase
        .from('practice_progress')
        .select('answers, bookmarks, current_question, revealed_map, saved_at, updated_at')
        .eq('user_id', user.id)
        .eq('exam_id', activeExam.id)
        .maybeSingle();

      if (error) {
        console.warn('Practice progress table is not available:', error.message);
        return localProgress;
      }

      if (!data) return localProgress;

      const remoteProgress = {
        answers: data.answers || {},
        bookmarks: data.bookmarks || [],
        currentQ: data.current_question || 0,
        practiceRevealed: data.revealed_map || {},
        savedAt: data.updated_at || data.saved_at,
      };

      if (!localProgress) return remoteProgress;
      return new Date(remoteProgress.savedAt || 0) > new Date(localProgress.savedAt || 0) ? remoteProgress : localProgress;
    } catch (error) {
      console.warn('Practice progress load failed:', error);
      return localProgress;
    }
  };

  useEffect(() => {
    if (!shouldResumePractice || practiceResumeHandledRef.current || !user || !activeExam || typeof window === 'undefined') return;
    practiceResumeHandledRef.current = true;
    const examId = activeExam.id;
    const userId = user.id;
    const questionCount = realQuestions.length;

    const resumeTimer = setTimeout(async () => {
      let localProgress = null;
      const localSaved = localStorage.getItem(getPracticeProgressKey(examId));
      if (localSaved) {
        try {
          localProgress = JSON.parse(localSaved);
        } catch {
          localProgress = null;
        }
      }

      let saved = localProgress;
      try {
        const { data, error } = await supabase
          .from('practice_progress')
          .select('answers, bookmarks, current_question, revealed_map, saved_at, updated_at')
          .eq('user_id', userId)
          .eq('exam_id', examId)
          .maybeSingle();

        if (error) {
          console.warn('Practice progress table is not available:', error.message);
        } else if (data) {
          const remoteProgress = {
            answers: data.answers || {},
            bookmarks: data.bookmarks || [],
            currentQ: data.current_question || 0,
            practiceRevealed: data.revealed_map || {},
            savedAt: data.updated_at || data.saved_at,
          };

          saved = !localProgress || new Date(remoteProgress.savedAt || 0) > new Date(localProgress.savedAt || 0)
            ? remoteProgress
            : localProgress;
        }
      } catch (error) {
        console.warn('Practice progress load failed:', error);
      }

      const hasSavedProgress = saved && (
        Object.keys(saved.answers || {}).length > 0 ||
        Object.keys(saved.practiceRevealed || {}).length > 0 ||
        (saved.currentQ || 0) > 0
      );

      if (!hasSavedProgress) return;
      setAnswers(saved?.answers || {});
      setBookmarks(new Set(saved?.bookmarks || []));
      setCurrentQ(Math.min(Math.max(Number(saved?.currentQ) || 0, 0), Math.max(questionCount - 1, 0)));
      setPracticeRevealed(saved?.practiceRevealed || {});
      setIsAIChatOpen(false);
      setQuizPhase('practice');
      window.history.replaceState({}, '', window.location.pathname);
    }, 0);

    return () => clearTimeout(resumeTimer);
  }, [activeExam, getPracticeProgressKey, realQuestions.length, shouldResumePractice, user]);

  const handleStartPractice = async () => {
    if (realQuestions.length === 0) {
      showAlert('Thông báo', 'Đề thi này chưa có câu hỏi.');
      return;
    }

    const saved = await loadPracticeProgress();
    const hasSavedProgress = saved && (
      Object.keys(saved.answers || {}).length > 0 ||
      Object.keys(saved.practiceRevealed || {}).length > 0 ||
      (saved.currentQ || 0) > 0
    );

    if (hasSavedProgress) {
      showConfirm(
        'Tiếp tục ôn luyện',
        'Bạn đang có tiến trình ôn luyện đã lưu. Bạn muốn làm tiếp hay làm lại toàn bộ đề?',
        () => applyPracticeSnapshot(saved),
        () => startFreshPractice(),
        'Làm tiếp',
        'Làm lại'
      );
      return;
    }

    startFreshPractice();
  };

  const handlePracticeReveal = () => {
    setPracticeRevealed(prev => ({ ...prev, [currentQ]: true }));
  };

  const handleSavePracticeProgress = () => {
    savePracticeProgress({ notify: true, showSpinner: true });
  };

  const handleRetryPractice = () => {
    showConfirm('Làm lại ôn luyện', 'Toàn bộ đáp án và tiến trình ôn luyện hiện tại sẽ bị xóa. Bạn có chắc chắn?', () => {
      const resetBookmarks = new Set();
      setAnswers({});
      setBookmarks(resetBookmarks);
      setCurrentQ(0);
      setPracticeRevealed({});
      setIsAIChatOpen(false);
      savePracticeProgress({
        overrides: {
          answers: {},
          bookmarks: resetBookmarks,
          currentQ: 0,
          practiceRevealed: {},
        },
      });
    });
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
    setTsaSectionIndex(0);
    setTsaElapsedSeconds(0);
    setSavedSecondsLeft(null);
    setIsPaused(false);
    setViolationCount(0);
    setShowViolationWarning(false);
    isSubmittingRef.current = false;
    isAdvancingTsaSectionRef.current = false;
    exitViolationRecordedRef.current = false;
    setQuizPhase(isTSA ? 'tsa-menu' : 'quiz');
    setTimerRunning(!isTSA);
    setStartTime(() => Date.now());
    if (isAntiCheatEnabled && !isTSA) requestFullscreen();
  };

  const handleBeginQuiz = () => {
    if (realQuestions.length === 0) {
      showAlert('Thông báo', 'Đề thi này chưa có câu hỏi.');
      return;
    }

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
            setTsaSectionIndex(data.tsaSectionIndex || 0);
            setTsaElapsedSeconds(data.tsaElapsedSeconds || 0);
            setSavedSecondsLeft(getRestoredQuizSecondsLeft(data));
            setIsPaused(false);
            setViolationCount(data.violationCount || 0);
            setShowViolationWarning(false);
            isSubmittingRef.current = false;
            isAdvancingTsaSectionRef.current = false;
            exitViolationRecordedRef.current = false;
            setQuizPhase(isTSA ? 'tsa-menu' : 'quiz');
            setTimerRunning(!isTSA);
            setStartTime(() => Date.now());
            if (isAntiCheatEnabled && !isTSA) requestFullscreen();
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

  const handleSubmit = useCallback(async ({ violationCountOverride = null } = {}) => {
    // Guard against double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const finalViolationCount = violationCountOverride ?? violationCount;

    setTimerRunning(false);
    setShowViolationWarning(false);
    setQuizPhase('results');
    exitFullscreen();

    if (user && activeExam) {
      // Clear auto-saved progress
      localStorage.removeItem(getProgressKey(activeExam.id));

      const realQs = activeExam.questions.filter(q => q.type !== 'TEXT');
      const result = calculateExamResult(realQs, answers, {
        scoringConfig: activeExam.scoringConfig,
        examType: activeExam.examType,
        subject: activeExam.subject,
      });
      const isTsaSubmit = isTsaExam(activeExam);
      const timeSpentSecs = isTsaSubmit
        ? Math.min(
          TSA_TOTAL_DURATION_MINUTES * 60,
          tsaElapsedSeconds + getTsaSectionElapsedSeconds(tsaSectionIndex, savedSecondsLeft)
        )
        : (savedSecondsLeft !== null ? (activeExam.duration * 60 - savedSecondsLeft) : (startTime ? Math.floor((Date.now() - startTime) / 1000) : 0));

      const { error } = await supabase.from('exam_attempts').insert({
        user_id: user.id,
        exam_id: activeExam.id,
        score: result.score,
        correct_answers: result.correct,
        total_questions: realQs.length,
        time_spent: timeSpentSecs,
        user_answers: answers,
        violation_count: finalViolationCount,
      });

      if (error) {
        console.error("Error saving exam attempt:", error);
        showAlert("Lỗi lưu kết quả", "Không lưu được kết quả bài thi: " + error.message + "\n(Hãy kiểm tra RLS Policy)");
      }
    }
  }, [activeExam, answers, exitFullscreen, getProgressKey, savedSecondsLeft, showAlert, startTime, tsaElapsedSeconds, tsaSectionIndex, user, violationCount]);

  const handleSubmitTsaSection = () => {
    if (!isTSA) return;
    if (isAdvancingTsaSectionRef.current) return;
    if (isLastTsaSection) {
      handleSubmit();
      return;
    }
    isAdvancingTsaSectionRef.current = true;

    const elapsedThisSection = getTsaSectionElapsedSeconds(tsaSectionIndex, savedSecondsLeft);
    const nextSectionIndex = tsaSectionIndex + 1;

    setTimerRunning(false);
    setTsaElapsedSeconds(prev => prev + elapsedThisSection);
    setTsaSectionIndex(nextSectionIndex);
    setSavedSecondsLeft(null);
    setIsPaused(false);
    setShowViolationWarning(false);
    
    // Return to TSA Dashboard Menu
    setQuizPhase('tsa-menu');
    isAdvancingTsaSectionRef.current = false;
    if (isAntiCheatEnabled) exitFullscreen();
  };


  // ── Anti-cheat: detect fullscreen exit (desktop) & tab switch (all devices) ──
  useEffect(() => {
    if (quizPhase !== 'quiz' || !isAntiCheatEnabled) return;

    const addViolation = () => {
      setViolationCount(prev => {
        const next = prev + 1;
        if (next >= MAX_VIOLATIONS) {
          showAlert('⛔ Tự động nộp bài', `Bạn đã vi phạm ${MAX_VIOLATIONS} lần. Hệ thống tự động nộp bài của bạn.`);
          setTimeout(() => handleSubmit({ violationCountOverride: next }), 100);
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
  }, [quizPhase, canFullscreen, isAntiCheatEnabled, handleSubmit, showAlert]);

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
    if (exitViolationRecordedRef.current) return;
    if (quizPhase === 'quiz' && activeExam && user && !isPaused && savedSecondsLeft !== null) {
      const data = createQuizProgressSnapshot({
        answers,
        bookmarks,
        secondsLeft: savedSecondsLeft,
        currentQ,
        violationCount,
        tsaSectionIndex,
        tsaElapsedSeconds,
      });
      localStorage.setItem(getProgressKey(activeExam.id), JSON.stringify(data));
    }
  }, [answers, bookmarks, savedSecondsLeft, currentQ, violationCount, tsaSectionIndex, tsaElapsedSeconds, quizPhase, activeExam, user, isPaused, getProgressKey]);

  useEffect(() => {
    if (quizPhase !== 'quiz' || !activeExam?.id || !user?.id || !isAntiCheatEnabled) return;

    const recordExitViolation = () => {
      if (isSubmittingRef.current || exitViolationRecordedRef.current) return;
      exitViolationRecordedRef.current = true;
      const nextViolationCount = Math.min(violationCount + 1, MAX_VIOLATIONS);
      const data = createQuizProgressSnapshot({
        answers,
        bookmarks,
        secondsLeft: savedSecondsLeft ?? (activeQuizDuration * 60),
        currentQ,
        violationCount: nextViolationCount,
        tsaSectionIndex,
        tsaElapsedSeconds,
      });
      localStorage.setItem(getProgressKey(activeExam.id), JSON.stringify(data));
    };

    window.addEventListener('pagehide', recordExitViolation);
    window.addEventListener('beforeunload', recordExitViolation);

    return () => {
      window.removeEventListener('pagehide', recordExitViolation);
      window.removeEventListener('beforeunload', recordExitViolation);
    };
  }, [activeExam, activeQuizDuration, answers, bookmarks, currentQ, getProgressKey, isAntiCheatEnabled, quizPhase, savedSecondsLeft, tsaSectionIndex, tsaElapsedSeconds, user, violationCount]);

  useEffect(() => {
    if (quizPhase !== 'practice' || !activeExam?.id || !user?.id) return;

    if (practiceSaveTimerRef.current) clearTimeout(practiceSaveTimerRef.current);
    practiceSaveTimerRef.current = setTimeout(() => {
      const practiceQuestions = (activeExam.questions || []).filter(question => question.type !== 'TEXT');
      const snapshot = createPracticeSnapshot({
        answers,
        bookmarks,
        currentQ,
        practiceRevealed,
        realQuestions: practiceQuestions,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(getPracticeProgressKey(activeExam.id), JSON.stringify(snapshot));
      }

      supabase
        .from('practice_progress')
        .upsert({
          user_id: user.id,
          exam_id: activeExam.id,
          current_question: snapshot.currentQ,
          answered_count: snapshot.answeredCount,
          revealed_count: snapshot.revealedCount,
          total_questions: snapshot.totalQuestions,
          answers: snapshot.answers,
          bookmarks: snapshot.bookmarks,
          revealed_map: snapshot.practiceRevealed,
          completed: snapshot.completed,
          saved_at: snapshot.savedAt,
          updated_at: snapshot.savedAt,
        }, { onConflict: 'user_id,exam_id' })
        .then(({ error }) => {
          if (error) console.warn('Practice progress autosave failed:', error.message);
        });
    }, 900);

    return () => {
      if (practiceSaveTimerRef.current) clearTimeout(practiceSaveTimerRef.current);
    };
  }, [activeExam, answers, bookmarks, currentQ, getPracticeProgressKey, practiceRevealed, quizPhase, user]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleTimeUp = () => {
    if (isTSA && !isLastTsaSection) {
      handleSubmitTsaSection();
      return;
    }
    handleSubmit();
  };
  const handleReset = () => {
    if (quizPhase === 'practice') {
      savePracticeProgress();
    }
    // Suppress anti-cheat listener before exiting fullscreen
    isSubmittingRef.current = true;
    exitFullscreen();
    setAnswers({});
    setTimerRunning(false);
    setCurrentQ(0);
    setTsaSectionIndex(0);
    setTsaElapsedSeconds(0);
    setIsAIChatOpen(false);
    setStartTime(null);
    setIsPaused(false);
    setViolationCount(0);
    setShowViolationWarning(false);
    // Reset ref after fullscreenchange event has fired
    setTimeout(() => { isSubmittingRef.current = false; }, 300);
    router.push('/');
  };
  const handleExitQuiz = () => {
    if (!isAntiCheatEnabled || !activeExam || !user) {
      handleReset();
      return;
    }

    const nextViolationCount = Math.min(violationCount + 1, MAX_VIOLATIONS);
    exitViolationRecordedRef.current = true;
    setViolationCount(nextViolationCount);
    localStorage.setItem(getProgressKey(activeExam.id), JSON.stringify(createQuizProgressSnapshot({
      answers,
      bookmarks,
      secondsLeft: savedSecondsLeft ?? (activeQuizDuration * 60),
      currentQ,
      violationCount: nextViolationCount,
      tsaSectionIndex,
      tsaElapsedSeconds,
    })));

    if (nextViolationCount >= MAX_VIOLATIONS) {
      showAlert('⛔ Tự động nộp bài', `Thoát khỏi bài thi được tính là phạm quy. Bạn đã vi phạm ${MAX_VIOLATIONS} lần nên hệ thống tự động nộp bài.`);
      setTimeout(() => handleSubmit({ violationCountOverride: nextViolationCount }), 100);
      return;
    }

    handleReset();
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

  const renderNavButtons = (renderBtn, { tsaCurrentOnly = false } = {}) => {
    if (isTSA) {
      const sections = tsaCurrentOnly ? [currentTsaSection] : TSA_SECTIONS;
      return (
        <div className="flex flex-col gap-4">
          {sections.map((section, sectionIdx) => {
            const entries = realQuestions
              .map((q, i) => ({ q, i }))
              .filter(({ i }) => getTsaSectionIndex(i) === (tsaCurrentOnly ? tsaSectionIndex : sectionIdx));
            if (entries.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">{section.name}</div>
                <div className="et-nav-grid">{entries.map(({ q, i }) => renderBtn(q, i))}</div>
              </div>
            );
          })}
        </div>
      );
    }

    const isTHPT = activeExam?.examType === 'THPT';
    if (!isTHPT) {
      return (
        <div className="et-nav-grid">
          {realQuestions.map((q, i) => renderBtn(q, i))}
        </div>
      );
    }

    let p1 = [], p2 = [], p3 = [], p4 = [], p5 = [];
    realQuestions.forEach((q, i) => {
      if (q.type === 'MCQ') p1.push({ q, i });
      else if (q.type === 'MA') p2.push({ q, i });
      else if (q.type === 'TF') p3.push({ q, i });
      else if (q.type === 'SA') p4.push({ q, i });
      else if (q.type === 'DRAG') p5.push({ q, i });
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
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Chọn nhiều đáp án</div>
            <div className="et-nav-grid">{p2.map(({ q, i }) => renderBtn(q, i))}</div>
          </div>
        )}
        {p3.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần II</div>
            <div className="et-nav-grid">{p3.map(({ q, i }) => renderBtn(q, i))}</div>
          </div>
        )}
        {p4.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần III</div>
            <div className="et-nav-grid">{p4.map(({ q, i }) => renderBtn(q, i))}</div>
          </div>
        )}
        {p5.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Kéo thả</div>
            <div className="et-nav-grid">{p5.map(({ q, i }) => renderBtn(q, i))}</div>
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
    const q = realQuestions[currentQ];
    const isRevealed = practiceRevealed[currentQ] || false;
    const ua = answers[q?.id];
    const hasAnswered = ua !== undefined && ua !== '' && (typeof ua !== 'object' || Object.keys(ua).length > 0);

    // Check correctness for dot colors
    const checkCorrect = (qItem, idx) => {
      const rev = practiceRevealed[idx];
      if (!rev || !qItem) return null; // null = not revealed yet
      const a = answers[qItem.id] ?? getEmptyAnswerForType(qItem.type);
      return getQuestionResultState(qItem, a) === 'correct';
    };

    let isCorrect = checkCorrect(q, currentQ);

    // Find context (TEXT parent) for current question
    const contextQ = q?.linkedTo ? questions.find(x => x.id === q.linkedTo && x.type === 'TEXT') : null;
    const groupQuestions = contextQ ? realQuestions.filter(x => x.linkedTo === contextQ.id) : [q];
    const firstIndex = realQuestions.findIndex(x => x.id === groupQuestions[0]?.id);
    const lastIndex = realQuestions.findIndex(x => x.id === groupQuestions[groupQuestions.length - 1]?.id);
    const aiQuestionData = q ? {
      exam: {
        id: activeExam.id,
        title: activeExam.title,
        subject: activeExam.subject,
        examType: activeExam.examType,
      },
      context: contextQ ? {
        id: contextQ.id,
        content: contextQ.content,
        image: contextQ.image || null,
      } : null,
      question: {
        id: q.id,
        type: q.type,
        content: q.content,
        options: q.options || [],
        statements: q.statements || [],
        answer: q.answer,
        solution: q.solution,
        image: q.image || null,
      },
    } : null;

    return (
      <div className="fixed inset-0 z-50 theme-page flex flex-col" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-bold">
            📖 Chế độ ôn luyện
          </div>
          <button
            className="et-btn-outline"
            style={{ fontSize: 12, padding: '5px 11px' }}
            onClick={handleSavePracticeProgress}
            disabled={practiceSaving}
            title="Lưu tiến trình ôn luyện"
          >
            <FloppyDisk weight="duotone" style={{ width: 13, height: 13 }} /> <span className="hidden sm:inline">{practiceSaving ? 'Đang lưu...' : 'Lưu'}</span>
          </button>
          <button
            className="et-btn-outline"
            style={{ fontSize: 12, padding: '5px 11px' }}
            onClick={handleRetryPractice}
            title="Làm lại toàn bộ đề"
          >
            <ArrowCounterClockwise weight="bold" style={{ width: 13, height: 13 }} /> <span className="hidden sm:inline">Làm lại</span>
          </button>
        </Topbar>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8" id="practice-scroll-container">
          <div className={`mx-auto transition-all duration-300 ${contextQ ? 'max-w-6xl' : 'max-w-2xl'}`}>
            {/* Progress dots */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-600">Câu {currentQ + 1}/{realQuestions.length}</span>
                <span className="text-xs font-semibold text-gray-400">{Object.keys(practiceRevealed).length} đã xem</span>
              </div>
              <div className="flex flex-wrap gap-[5px]">
                {realQuestions.map((qItem, i) => {
                  const done = practiceRevealed[i];
                  const isCurrent = i === currentQ;
                  const isMarked = bookmarks.has(qItem.id);
                  const correctness = checkCorrect(qItem, i);
                  let bg = '#e2e8f0'; // gray - chưa làm
                  if (isCurrent) bg = '#6366f1'; // indigo - đang xem
                  else if (isMarked) bg = '#f59e0b'; // yellow - đánh dấu
                  else if (done && correctness === true) bg = '#10b981'; // green - đúng
                  else if (done && correctness === false) bg = '#ef4444'; // red - sai
                  else if (done) bg = '#10b981'; // green fallback
                  return (
                    <span key={i} className="inline-flex items-center gap-[5px]">
                      {isTSA && (i === 40 || i === 60) && (
                        <span className="px-1 text-xs font-black text-violet-400">|</span>
                      )}
                      <button onClick={() => { setIsAIChatOpen(false); setCurrentQ(i); }} style={{
                        width: isCurrent ? 22 : 9, height: 9, borderRadius: 20, border: 'none', cursor: 'pointer',
                        background: bg, transition: 'all .2s', flexShrink: 0,
                      }} title={`Câu ${i + 1}${isMarked ? ' (đánh dấu)' : done ? (correctness ? ' (đúng)' : ' (sai)') : ''}`} />
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Context block and Questions Layout */}
            {contextQ ? (
              <div className="flex flex-col lg:flex-row gap-6 mt-4 items-start">
                {/* Left side: Context */}
                <div className="lg:w-1/2 w-full lg:sticky lg:top-4">
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase">ℹ️ Dựa vào thông tin sau để trả lời các câu hỏi bên phải</span>
                    </div>
                    <div className="text-sm leading-relaxed text-gray-700">
                      <MathRenderer text={contextQ.content} />
                    </div>
                    {isValidImageSrc(contextQ.image) && (
                      <div className="mt-3">
                        <Image
                          src={contextQ.image}
                          alt=""
                          width={900}
                          height={500}
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="rounded-xl max-h-[300px] w-auto max-w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Questions */}
                <div className="lg:w-1/2 w-full flex flex-col gap-6">
                  {groupQuestions.map((gq) => {
                    const rqIndex = realQuestions.findIndex(x => x.id === gq.id);
                    const isRev = practiceRevealed[rqIndex] || false;
                    const ua = answers[gq.id];
                    const hasAns = ua !== undefined && ua !== '' && (typeof ua !== 'object' || Object.keys(ua).length > 0);

                    return (
                      <div key={gq.id} className={`practice-card-wrap bg-white rounded-3xl shadow-sm border ${rqIndex === currentQ ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-gray-100'}`} style={{ fontSize: '1.1em' }} id={`practice-q-${rqIndex}`}>
                        <QuestionCard
                          question={gq}
                          index={rqIndex}
                          selectedAnswer={answers[gq.id] ?? getEmptyAnswerForType(gq.type)}
                          onAnswerChange={(val) => !isRev && handleAnswerChange(gq.id, val)}
                          showResult={isRev}
                          disabled={isRev}
                          isBookmarked={bookmarks.has(gq.id)}
                          onToggleBookmark={() => {
                            const next = new Set(bookmarks);
                            if (next.has(gq.id)) next.delete(gq.id);
                            else next.add(gq.id);
                            setBookmarks(next);
                          }}
                          onReport={handleOpenReport}
                        />
                        <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3 border-t border-gray-50 mt-4">
                          <button
                            onClick={() => {
                              if (isRev) return;
                              setCurrentQ(rqIndex);
                              openAIChat();
                            }}
                            disabled={isRev}
                            className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all"
                            style={getPracticeButtonStyle('hint', isRev)}
                            type="button"
                          >
                            <Robot weight="duotone" className="w-4 h-4" /> Xem gợi ý
                          </button>
                          {!isRev && (
                            <button
                              onClick={() => {
                                setPracticeRevealed(prev => ({ ...prev, [rqIndex]: true }));
                                setIsAIChatOpen(false);
                                setCurrentQ(rqIndex); // Cập nhật currentQ để dot sáng lên
                              }}
                              disabled={!hasAns}
                              className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all"
                              style={getPracticeButtonStyle('answer', !hasAns)}
                            >
                              <Eye className="w-4 h-4" /> Xem đáp án
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              q && (
                <div className="practice-card-wrap mt-4" style={{ fontSize: '1.1em' }}>
                  <QuestionCard
                    question={q}
                    index={currentQ}
                    selectedAnswer={answers[q.id] ?? getEmptyAnswerForType(q.type)}
                    onAnswerChange={(val) => !isRevealed && handleAnswerChange(q.id, val)}
                    showResult={isRevealed}
                    disabled={isRevealed}
                    isBookmarked={bookmarks.has(q.id)}
                    onToggleBookmark={() => {
                      const next = new Set(bookmarks);
                      if (next.has(q.id)) next.delete(q.id);
                      else next.add(q.id);
                      setBookmarks(next);
                    }}
                    onReport={handleOpenReport}
                  />
                </div>
              )
            )}

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-2 sm:gap-4">
              <button
                onClick={() => {
                  const target = Math.max(0, firstIndex - 1);
                  setIsAIChatOpen(false);
                  setCurrentQ(target);
                  document.getElementById('practice-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={firstIndex === 0}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all"
                style={getPracticeButtonStyle('nav', firstIndex === 0)}
              >
                <CaretLeft weight="bold" className="w-4 h-4" /> <span className="hidden sm:inline">Câu trước</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    if (isRevealed) return;
                    openAIChat();
                  }}
                  disabled={isRevealed}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
                  style={getPracticeButtonStyle('hint', isRevealed)}
                  type="button"
                >
                  <Robot weight="duotone" className="w-4 h-4" /> Xem gợi ý
                </button>
                {!contextQ && !isRevealed && (
                  <button
                    onClick={handlePracticeReveal}
                    disabled={!hasAnswered}
                    className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
                    style={getPracticeButtonStyle('answer', !hasAnswered)}
                  >
                    <Eye className="w-4 h-4" /> Xem đáp án
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  const target = Math.min(realQuestions.length - 1, lastIndex + 1);
                  setIsAIChatOpen(false);
                  setCurrentQ(target);
                  document.getElementById('practice-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={lastIndex === realQuestions.length - 1}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all"
                style={getPracticeButtonStyle('nav', lastIndex === realQuestions.length - 1)}
              >
                <span className="hidden sm:inline">Câu tiếp</span> <CaretRight weight="bold" className="w-4 h-4" />
              </button>
            </div>

            {bookmarks.size > 0 && (
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-fadeIn">
                <div className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                  🚩 Câu đã đánh dấu ({bookmarks.size})
                </div>
                <div className="flex flex-wrap gap-2">
                  {realQuestions.map((qItem, i) => bookmarks.has(qItem.id) && (
                    <button key={i} onClick={() => { setIsAIChatOpen(false); setCurrentQ(i); }}
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

            {Object.keys(practiceRevealed).length === realQuestions.length && (
              <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-200 text-center shadow-sm animate-fadeIn">
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Hoàn thành ôn luyện!</h3>
                <p className="text-sm text-gray-500 mb-4">Bạn đã xem hết {realQuestions.length} câu hỏi.</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <button onClick={handleRetryPractice} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-2">
                    <ArrowCounterClockwise weight="bold" className="w-4 h-4" /> Ôn lại từ đầu
                  </button>
                  <button onClick={handleReset} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Chọn đề khác
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {aiChatMounted && (
          <PracticeAIChatbox
            isOpen={isAIChatOpen}
            onClose={() => setIsAIChatOpen(false)}
            questionKey={q ? `${activeExam.id}-${q.id}` : ''}
            questionData={aiQuestionData}
            questionNumber={currentQ + 1}
          />
        )}
        {reportModal.isOpen && <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} reportReasons={REPORT_REASONS} />}
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── PREVIEW ──
  if (quizPhase === 'preview' && activeExam) {
    const getRankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';

    return (
      <div className="fixed inset-0 z-50 theme-page flex flex-col" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset} />
        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6">
          <div className="ep-wrap">
            <div className="ep-grid">

              {/* ── LEFT PANEL (sticky) ── */}
              <div className="ep-left">

                {/* Hero Banner */}
                <div className="ep-hero">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                    <span className="ep-hero-badge">📚 {activeExam.subject}</span>
                    {activeExam.examType && (
                      <span className="ep-hero-badge">{activeExam.examType} · {activeExam.year}</span>
                    )}
                  </div>
                  <h1>{activeExam.title}</h1>
                  <div className="ep-hero-meta">
                    <span><Clock weight="bold" size={15} /> {activeExam.duration} phút</span>
                    <span>📝 {realQuestions.length} câu</span>
                    {examStats && <span><Users weight="bold" size={15} /> {examStats.totalParticipants} lượt thi</span>}
                  </div>
                </div>

                {/* Mode Buttons */}
                <button className="ep-mode-btn is-exam" onClick={handleBeginQuiz}>
                  <div className="ep-mode-icon is-exam">
                    {isAntiCheatEnabled ? <Lock weight="duotone" size={22} /> : <Exam weight="duotone" size={22} />}
                  </div>
                  <div className="ep-mode-body">
                    <div className="ep-mode-title">Làm bài thi</div>
                    <div className="ep-mode-desc">
                      {isAntiCheatEnabled
                        ? 'Toàn màn hình · Chống gian lận · Tính giờ'
                        : 'Tính thời gian · Lưu kết quả'}
                    </div>
                  </div>
                  <CaretRight weight="bold" size={18} className="ep-mode-arrow" />
                </button>

                <button className="ep-mode-btn is-practice" onClick={handleStartPractice}>
                  <div className="ep-mode-icon is-practice">
                    <BookOpen weight="duotone" size={22} />
                  </div>
                  <div className="ep-mode-body">
                    <div className="ep-mode-title">Ôn luyện</div>
                    <div className="ep-mode-desc">Xem đáp án ngay · Không giới hạn thời gian · AI hỗ trợ</div>
                  </div>
                  <CaretRight weight="bold" size={18} className="ep-mode-arrow" />
                </button>

                {/* Exam Rules */}
                <div className="ep-rules">
                  <div className="ep-rules-title">Lưu ý khi làm bài</div>
                  <ul>
                    <li>Thời gian làm bài: {activeExam.duration} phút</li>
                    <li>Tổng số câu hỏi: {realQuestions.length} câu</li>
                    {isAntiCheatEnabled && <li>Bài thi yêu cầu toàn màn hình, thoát sẽ bị tính vi phạm</li>}
                    {isAntiCheatEnabled && <li>Vi phạm {MAX_VIOLATIONS} lần sẽ tự động nộp bài</li>}
                    <li>Kết quả sẽ được lưu lại và xếp hạng</li>
                    <li>Có thể tạm dừng và tiếp tục làm bài sau</li>
                  </ul>
                </div>
              </div>

              {/* ── RIGHT PANEL (scrollable) ── */}
              <div className="ep-right">

                {/* Stats Section */}
                {loadingPreviewStats ? (
                  <div className="ep-loading">
                    <div className="ep-spinner" />
                    <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: 'var(--app-muted)' }}>Đang tải dữ liệu...</p>
                  </div>
                ) : examStats ? (
                  <>
                    <div>
                      <div className="ep-stats-header">
                        <ChartBar weight="duotone" size={18} style={{ color: '#6366f1' }} />
                        <h3>Thống kê</h3>
                      </div>
                      <div className="ep-stat-grid">
                        <div className="ep-stat-tile">
                          <div className="ep-stat-icon indigo"><Users weight="duotone" size={18} /></div>
                          <div className="ep-stat-body">
                            <div className="ep-stat-label">Thí sinh</div>
                            <div className="ep-stat-value">{examStats.totalParticipants}</div>
                          </div>
                        </div>
                        <div className="ep-stat-tile">
                          <div className="ep-stat-icon violet"><ChartBar weight="duotone" size={18} /></div>
                          <div className="ep-stat-body">
                            <div className="ep-stat-label">Điểm trung bình</div>
                            <div className="ep-stat-value">{examStats.avgScore}</div>
                          </div>
                        </div>
                        <div className="ep-stat-tile">
                          <div className="ep-stat-icon blue"><Medal weight="duotone" size={18} /></div>
                          <div className="ep-stat-body">
                            <div className="ep-stat-label">Điểm trung vị</div>
                            <div className="ep-stat-value">{examStats.medianScore}</div>
                          </div>
                        </div>
                        <div className="ep-stat-tile">
                          <div className="ep-stat-icon sky"><Clock weight="duotone" size={18} /></div>
                          <div className="ep-stat-body">
                            <div className="ep-stat-label">Thời gian TB</div>
                            <div className="ep-stat-value">
                              {Math.floor(examStats.avgTime / 60)}<span className="ep-stat-unit">p</span>{' '}
                              {examStats.avgTime % 60}<span className="ep-stat-unit">s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Leaderboard */}
                    {examLeaderboard.length > 0 && (
                      <div>
                        <div className="ep-lb-header">
                          <Medal weight="duotone" size={18} style={{ color: '#d97706' }} />
                          <h3>Bảng xếp hạng</h3>
                        </div>
                        <div className="ep-lb-list">
                          {examLeaderboard.map((attempt, index) => (
                            <div key={attempt.id} className="ep-lb-item">
                              <div className={`ep-rank ${getRankClass(index)}`}>{index + 1}</div>
                              {attempt.profiles?.avatar_url ? (
                                <Image
                                  src={attempt.profiles.avatar_url}
                                  alt="Avatar"
                                  width={36}
                                  height={36}
                                  sizes="36px"
                                  className="ep-lb-avatar"
                                  unoptimized
                                />
                              ) : (
                                <div className="ep-lb-avatar-fallback">
                                  {(attempt.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="ep-lb-info">
                                <div className="ep-lb-name">{attempt.profiles?.full_name || 'Học sinh ẩn danh'}</div>
                                <div className="ep-lb-date">{new Date(attempt.created_at).toLocaleDateString('vi-VN')}</div>
                              </div>
                              <div className="ep-lb-score">
                                <div className="ep-lb-score-val">{attempt.score.toFixed(2)}</div>
                                <div className="ep-lb-score-time">{Math.floor(attempt.time_spent / 60)}p {attempt.time_spent % 60}s</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ep-empty">
                    <div className="ep-empty-icon">📊</div>
                    <div className="ep-empty-text">Chưa có dữ liệu thống kê. Hãy là người đầu tiên làm bài!</div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── QUIZ (2-column layout) ──
  // ── TSA MENU (Danh sách bài thi) ──
  if (quizPhase === 'tsa-menu' && activeExam && isTSA) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fdfdfd', fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        {/* Simple Top Header */}
        <div style={{ height: 60, borderBottom: '1px solid #fee2e2', display: 'flex', alignItems: 'center', padding: '0 24px', background: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#dc2626', letterSpacing: -0.5 }}>TSA<span style={{ fontWeight: 400, color: '#f87171' }}>'</span></div>
        </div>

        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black mb-2 text-gray-900 text-center">{activeExam.title}</h1>
            <div className="flex justify-center gap-2 mb-8">
              <span className="px-3 py-1 rounded-md bg-green-50 text-green-600 border border-green-200 text-xs font-semibold">Miễn phí</span>
              <span className="px-3 py-1 rounded-md bg-green-50 text-green-600 border border-green-200 text-xs font-semibold">Tự do</span>
            </div>

            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 mb-8 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Họ và tên:</span>
                <span className="font-semibold text-gray-900">{user?.user_metadata?.full_name || 'Học sinh ẩn danh'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mã định danh:</span>
                <span className="font-semibold text-gray-900">{user?.id?.split('-')[0]?.toUpperCase() || 'UNKNOWN'}</span>
              </div>
              <div className="flex justify-between text-sm items-center mt-1 pt-2 border-t border-gray-100">
                <span className="text-gray-500">Trạng thái tài khoản</span>
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 text-xs font-semibold">Miễn phí</span>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4 text-gray-900">Danh sách bài thi</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
              {TSA_SECTIONS.map((section, idx) => {
                const isPast = idx < tsaSectionIndex;
                const isCurrent = idx === tsaSectionIndex;
                const isFuture = idx > tsaSectionIndex;
                
                let statusText = 'Chưa thi';
                let statusColor = 'text-[#43A047] font-semibold'; // Green for Chưa thi
                if (isPast) {
                  statusText = 'Đã thi';
                  statusColor = 'text-gray-400 font-semibold';
                } else if (isCurrent && savedSecondsLeft !== null) {
                  statusText = 'Đang thi';
                  statusColor = 'text-amber-500 font-semibold';
                }

                return (
                  <div key={idx} className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${idx < TSA_SECTIONS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div>
                      <div className="text-[17px] font-bold text-[#D32F2F] mb-1.5">{idx + 1}. {section.name}</div>
                      <div className="text-[13px] text-gray-800 flex flex-col gap-1">
                        <div><span className="font-semibold">Giờ mở kíp:</span> 00:00 01/01/2026 – 23:59 31/12/2026</div>
                        <div>
                           <span className="font-semibold">Thời gian:</span> {section.durationMinutes} phút
                           <span className="mx-2 text-gray-300">|</span>
                           <span className="font-semibold">Trạng thái: </span> <span className={statusColor}>{statusText}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                       {isPast ? (
                         <button disabled className="w-full sm:w-auto px-8 py-2.5 rounded-lg bg-gray-100 text-gray-400 font-bold text-sm border border-gray-200 cursor-not-allowed">Đã thi</button>
                       ) : isFuture ? (
                         <button disabled className="w-full sm:w-auto px-8 py-2.5 rounded-lg bg-white text-[#1976D2] font-bold text-sm border border-[#1976D2] opacity-50 cursor-not-allowed">Tiếp tục</button>
                       ) : (
                         <button onClick={() => {
                            setCurrentQ(Math.min(section.startIndex, Math.max(realQuestions.length - 1, 0)));
                            setQuizPhase('quiz');
                            setTimerRunning(true);
                            if (isAntiCheatEnabled) requestFullscreen();
                         }} className="w-full sm:w-auto px-8 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-colors">
                           {savedSecondsLeft !== null ? 'Tiếp tục' : 'Bắt đầu'}
                         </button>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 flex justify-between items-center pb-12">
               <button onClick={handleReset} className="flex items-center gap-2 text-[#D32F2F] font-semibold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                  <CaretLeft weight="bold" /> Quay lại
               </button>
               {tsaSectionIndex >= TSA_SECTIONS.length ? (
                 <button onClick={() => handleSubmit()} className="flex items-center gap-2 text-[#D32F2F] font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                    Hoàn thành kíp thi <CaretRight weight="bold" />
                 </button>
               ) : (
                 <button disabled className="flex items-center gap-2 text-gray-300 font-bold px-4 py-2 rounded-lg cursor-not-allowed">
                    Hoàn thành kíp thi <CaretRight weight="bold" />
                 </button>
               )}
            </div>
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── QUIZ (TSA UI Layout) ──
  if (quizPhase === 'quiz' && activeExam && isTSA) {
    const quizQuestionEntries = tsaSectionQuestionEntries;
    const quizAnsweredCount = quizQuestionEntries.filter(({ q }) => hasPracticeAnswer(answers[q.id])).length;
    const bookmarkedCount = quizQuestionEntries.filter(({ q }) => bookmarks.has(q.id)).length;
    const unansweredCount = quizQuestionEntries.length - quizAnsweredCount;
    const quizSecondsLeft = savedSecondsLeft ?? (activeQuizDuration * 60);

    const confirmSubmit = () => {
      const msg = unansweredCount > 0
        ? `⚠️ CẢNH BÁO: Bạn còn ${unansweredCount} câu chưa làm!\n\nBạn đã trả lời ${quizAnsweredCount}/${quizQuestionEntries.length} câu. Bạn có chắc chắn muốn nộp phần này?`
        : `Bạn đã trả lời ${quizAnsweredCount}/${quizQuestionEntries.length} câu. Bạn có chắc chắn muốn nộp phần này?`;
      showConfirm('Xác nhận nộp bài', msg, () => handleSubmitTsaSection());
    };

    const currentQuestionObj = realQuestions[currentQ];
    const pct = quizQuestionEntries.length > 0 ? Math.round((quizAnsweredCount / quizQuestionEntries.length) * 100) : 0;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white select-none tsa-exam-root" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        {/* Header Bar */}
        <div className="tsa-header h-16 border-b border-gray-200 flex items-center px-4 sm:px-6 shrink-0 justify-between bg-white z-10 relative shadow-sm">
           <div className="flex items-center gap-2 sm:gap-4 min-w-0">
             <div className="shrink-0" style={{ fontWeight: 900, fontSize: 20, color: '#D32F2F', letterSpacing: -1 }}>TSA<span style={{ color: '#D32F2F' }}>&apos;</span></div>
             <div className="font-bold text-gray-800 text-[13px] sm:text-[15px] border-l-2 border-gray-200 pl-2 sm:pl-4 truncate">{currentTsaSection.name}</div>
           </div>
           <div className="flex items-center gap-2 sm:gap-4 shrink-0">
             {/* Mobile timer */}
             <div className="tsa-mobile-timer font-mono font-black text-[20px] tracking-tight" style={{ '--tsa-timer-color': '#E53935' }}>
               <Timer key={`tsa-m-${tsaSectionIndex}`} compact initialMinutes={activeQuizDuration} initialSeconds={savedSecondsLeft} onTick={() => {}} onTimeUp={() => {}} isRunning={timerRunning} />
             </div>
             {/* Mobile sidebar toggle */}
             <button onClick={() => { const el = document.querySelector('.tsa-sidebar'); el?.classList.toggle('tsa-sidebar-open'); }} className="tsa-sidebar-toggle w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
             </button>
           </div>
        </div>

        {/* Main Layout */}
        <div className="tsa-body flex flex-1 overflow-hidden relative">
          
          {/* Violation Warning Overlay (Keep functionality from old design) */}
          {showViolationWarning && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 200,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              background: 'rgba(220, 38, 38, 0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#dc2626', textAlign: 'center' }}>Cảnh báo vi phạm!</h2>
              <p style={{ color: '#991b1b', marginBottom: 8, fontSize: 15, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
                Bạn đã thoát khỏi chế độ toàn màn hình hoặc chuyển tab. Đây là hành vi không được phép trong khi thi.
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
              }}>
                🔒 {canFullscreen ? 'Quay lại làm bài (Toàn màn hình)' : 'Quay lại làm bài'}
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 flex flex-col relative bg-white">
             <div ref={mainRef} className="flex-1 overflow-y-auto p-8 pb-24 text-black">
                <div className="max-w-6xl mx-auto">
                   {(() => {
                     const contextQ = currentQuestionObj?.linkedTo ? questions.find(x => x.id === currentQuestionObj.linkedTo && x.type === 'TEXT') : null;
                     // Get ALL sibling questions sharing the same context
                     const groupQuestions = contextQ ? realQuestions.filter(x => x.linkedTo === contextQ.id) : null;

                     // Helper to render one question's answer input
                     const renderAnswerInput = (qObj, qIndex) => {
                       const tfSel = (qObj.type === 'TF' && typeof answers[qObj.id] === 'object') ? answers[qObj.id] : {};
                       const maSel = qObj.type === 'MA' ? (Array.isArray(answers[qObj.id]) ? answers[qObj.id] : []) : [];

                       return (
                         <div key={qObj.id} className="mb-8 last:mb-0">
                           {/* Question header */}
                           <div className="flex items-start gap-4 mb-4">
                             <div className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center font-bold text-gray-700 shrink-0 text-sm border border-gray-200">
                               {qIndex - currentTsaSection.startIndex + 1}
                             </div>
                             <div className="flex-1 text-[16px] text-gray-900 leading-[1.7]">
                               <MathRenderer text={qObj.content} />
                               {isValidImageSrc(qObj.image) && (
                                 <div className="mt-3 border border-gray-100 rounded-xl p-2 inline-block">
                                   <img src={qObj.image} alt="" className="max-w-full max-h-[350px] object-contain rounded-lg" />
                                 </div>
                               )}
                             </div>
                             <button
                               onClick={() => { const next = new Set(bookmarks); if (next.has(qObj.id)) next.delete(qObj.id); else next.add(qObj.id); setBookmarks(next); }}
                               className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors border ${bookmarks.has(qObj.id) ? 'bg-[#e3f2fd] border-[#90caf9] text-[#1976D2]' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                             >
                               <svg viewBox="0 0 24 24" fill={bookmarks.has(qObj.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                             </button>
                           </div>
                           {/* Answer */}
                           <div className="ml-12">
                             {qObj.type === 'MCQ' && (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-10">
                                 {(qObj.options || []).map((opt, i) => {
                                   const letter = String.fromCharCode(65 + i);
                                   const isSelected = answers[qObj.id] === letter;
                                   return (
                                     <label key={i} onClick={() => handleAnswerChange(qObj.id, letter)} className={`flex items-start gap-3 cursor-pointer group p-3 rounded-xl border transition-colors ${isSelected ? 'border-[#1976D2] bg-[#f8faff]' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}>
                                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${isSelected ? 'border-[#1976D2] bg-[#1976D2]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                         {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                       </div>
                                       <div className="flex-1 text-gray-800 text-[15px] leading-relaxed"><MathRenderer text={opt} /></div>
                                     </label>
                                   );
                                 })}
                               </div>
                             )}
                             {qObj.type === 'MA' && (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-10">
                                 {(qObj.options || []).map((opt, i) => {
                                   const letter = String.fromCharCode(65 + i);
                                   const isSelected = maSel.includes(letter);
                                   return (
                                     <label key={i} onClick={() => { const s = new Set(maSel); if (s.has(letter)) s.delete(letter); else s.add(letter); handleAnswerChange(qObj.id, [...s].sort()); }} className={`flex items-start gap-3 cursor-pointer group p-3 rounded-xl border transition-colors ${isSelected ? 'border-[#1976D2] bg-[#f8faff]' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}>
                                       <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${isSelected ? 'border-[#1976D2] bg-[#1976D2]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                         {isSelected && <svg viewBox="0 0 10 10" className="w-3 h-3"><polyline points="1,5 4,8 9,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                                       </div>
                                       <div className="flex-1 text-gray-800 text-[15px] leading-relaxed"><MathRenderer text={opt} /></div>
                                     </label>
                                   );
                                 })}
                               </div>
                             )}
                             {qObj.type === 'TF' && qObj.statements && (
                               <table className="w-full border-collapse">
                                 <thead><tr><th className="text-left py-2 px-3 text-sm font-bold text-gray-700 border-b border-gray-200">Phát biểu</th><th className="py-2 px-3 text-sm font-bold text-gray-700 border-b border-gray-200 w-16 text-center">Đúng</th><th className="py-2 px-3 text-sm font-bold text-gray-700 border-b border-gray-200 w-16 text-center">Sai</th></tr></thead>
                                 <tbody>{qObj.statements.map((stmt, si) => { const sKey = si < 26 ? String.fromCharCode(97 + si) : String(si + 1); const sVal = tfSel[sKey]; const radio = (val) => (<button onClick={() => handleAnswerChange(qObj.id, { ...tfSel, [sKey]: val })} className={`w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition-colors ${sVal === val ? 'border-[#1976D2] bg-[#1976D2]' : 'border-gray-300 hover:border-gray-400'}`}>{sVal === val && <svg viewBox="0 0 10 10" className="w-3 h-3"><polyline points="1,5 4,8 9,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}</button>); return (<tr key={si} className="border-b border-gray-100"><td className="py-3 px-3 text-sm text-gray-800"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 mr-2">{sKey}</span><MathRenderer text={stmt.text || stmt} /></td><td className="py-3 px-3 text-center">{radio('D')}</td><td className="py-3 px-3 text-center">{radio('S')}</td></tr>); })}</tbody>
                               </table>
                             )}
                             {qObj.type === 'SA' && (
                               <div>
                                 <div className="text-sm text-[#D32F2F] font-medium mb-2">Đáp án cần điền là: _______</div>
                                 <input type="text" value={answers[qObj.id] ?? ''} onChange={e => handleAnswerChange(qObj.id, e.target.value)} placeholder="Nhập đáp án của bạn..." className="w-full max-w-md px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-base focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-blue-100 transition-all" />
                               </div>
                             )}
                             {qObj.type === 'DRAG' && (
                               <div className="tsa-drag-wrap"><QuestionCard question={qObj} index={qIndex} selectedAnswer={answers[qObj.id] ?? getEmptyAnswerForType(qObj.type)} onAnswerChange={(val) => handleAnswerChange(qObj.id, val)} disabled={false} /></div>
                             )}
                           </div>
                         </div>
                       );
                     };

                     // GROUPED: Context + all child questions
                     if (contextQ && groupQuestions) {
                       return (
                         <div className="tsa-content-split flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                           <div className="tsa-context-panel w-full sm:w-[55%] sm:sticky sm:top-0 sm:self-start sm:max-h-[calc(100vh-180px)] overflow-y-auto">
                             <div className="bg-[#f8f9fa] border border-gray-200 rounded-xl p-6">
                               <div className="flex items-center gap-2 mb-3">
                                 <BookOpen weight="duotone" className="w-4 h-4 text-gray-500" />
                                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ngữ liệu</span>
                               </div>
                               <div className="text-[15px] leading-relaxed text-gray-700">
                                 <MathRenderer text={contextQ.content} />
                               </div>
                               {isValidImageSrc(contextQ.image) && (
                                 <div className="mt-3"><img src={contextQ.image} alt="" className="rounded-xl max-h-[400px] w-auto max-w-full object-contain" /></div>
                               )}
                             </div>
                           </div>
                           <div className="tsa-questions-panel w-full sm:w-[45%]">
                             {groupQuestions.map(gq => {
                               const gIdx = realQuestions.findIndex(r => r.id === gq.id);
                               return renderAnswerInput(gq, gIdx >= 0 ? gIdx : 0);
                             })}
                           </div>
                         </div>
                       );
                     }

                     // SINGLE question (no context)
                     return renderAnswerInput(currentQuestionObj, currentQ);
                   })()}
                </div>
             </div>

             {/* Bottom Bar */}
             <div className="tsa-bottombar absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-between px-8 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-4">
                   <button 
                      onClick={() => setCurrentQ(Math.max(currentTsaSection.startIndex, currentQ - 1))}
                      disabled={currentQ <= currentTsaSection.startIndex}
                      className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
                   >
                      <CaretLeft weight="bold" />
                   </button>
                   <button 
                      onClick={() => {
                        const isLastQ = currentQ >= currentTsaSection.endIndex - 1;
                        if (isLastQ) {
                           confirmSubmit();
                        } else {
                           setCurrentQ(currentQ + 1);
                        }
                      }}
                      className="px-6 h-10 rounded-lg bg-[#1A237E] hover:bg-blue-900 text-white font-bold transition-colors flex items-center gap-2"
                   >
                      Câu tiếp <CaretRight weight="bold" />
                   </button>
                   
                   <div className="ml-4 text-xs font-medium text-gray-500">
                      Thời gian làm câu hiện tại: <span className="font-bold text-gray-700 font-mono text-[13px]">{formatClock(currentQElapsed)}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Sidebar */}
          <div className="tsa-sidebar w-[320px] bg-white border-l border-gray-200 shrink-0 flex flex-col h-full overflow-hidden shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-10 relative" {...tsaSidebarSwipeHandlers}>
             <div className="p-6 flex-1 overflow-y-auto">
                {/* Thông tin thí sinh */}
                <div className="mb-8">
                   <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2"><div className="w-1 h-3.5 bg-[#D32F2F] rounded-full"></div> Thông tin thí sinh</h3>
                   <div className="flex flex-col gap-2.5 text-[13px]">
                      <div className="flex justify-between items-center">
                         <span className="text-gray-500">Họ tên</span>
                         <span className={`font-semibold py-0.5 px-2 rounded-md ${!user?.user_metadata?.full_name ? 'bg-red-50 text-[#D32F2F] border border-red-200' : 'text-gray-900 bg-gray-50'}`}>
                            {user?.user_metadata?.full_name || 'Chưa điền'}
                         </span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-gray-500">Ngày sinh</span>
                         <span className="font-medium text-gray-800">Chưa xác định</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-gray-500">Mã dự thi</span>
                         <span className="font-medium text-gray-800">Thí sinh tự do</span>
                      </div>
                   </div>
                </div>

                {/* Timer & Submit */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                   <div>
                      <div className="text-[11px] font-semibold text-gray-500 mb-1">Thời gian còn lại</div>
                      <div className="text-[32px] font-black tracking-tight leading-none font-mono" style={{ '--tsa-timer-color': '#E53935' }}>
                         <Timer key={`tsa-${tsaSectionIndex}`} compact initialMinutes={activeQuizDuration} initialSeconds={savedSecondsLeft} onTick={handleTick} onTimeUp={handleTimeUp} isRunning={timerRunning} />
                      </div>
                   </div>
                   <button onClick={confirmSubmit} className="bg-[#D32F2F] hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-md transition-colors flex items-center gap-2 text-sm">
                      Nộp bài
                   </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 mb-5 text-[11px] font-semibold text-gray-500 flex-wrap">
                   <span>Chỉ thị:</span>
                   <div className="flex items-center gap-1.5"><div className="w-[16px] h-[16px] rounded-full bg-[#1976D2] text-white flex items-center justify-center text-[8px]">{quizAnsweredCount}</div><span>Đã làm</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-[16px] h-[16px] rounded-full bg-[#F57C00] text-white flex items-center justify-center text-[8px]">{bookmarkedCount}</div><span>Đánh dấu</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-[16px] h-[16px] rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center text-[8px]">{unansweredCount}</div><span>Chưa làm</span></div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-6 gap-2">
                   {quizQuestionEntries.map(({ q, i }) => {
                      const isAnswered = hasPracticeAnswer(answers[q.id]);
                      const isBookmarked = bookmarks.has(q.id);
                      const isCurrent = i === currentQ;
                      let bgClass = "bg-white border-gray-200 text-gray-500 hover:border-gray-400";
                      
                      if (isCurrent) bgClass = "bg-[#1A237E] border-[#1A237E] text-white shadow-md";
                      else if (isBookmarked) bgClass = "bg-[#F57C00] border-[#F57C00] text-white";
                      else if (isAnswered) bgClass = "bg-[#1976D2] border-[#1976D2] text-white";

                      return (
                         <button 
                            key={i}
                            onClick={() => setCurrentQ(i)}
                            className={`w-9 h-9 rounded-full border flex items-center justify-center text-[13px] font-bold transition-all ${bgClass}`}
                         >
                            {i - currentTsaSection.startIndex + 1}
                         </button>
                      );
                   })}
                </div>
             </div>

             {/* Bottom Sidebar - Progress & Connection */}
             <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-end mb-2">
                   <div className="text-[11px] font-semibold text-gray-500">Bạn đã hoàn thành</div>
                   <div className="text-xs font-bold text-gray-800">{quizAnsweredCount}/{quizQuestionEntries.length} câu</div>
                </div>
                <div className="w-full h-[6px] bg-gray-200 rounded-full overflow-hidden mb-1">
                   <div className="h-full bg-[#D32F2F] transition-all" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="text-right text-[10px] font-bold text-gray-400 mb-6">{pct}%</div>
                
                <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-2">
                   <div className="w-2.5 h-2.5 bg-[#43A047] rounded-full shadow-[0_0_8px_rgba(67,160,71,0.5)]"></div> Đã kết nối máy chủ
                </div>
             </div>
          </div>
        </div>
        
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  if (quizPhase === 'quiz' && activeExam) {
    const quizQuestionEntries = isTSA ? tsaSectionQuestionEntries : realQuestions.map((q, i) => ({ q, i }));
    const quizAnsweredCount = quizQuestionEntries.filter(({ q }) => hasPracticeAnswer(answers[q.id])).length;
    const quizTotalCount = quizQuestionEntries.length;
    const pct = quizTotalCount > 0 ? Math.round((quizAnsweredCount / quizTotalCount) * 100) : 0;
    const unansweredCount = Math.max(0, quizTotalCount - quizAnsweredCount);
    const quizSecondsLeft = savedSecondsLeft ?? (activeQuizDuration * 60);
    const getQuizNavClass = (q, i) => {
      const isAnswered = hasPracticeAnswer(answers[q.id]);
      const isBookmarked = bookmarks.has(q.id);
      return [
        isAnswered ? 'quiz-answered' : 'quiz-unanswered',
        isBookmarked ? 'quiz-bookmarked' : '',
        i === currentQ ? 'current' : '',
      ].filter(Boolean).join(' ');
    };
    const confirmSubmit = () => {
      const msg = unansweredCount > 0
        ? `⚠️ CẢNH BÁO: Bạn còn ${unansweredCount} câu chưa làm!\n\nBạn đã trả lời ${quizAnsweredCount}/${quizTotalCount} câu. Bạn có chắc chắn muốn nộp ${isTSA && !isLastTsaSection ? 'phần này' : 'bài'}?`
        : `Bạn đã trả lời ${quizAnsweredCount}/${quizTotalCount} câu. Bạn có chắc chắn muốn nộp ${isTSA && !isLastTsaSection ? 'phần này' : 'bài'}?`;
      showConfirm(
        isTSA && !isLastTsaSection ? 'Xác nhận nộp phần' : 'Xác nhận nộp bài',
        msg,
        () => (isTSA && !isLastTsaSection ? handleSubmitTsaSection() : handleSubmit())
      );
    };

    return (
      <div className="fixed inset-0 z-50 theme-page flex flex-col" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={() => {
          showConfirm(
            'Xác nhận thoát',
            isAntiCheatEnabled
              ? (
                <>
                  Thoát khỏi bài thi nghiêm túc sẽ được tính là 1 lần <strong className="font-black text-red-600">vi phạm</strong>. Tiến trình làm bài vẫn được lưu lại tự động. Bạn có chắc chắn muốn thoát?
                </>
              )
              : 'Tiến trình làm bài của bạn sẽ được lưu lại tự động. Bạn có chắc chắn muốn thoát?',
            () => handleExitQuiz()
          );
        }}>
          <div className="exam-status-panel mobile-only bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Clock weight="duotone" className="w-4 h-4 text-indigo-600" />
            <Timer key={`mobile-${isTSA ? tsaSectionIndex : 'all'}`} compact initialMinutes={activeQuizDuration} initialSeconds={savedSecondsLeft} onTick={handleTick} onTimeUp={handleTimeUp} isRunning={timerRunning} />
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
                <div className="et-exam-sub">
                  {isTSA
                    ? `${currentTsaSection.name} · ${tsaSectionQuestionEntries.length} câu · ${currentTsaSection.durationMinutes} phút`
                    : `${activeExam.subject} · ${realQuestions.length} câu`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="et-btn-outline" style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => { showConfirm('Làm lại từ đầu', 'Toàn bộ câu trả lời hiện tại sẽ bị xóa. Bạn có chắc chắn?', () => handleRetry()); }}>
                  <ArrowCounterClockwise weight="bold" style={{ width: 13, height: 13 }} /> Làm lại
                </button>
              </div>
            </div>

            {isTSA && (
              <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left">
                <div className="text-[11px] font-black uppercase tracking-wider text-violet-500">
                  Phần {tsaSectionIndex + 1}/{TSA_SECTIONS.length}
                </div>
                <div className="mt-1 text-lg font-black text-violet-800">{currentTsaSection.name}</div>
                <div className="mt-1 text-sm font-semibold text-violet-600">
                  {isLastTsaSection
                    ? 'Đây là phần cuối. Nộp phần này sẽ hoàn tất bài thi và hiện kết quả.'
                    : 'Sau khi nộp phần này, bạn sẽ chuyển sang phần tiếp theo và không quay lại phần trước.'}
                </div>
              </div>
            )}

            {(() => {
              let realQIndex = 0;
              return quizGroupedQuestions.map((group, gIdx) => {
                const firstChild = group.children[0];
                const isFirstMCQ = firstChild?._isFirstMCQ;
                const isFirstMA = firstChild?._isFirstMA;
                const isFirstTF = firstChild?._isFirstTF;
                const isFirstSA = firstChild?._isFirstSA;
                const isFirstDRAG = firstChild?._isFirstDRAG;

                const sectionHeader = (
                  <>
                    {isFirstMCQ && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần I: Trắc Nghiệm</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstMA && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Chọn nhiều đáp án</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstTF && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần II: Đúng/Sai</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstSA && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần III: Trả lời ngắn</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstDRAG && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Kéo thả</div>
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
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                          {/* Left: Context / Ngữ liệu */}
                          <div className="lg:w-1/2 w-full lg:sticky lg:top-4">
                            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen weight="duotone" className="w-4 h-4 text-indigo-500" />
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase">ℹ️ Dựa vào thông tin sau để trả lời các câu hỏi bên phải</span>
                              </div>
                              <div className="text-sm leading-relaxed text-gray-700">
                                <MathRenderer text={group.context.content} />
                              </div>
                              {isValidImageSrc(group.context.image) && (
                                <div className="mt-3">
                                  <Image
                                    src={group.context.image}
                                    alt="Context image"
                                    width={900}
                                    height={500}
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className="rounded-xl max-h-[300px] w-auto max-w-full object-contain"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Questions */}
                          <div className="lg:w-1/2 w-full flex flex-col gap-5">
                            {group.children.map(childQ => {
                              const currentI = Number.isInteger(childQ._globalIndex) ? childQ._globalIndex : realQIndex++;
                              return (
                                <div key={childQ.id} id={`q-card-${currentI}`} onClick={() => setCurrentQ(currentI)}>
                                  <QuestionCard
                                    question={childQ}
                                    index={currentI}
                                    selectedAnswer={answers[childQ.id] ?? getEmptyAnswerForType(childQ.type)}
                                    onAnswerChange={(val) => handleAnswerChange(childQ.id, val)}
                                    isBookmarked={bookmarks.has(childQ.id)}
                                    onToggleBookmark={() => {
                                      const next = new Set(bookmarks);
                                      if (next.has(childQ.id)) next.delete(childQ.id);
                                      else next.add(childQ.id);
                                      setBookmarks(next);
                                    }}
                                    onReport={handleOpenReport}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Single normal question
                  if (!firstChild) return null;
                  const currentI = Number.isInteger(firstChild._globalIndex) ? firstChild._globalIndex : realQIndex++;
                  return (
                    <div key={firstChild.id} id={`q-card-${currentI}`} onClick={() => setCurrentQ(currentI)}>
                      {sectionHeader}

                      {firstChild.contextHint && (
                        <div className="et-section-hint">
                          <BookOpen weight="duotone" className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{firstChild.contextHint}</span>
                        </div>
                      )}

                      <QuestionCard
                        question={firstChild}
                        index={currentI}
                        selectedAnswer={answers[firstChild.id] ?? getEmptyAnswerForType(firstChild.type)}
                        onAnswerChange={(val) => handleAnswerChange(firstChild.id, val)}
                        isBookmarked={bookmarks.has(firstChild.id)}
                        onToggleBookmark={() => {
                          const next = new Set(bookmarks);
                          if (next.has(firstChild.id)) next.delete(firstChild.id);
                          else next.add(firstChild.id);
                          setBookmarks(next);
                        }}
                        onReport={handleOpenReport}
                      />
                    </div>
                  );
                }
              });
            })()}

            {/* Bottom Submit Button */}
            <div className="mt-8 mb-24 flex justify-center">
              <button
                onClick={confirmSubmit}
                className="px-8 py-3.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 18, height: 18 }}><polyline points="20 6 9 17 4 12" /></svg>
                {isTSA && !isLastTsaSection ? 'Nộp phần & sang phần tiếp' : 'Hoàn thành & Nộp bài'}
              </button>
            </div>
          </div>

          {/* Drawer Overlay for Mobile */}
          <div className={`et-drawer-overlay mobile-only ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />

          {/* Mobile Drawer */}
          <div className={`et-drawer mobile-only flex flex-col ${isDrawerOpen ? 'open' : ''}`} {...drawerSwipeHandlers}>
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Danh sách câu hỏi</div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="exam-status-panel rounded-xl bg-indigo-50 border border-indigo-100 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Thời gian</div>
                  <div className="mt-1 text-2xl font-black text-indigo-600 tabular-nums">{formatClock(quizSecondsLeft)}</div>
                </div>
                <button className="px-3 py-2 rounded-lg bg-white text-red-600 font-bold text-xs border border-red-100 shadow-sm" onClick={() => { setIsDrawerOpen(false); handlePause(); }}>
                  Tạm dừng
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xl font-black text-indigo-600">{quizAnsweredCount}</div>
                  <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Đã làm</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-gray-600">{unansweredCount}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Chưa làm</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-amber-600">{bookmarks.size}</div>
                  <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1">Đánh dấu</div>
                </div>
              </div>
              <div className="et-prog-row mt-3"><span>Tiến độ</span><span>{quizAnsweredCount} / {quizTotalCount}</span></div>
              <div className="et-prog-bg"><div className="et-prog-fill" style={{ width: `${pct}%` }} /></div>
            </div>

            <div className="mb-4">
              {renderNavButtons((q, i) => {
                return (
                  <button key={i} className={`et-nav-btn ${getQuizNavClass(q, i)}`} onClick={() => { setIsDrawerOpen(false); scrollToQ(i); }}>
                    {i + 1}
                  </button>
                );
              }, { tsaCurrentOnly: true })}
            </div>

            <div className="et-nav-legend flex-row justify-center gap-5 mt-0 mb-4">
              <div className="et-legend-item"><div className="et-legend-dot is-answered" />Đã trả lời</div>
              <div className="et-legend-item"><div className="et-legend-dot is-bookmarked" />Đánh dấu</div>
              <div className="et-legend-item"><div className="et-legend-dot is-unanswered" />Chưa làm</div>
            </div>

            <div className="mb-4">
              <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2" onClick={() => { setIsDrawerOpen(false); confirmSubmit(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
                {isTSA && !isLastTsaSection ? 'Nộp phần' : 'Nộp bài'}
              </button>
            </div>
          </div>

          {/* Sidebar Toggle (outside sidebar to avoid overflow clipping) */}
          {isSidebarCollapsed && (
            <button className="et-sidebar-toggle desktop-only" onClick={() => setIsSidebarCollapsed(false)} title="Mở danh sách câu hỏi" aria-label="Mở danh sách câu hỏi">
              <span className="et-sidebar-toggle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="15 18 9 12 15 6"></polyline></svg>
              </span>
            </button>
          )}

          {/* Sidebar */}
          <div className={`et-sidebar desktop-only ${isSidebarCollapsed ? 'et-sidebar-collapsed' : ''}`}>
            <div className="flex justify-between items-center px-[17px] py-4 border-b border-gray-100">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Danh sách câu hỏi</div>
              <button onClick={() => setIsSidebarCollapsed(true)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600" title="Đóng panel">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="exam-status-panel rounded-xl bg-indigo-50 border border-indigo-100 p-3 m-[17px] mb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Thời gian</div>
                  <div className="mt-1 text-2xl font-black text-indigo-600 tabular-nums">
                    <Timer key={`desktop-${isTSA ? tsaSectionIndex : 'all'}`} compact initialMinutes={activeQuizDuration} initialSeconds={savedSecondsLeft} onTick={handleTick} onTimeUp={handleTimeUp} isRunning={timerRunning} />
                  </div>
                </div>
                <button className="px-3 py-2 rounded-lg bg-white text-red-600 font-bold text-xs border border-red-100 shadow-sm" onClick={handlePause}>
                  Tạm dừng
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xl font-black text-indigo-600">{quizAnsweredCount}</div>
                  <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Đã làm</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-gray-600">{unansweredCount}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Chưa làm</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-amber-600">{bookmarks.size}</div>
                  <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1">Đánh dấu</div>
                </div>
              </div>
              <div className="et-prog-row mt-3"><span>Tiến độ</span><span>{quizAnsweredCount} / {quizTotalCount}</span></div>
              <div className="et-prog-bg"><div className="et-prog-fill" style={{ width: `${pct}%` }} /></div>
            </div>

            <div className="px-[17px] pb-2">
              <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2" onClick={confirmSubmit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
                {isTSA && !isLastTsaSection ? 'Nộp phần' : 'Nộp bài'}
              </button>
            </div>

            <div className="et-nav-block">
              <div className="et-nav-title">Danh sách câu hỏi</div>
              {renderNavButtons((q, i) => {
                return (
                  <button key={i} className={`et-nav-btn ${getQuizNavClass(q, i)}`} onClick={() => scrollToQ(i)}>
                    {i + 1}
                  </button>
                );
              }, { tsaCurrentOnly: true })}
              <div className="et-nav-legend mt-4">
                <div className="et-legend-item"><div className="et-legend-dot is-answered" />Đã trả lời</div>
                <div className="et-legend-item"><div className="et-legend-dot is-bookmarked" />Đánh dấu</div>
                <div className="et-legend-item"><div className="et-legend-dot is-unanswered" />Chưa làm</div>
              </div>
            </div>
          </div>
        </div>
        {reportModal.isOpen && <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} reportReasons={REPORT_REASONS} />}
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── RESULTS SUMMARY ──
  if (quizPhase === 'results' && activeExam) {
    return (
      <div className="fixed inset-0 z-50 theme-page flex flex-col" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset} />
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm text-center animate-fadeIn">
            <ResultsView questions={questions} answers={answers} onReset={handleRetry} scoringConfig={activeExam.scoringConfig} examType={activeExam.examType} subject={activeExam.subject} />
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => setQuizPhase('results-detail')}
                className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2"
              >
                Xem chi tiết bài thi <CaretRight weight="bold" className="w-4 h-4" />
              </button>
              <button className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2" onClick={handleReset}>
                <ArrowLeft className="w-4 h-4" /> Chọn đề khác
              </button>
            </div>
          </div>
        </div>
        {reportModal.isOpen && <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} reportReasons={REPORT_REASONS} />}
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── RESULTS DETAIL (2-column layout) ──
  if (quizPhase === 'results-detail' && activeExam) {
    const detailResult = calculateExamResult(realQuestions, answers, {
      scoringConfig: activeExam.scoringConfig,
      examType: activeExam.examType,
      subject: activeExam.subject,
    });
    const correctCount = detailResult.correct;
    const unansweredCount = detailResult.unanswered;
    const resultScoreText = isTSA
      ? `${detailResult.score}/${detailResult.maxScore}`
      : detailResult.score.toFixed(1);

    return (
      <div className="fixed inset-0 z-50 theme-page flex flex-col" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif", color: 'var(--et-gray-800)' }}>
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
                const isFirstMA = firstChild?._isFirstMA;
                const isFirstTF = firstChild?._isFirstTF;
                const isFirstSA = firstChild?._isFirstSA;
                const isFirstDRAG = firstChild?._isFirstDRAG;

                const sectionHeader = (
                  <>
                    {isFirstMCQ && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần I: Trắc Nghiệm</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstMA && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Chọn nhiều đáp án</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstTF && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần II: Đúng/Sai</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstSA && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Phần III: Trả lời ngắn</div>
                        <div className="et-section-hd-line" />
                      </div>
                    )}
                    {isFirstDRAG && (
                      <div className="et-section-hd">
                        <div className="et-section-hd-line" />
                        <div className="et-section-hd-badge">Kéo thả</div>
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
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                          {/* Left: Context */}
                          <div className="lg:w-1/2 w-full lg:sticky lg:top-4">
                            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen weight="duotone" className="w-4 h-4 text-indigo-500" />
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase">ℹ️ Ngữ liệu</span>
                              </div>
                              <div className="text-sm leading-relaxed text-gray-700">
                                <MathRenderer text={group.context.content} />
                              </div>
                              {isValidImageSrc(group.context.image) && (
                                <div className="mt-3">
                                  <Image
                                    src={group.context.image}
                                    alt="Context image"
                                    width={900}
                                    height={500}
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className="rounded-xl max-h-[300px] w-auto max-w-full object-contain"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Questions */}
                          <div className="lg:w-1/2 w-full flex flex-col gap-5">
                            {group.children.map(childQ => {
                              const currentI = realQIndex++;
                              return (
                                <div key={childQ.id} id={`q-card-${currentI}`}>
                                  <QuestionCard
                                    question={childQ}
                                    index={currentI}
                                    selectedAnswer={answers[childQ.id] ?? getEmptyAnswerForType(childQ.type)}
                                    onAnswerChange={() => { }}
                                    showResult
                                    disabled
                                    onReport={handleOpenReport}
                                  />
                                </div>
                              );
                            })}
                          </div>
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
                          <BookOpen weight="duotone" className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{firstChild.contextHint}</span>
                        </div>
                      )}

                      <QuestionCard
                        question={firstChild}
                        index={currentI}
                        selectedAnswer={answers[firstChild.id] ?? getEmptyAnswerForType(firstChild.type)}
                        onAnswerChange={() => { }}
                        showResult
                        disabled
                        onReport={handleOpenReport}
                      />
                    </div>
                  );
                }
              });
            })()}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '24px 0' }}>
              <button className="et-btn-outline" onClick={handleRetry}><ArrowCounterClockwise weight="bold" style={{ width: 13, height: 13 }} /> Làm lại đề này</button>
              <button className="et-btn-outline" onClick={handleReset}><ArrowLeft style={{ width: 13, height: 13 }} /> Chọn đề khác</button>
            </div>
          </div>

          <button className="et-fab mobile-only" onClick={() => setIsDrawerOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>

          {/* Drawer Overlay for Mobile */}
          <div className={`et-drawer-overlay mobile-only ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />

          {/* Mobile Drawer */}
          <div className={`et-drawer mobile-only flex flex-col ${isDrawerOpen ? 'open' : ''}`} {...drawerSwipeHandlers}>
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Chi tiết bài làm</div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-3 bg-indigo-50 rounded-xl p-4 mb-5">
              <div>
                <div className="text-2xl font-black text-indigo-600">{correctCount}/{realQuestions.length}</div>
                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-1">Câu đúng</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-amber-600">{unansweredCount}</div>
                <div className="text-xs text-amber-500 font-bold uppercase tracking-wider mt-1">Chưa làm</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">{resultScoreText}</div>
                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-1">Điểm số</div>
              </div>
            </div>

            <div className="mb-4">
              {renderNavButtons((q, i) => {
                const resultState = getQuestionResultState(q, answers[q.id] ?? getEmptyAnswerForType(q.type));
                return (
                  <button key={i} className={`et-nav-btn ${resultState}`} onClick={() => { setIsDrawerOpen(false); scrollToQ(i); }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="et-nav-legend flex-row justify-center gap-6 mt-0">
              <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-green-lt)', border: '1.5px solid var(--et-green)' }} />Đúng</div>
              <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-red-lt)', border: '1.5px solid var(--et-red)' }} />Sai</div>
              <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-amber-lt)', border: '1.5px solid var(--et-amber)' }} />Chưa làm</div>
            </div>
          </div>

          {/* Sidebar Toggle (outside sidebar to avoid overflow clipping) */}
          {isSidebarCollapsed && (
            <button className="et-sidebar-toggle desktop-only" onClick={() => setIsSidebarCollapsed(false)} title="Mở danh sách câu hỏi" aria-label="Mở danh sách câu hỏi">
              <span className="et-sidebar-toggle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="15 18 9 12 15 6"></polyline></svg>
              </span>
            </button>
          )}

          {/* Results sidebar with nav */}
          <div className={`et-sidebar desktop-only ${isSidebarCollapsed ? 'et-sidebar-collapsed' : ''}`}>
            <div className="flex justify-between items-center px-[17px] py-4 border-b border-gray-100">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Chi tiết bài làm</div>
              <button onClick={() => setIsSidebarCollapsed(true)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600" title="Đóng panel">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-indigo-50 rounded-xl p-3 m-[17px] mb-2">
              <div>
                <div className="text-xl font-black text-indigo-600">{correctCount}/{realQuestions.length}</div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Đúng</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-amber-600">{unansweredCount}</div>
                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1">Chưa làm</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-indigo-600">{resultScoreText}</div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Điểm</div>
              </div>
            </div>
            <div className="et-nav-block">
              <div className="et-nav-title">Danh sách câu hỏi</div>
              {renderNavButtons((q, i) => {
                const resultState = getQuestionResultState(q, answers[q.id] ?? getEmptyAnswerForType(q.type));
                return (
                  <button key={i} className={`et-nav-btn ${resultState}`} onClick={() => scrollToQ(i)}>
                    {i + 1}
                  </button>
                );
              })}
              <div className="et-nav-legend mt-4">
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-green-lt)', border: '1.5px solid var(--et-green)' }} />Đúng</div>
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-red-lt)', border: '1.5px solid var(--et-red)' }} />Sai</div>
                <div className="et-legend-item"><div className="et-legend-dot" style={{ background: 'var(--et-amber-lt)', border: '1.5px solid var(--et-amber)' }} />Chưa làm</div>
              </div>
            </div>
          </div>
        </div>
        {reportModal.isOpen && <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} reportReasons={REPORT_REASONS} />}
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  if (loadingExam) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div style={{ color: 'var(--et-gray-500)', fontSize: 16, fontWeight: 500 }}>Đang tải đề thi...</div>
      </div>
    );
  }

  if (examLoadError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Không mở được đề thi</h1>
          <p className="text-sm text-gray-500 mb-5">{examLoadError}</p>
          <button onClick={() => router.push('/')} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors">
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return null;
}
