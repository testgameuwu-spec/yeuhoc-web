'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, User, ArrowLeft, ChevronRight, ChevronLeft, RotateCcw, Clock, X, BarChart2, Award, Calendar, Eye, CheckCircle2, XCircle, Folder, Lock, ChevronDown, AlertTriangle, Send, Bot } from 'lucide-react';
import Navbar from '@/components/Navbar';
import LogoIcon from '@/components/LogoIcon';
import UserProfile from '@/components/UserProfile';
import { getPublishedExams, getExamById, getAllFolders } from '@/lib/examStore';
import FilterBar from '@/components/FilterBar';
import ExamCard from '@/components/ExamCard';
import QuestionCard from '@/components/QuestionCard';
import PracticeAIChatbox from '@/components/PracticeAIChatbox';
import MathRenderer from '@/components/MathRenderer';
import Pagination from '@/components/Pagination';
import ResultsView from '@/components/ResultsView';
import Timer from '@/components/Timer';
import { supabase } from '@/lib/supabase';

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

// ── Report Modal Component ──
const ReportModal = ({ reportModal, setReportModal, user, activeExam, showAlert, REPORT_REASONS }) => {
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (reportModal.isOpen) {
      setReportReason('');
      setReportNote('');
      setReportSubmitting(false);
      setExistingReport(null);
    }
  }, [reportModal.isOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!reportModal.isOpen || !user?.id || !activeExam?.id || !reportModal.question?.id) {
        setExistingReport(null);
        return;
      }
      setLoadingExisting(true);
      try {
        const { data, error } = await supabase
          .from('question_reports')
          .select('id, status, reason, note, created_at, resolved_at, admin_reply, admin_replied_at')
          .eq('user_id', user.id)
          .eq('exam_id', activeExam.id)
          .eq('question_id', reportModal.question.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && !error) setExistingReport(data || null);
      } catch {
        if (!cancelled) setExistingReport(null);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [reportModal.isOpen, reportModal.question?.id, user?.id, activeExam?.id]);

  const handleSubmitReport = async () => {
    if (!reportReason || existingReport) return;
    setReportSubmitting(true);
    try {
      const { error } = await supabase.from('question_reports').insert({
        user_id: user?.id,
        exam_id: activeExam?.id,
        question_id: reportModal.question?.id,
        question_content: reportModal.question?.content?.substring(0, 200),
        reason: reportReason,
        note: reportNote,
        exam_title: activeExam?.title,
        status: 'pending',
      });
      if (error) throw error;
      setReportModal({ isOpen: false, question: null });
      showAlert('Đã gửi báo cáo', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý sớm nhất. Bạn có thể theo dõi trong Hồ sơ → Báo cáo câu hỏi.');
    } catch (err) {
      console.error('Report error:', err);
      showAlert('Lỗi', 'Không thể gửi báo cáo: ' + (err.message || 'Vui lòng thử lại.'));
    }
    setReportSubmitting(false);
  };
  if (!reportModal.isOpen) return null;

  const existingReasonLabel = existingReport
    ? (REPORT_REASONS.find((r) => r.value === existingReport.reason)?.label || existingReport.reason)
    : '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setReportModal({ isOpen: false, question: null })}>
      <div className="bg-white rounded-2xl w-[90%] max-w-md p-6 shadow-xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Báo cáo câu hỏi</h3>
            <p className="text-xs text-gray-500">Câu {reportModal.question?.content?.substring(0, 50)}...</p>
          </div>
        </div>

        {loadingExisting ? (
          <p className="text-sm text-gray-500 mb-4">Đang kiểm tra báo cáo trước đó...</p>
        ) : existingReport ? (
          <div className="mb-5 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900">
            <p className="font-semibold mb-1">Bạn đã gửi báo cáo cho câu này</p>
            <p className="text-xs text-indigo-800/90 mb-2">
              Lý do: {existingReasonLabel}
              {existingReport.note ? ` — ${existingReport.note}` : ''}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide">
              Trạng thái:{' '}
              {existingReport.status === 'resolved' ? (
                <span className="text-green-700">Đã xử lý</span>
              ) : (
                <span className="text-amber-700">Đang chờ xử lý</span>
              )}
            </p>
            <p className="text-[11px] text-indigo-700/80 mt-2">
              Xem tất cả báo cáo tại Hồ sơ → Báo cáo câu hỏi.
            </p>
            {existingReport.admin_reply && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                  Phản hồi từ Đội ngũ YeuHoc
                </p>
                <p className="text-xs text-emerald-800 mt-1">{existingReport.admin_reply}</p>
                {existingReport.admin_replied_at && (
                  <p className="text-[11px] text-emerald-700/80 mt-1">
                    {new Date(existingReport.admin_replied_at).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

        <div className={`mb-4 ${existingReport ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Lý do báo cáo *</label>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_REASONS.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReportReason(r.value)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left"
                style={{
                  background: reportReason === r.value ? '#eef2ff' : '#f9fafb',
                  color: reportReason === r.value ? '#4338ca' : '#6b7280',
                  border: `1.5px solid ${reportReason === r.value ? '#818cf8' : '#e5e7eb'}`,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`mb-5 ${existingReport ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú thêm (không bắt buộc)</label>
          <textarea
            value={reportNote}
            onChange={e => setReportNote(e.target.value)}
            placeholder="Mô tả chi tiết vấn đề bạn gặp..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-1.5 border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none"
            style={{ border: '1.5px solid #e5e7eb' }}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setReportModal({ isOpen: false, question: null })}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Đóng
          </button>
          {!existingReport && (
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={!reportReason || reportSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-md flex items-center gap-2"
              style={{
                background: reportReason ? '#ef4444' : '#d1d5db',
                cursor: reportReason && !reportSubmitting ? 'pointer' : 'not-allowed',
                opacity: reportSubmitting ? 0.7 : 1,
              }}
            >
              {reportSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {

  const router = useRouter();
  const [allExams, setAllExams] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({ 'root': true });

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
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

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

  // Report modal states
  const [reportModal, setReportModal] = useState({ isOpen: false, question: null });

  const REPORT_REASONS = [
    { value: 'wrong_question', label: 'Sai đề / Đề bị lỗi' },
    { value: 'wrong_answer', label: 'Sai đáp án' },
    { value: 'wrong_solution', label: 'Sai lời giải' },
    { value: 'unclear', label: 'Đề không rõ ràng' },
    { value: 'missing_image', label: 'Thiếu hình ảnh' },
    { value: 'other', label: 'Lý do khác' },
  ];

  const handleOpenReport = (question) => {
    setReportModal({ isOpen: true, question });
  };

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
      const [exams, folders] = await Promise.all([
        getPublishedExams(),
        getAllFolders()
      ]);
      setAllExams(exams);
      setAllFolders(folders || []);

      const initialExpanded = { 'root': true };
      if (folders) {
        folders.forEach(f => {
          if (f.visibility !== 'private') initialExpanded[f.id] = true;
        });
      }
      setExpandedFolders(initialExpanded);

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

  // Auto-resume from profile
  useEffect(() => {
    if (user && allExams.length > 0 && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const resumeId = urlParams.get('resume_exam');
      if (resumeId) {
        let ex = allExams.find(e => e.id.toString() === resumeId);
        if (ex) {
          const key = `yeuhoc_progress_${user.id}_${ex.id}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const data = JSON.parse(saved);
              setActiveExam(ex);
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
              window.history.replaceState({}, '', window.location.pathname);

              // Try fullscreen if enabled
              if (ex.antiCheatEnabled !== false) {
                const el = document.documentElement;
                if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    }
  }, [user, allExams]);

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
    setIsAIChatOpen(false);
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
      let score = 0;
      let correctCount = 0;

      const realQs = activeExam.questions.filter(q => q.type !== 'TEXT');
      realQs.forEach(q => {
        const ua = answers[q.id] || '';
        const config = activeExam.scoringConfig;
        
        if (q.type === 'MCQ') {
          if (ua === q.answer) {
            correctCount++;
            score += config ? config.mcq : 1;
          }
        } else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
          const s = typeof ua === 'object' ? ua : {};
          let subCorrect = 0;
          const keys = Object.keys(q.answer);
          keys.forEach(k => {
             if (s[k] === q.answer[k]) subCorrect++;
          });
          if (subCorrect === keys.length) correctCount++;
          if (config && subCorrect > 0) {
             score += config.tf[subCorrect - 1];
          } else if (!config && subCorrect === keys.length) {
             score += 1;
          }
        } else {
          if (ua && (ua.toString().trim().toLowerCase() === (q.answer || '').toString().trim().toLowerCase())) {
            correctCount++;
            score += config ? config.sa : 1;
          }
        }
      });

      if (!activeExam.scoringConfig) {
        score = realQs.length > 0 ? (correctCount / realQs.length) * 10 : 0;
      }

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
    setIsAIChatOpen(false);
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
    const q = realQuestions[currentQ];
    const isRevealed = practiceRevealed[currentQ] || false;
    const ua = answers[q?.id];
    const hasAnswered = ua !== undefined && ua !== '' && (typeof ua !== 'object' || Object.keys(ua).length > 0);

    // Check correctness for dot colors
    const checkCorrect = (qItem, idx) => {
      const rev = practiceRevealed[idx];
      if (!rev || !qItem) return null; // null = not revealed yet
      const a = answers[qItem.id];
      if (qItem.type === 'MCQ') return a === qItem.answer;
      if (qItem.type === 'TF' && qItem.answer && typeof qItem.answer === 'object') {
        const s = typeof a === 'object' ? a : {};
        return Object.keys(qItem.answer).every(k => s[k] === qItem.answer[k]);
      }
      return (a || '').toString().trim().toLowerCase() === (qItem.answer || '').toString().trim().toLowerCase();
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
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-bold">
            📖 Chế độ ôn luyện
          </div>
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
                    <button key={i} onClick={() => { setIsAIChatOpen(false); setCurrentQ(i); }} style={{
                      width: isCurrent ? 22 : 9, height: 9, borderRadius: 20, border: 'none', cursor: 'pointer',
                      background: bg, transition: 'all .2s', flexShrink: 0,
                    }} title={`Câu ${i + 1}${isMarked ? ' (đánh dấu)' : done ? (correctness ? ' (đúng)' : ' (sai)') : ''}`} />
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
                    {contextQ.image && (
                      <div className="mt-3">
                        <img src={contextQ.image} alt="" className="rounded-xl max-h-[300px] object-contain" />
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
                          selectedAnswer={answers[gq.id] || (gq.type === 'TF' ? {} : '')}
                          onAnswerChange={(val) => !isRev && handleAnswerChange(gq.id, val)}
                          showResult={isRev}
                          disabled={isRev}
                          isBookmarked={bookmarks.has(gq.id)}
                          onToggleBookmark={!isRev ? () => {
                            const next = new Set(bookmarks);
                            if (next.has(gq.id)) next.delete(gq.id);
                            else next.add(gq.id);
                            setBookmarks(next);
                          } : null}
                          onReport={handleOpenReport}
                        />
                        <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3 border-t border-gray-50 mt-4">
                          <button
                            onClick={() => {
                              if (isRev) return;
                              setCurrentQ(rqIndex);
                              setIsAIChatOpen(true);
                            }}
                            disabled={isRev}
                            className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all"
                            style={{
                              background: isRev ? '#f1f5f9' : '#eef2ff',
                              color: isRev ? '#94a3b8' : '#4f46e5',
                              border: 'none',
                              cursor: isRev ? 'not-allowed' : 'pointer',
                            }}
                            type="button"
                          >
                            <Bot className="w-4 h-4" /> Xem gợi ý
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
                              style={{
                                background: hasAns ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0',
                                color: hasAns ? '#fff' : '#94a3b8',
                                border: 'none',
                                cursor: hasAns ? 'pointer' : 'not-allowed',
                                boxShadow: hasAns ? '0 4px 14px rgba(16,185,129,.3)' : 'none',
                              }}
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
                style={{
                  background: firstIndex === 0 ? '#f1f5f9' : '#fff',
                  color: firstIndex === 0 ? '#94a3b8' : '#4b5563',
                  border: '1.5px solid ' + (firstIndex === 0 ? '#e2e8f0' : '#d1d5db'),
                  cursor: firstIndex === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Câu trước</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    if (isRevealed) return;
                    setIsAIChatOpen(true);
                  }}
                  disabled={isRevealed}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all"
                  style={{
                    background: isRevealed ? '#f1f5f9' : '#eef2ff',
                    color: isRevealed ? '#94a3b8' : '#4f46e5',
                    border: 'none',
                    cursor: isRevealed ? 'not-allowed' : 'pointer',
                  }}
                  type="button"
                >
                  <Bot className="w-4 h-4" /> Xem gợi ý
                </button>
                {!contextQ && !isRevealed && (
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
                onClick={() => {
                  const target = Math.min(realQuestions.length - 1, lastIndex + 1);
                  setIsAIChatOpen(false);
                  setCurrentQ(target);
                  document.getElementById('practice-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={lastIndex === realQuestions.length - 1}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all"
                style={{
                  background: lastIndex === realQuestions.length - 1 ? '#f1f5f9' : 'var(--et-blue)',
                  color: lastIndex === realQuestions.length - 1 ? '#94a3b8' : '#fff',
                  border: 'none',
                  cursor: lastIndex === realQuestions.length - 1 ? 'not-allowed' : 'pointer',
                  boxShadow: lastIndex === realQuestions.length - 1 ? 'none' : '0 4px 14px rgba(59,111,212,.3)',
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
                  <button onClick={() => { setAnswers({}); setCurrentQ(0); setIsAIChatOpen(false); setPracticeRevealed({}); setBookmarks(new Set()); }} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-2">
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
        <PracticeAIChatbox
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          questionKey={q ? `${activeExam.id}-${q.id}` : ''}
          questionData={aiQuestionData}
          questionNumber={currentQ + 1}
        />
        <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} REPORT_REASONS={REPORT_REASONS} />
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
                                      <img src={attempt.profiles.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full mx-auto object-cover ring-2 ring-gray-100 aspect-square shrink-0" style={{ minWidth: '48px', minHeight: '48px' }} />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto font-bold text-sm aspect-square shrink-0" style={{ minWidth: '48px', minHeight: '48px' }}>
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
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                          {/* Left: Context / Ngữ liệu */}
                          <div className="lg:w-1/2 w-full lg:sticky lg:top-4">
                            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen className="w-4 h-4 text-indigo-500" />
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase">ℹ️ Dựa vào thông tin sau để trả lời các câu hỏi bên phải</span>
                              </div>
                              <div className="text-sm leading-relaxed text-gray-700">
                                <MathRenderer text={group.context.content} />
                              </div>
                              {group.context.image && (
                                <div className="mt-3">
                                  <img src={group.context.image} alt="Context image" className="rounded-xl max-h-[300px] object-contain" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Questions */}
                          <div className="lg:w-1/2 w-full flex flex-col gap-5">
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
        <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} REPORT_REASONS={REPORT_REASONS} />
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
            <ResultsView questions={questions} answers={answers} onReset={handleRetry} scoringConfig={activeExam.scoringConfig} examType={activeExam.examType} />
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
        <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} REPORT_REASONS={REPORT_REASONS} />
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
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                          {/* Left: Context */}
                          <div className="lg:w-1/2 w-full lg:sticky lg:top-4">
                            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen className="w-4 h-4 text-indigo-500" />
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase">ℹ️ Ngữ liệu</span>
                              </div>
                              <div className="text-sm leading-relaxed text-gray-700">
                                <MathRenderer text={group.context.content} />
                              </div>
                              {group.context.image && (
                                <div className="mt-3">
                                  <img src={group.context.image} alt="Context image" className="rounded-xl max-h-[300px] object-contain" />
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
                                    selectedAnswer={answers[childQ.id] || (childQ.type === 'TF' ? {} : '')}
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
                        onReport={handleOpenReport}
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
        <ReportModal reportModal={reportModal} setReportModal={setReportModal} user={user} activeExam={activeExam} showAlert={showAlert} REPORT_REASONS={REPORT_REASONS} />
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

  const isFiltering = searchQuery || selYear || selType || selSubject || sortOrder !== 'default';
  const lockedFolderIds = new Set(allFolders.filter(f => f.visibility === 'locked').map(f => f.id));

  let browseTotalPages = 1;
  let renderContent = null;

  if (isFiltering) {
    // ── FLAT GRID VIEW (Paginated by Exams) ──
    browseTotalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
    const visibleExams = filteredExams.slice((browsePage - 1) * ITEMS_PER_PAGE, browsePage * ITEMS_PER_PAGE);

    renderContent = visibleExams.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleExams.map(exam => {
          const isLocked = lockedFolderIds.has(exam.folderId);
          return (
            <div key={exam.id} className={isLocked ? 'opacity-60 grayscale-[50%] pointer-events-none relative' : ''}>
              <ExamCard exam={exam} onStart={isLocked ? undefined : handleStartExam} isSaved={savedExams.has(exam.id.toString())} isLocked={isLocked} />
              {isLocked && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl cursor-not-allowed">
                <div className="bg-gray-900/80 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg pointer-events-none">
                  <Lock className="w-4 h-4" /> Đã khoá
                </div>
              </div>}
            </div>
          );
        })}
      </div>
    ) : null;
  } else {
    // ── ACCORDION FOLDER VIEW (Paginated by Folders) ──
    const FOLDERS_PER_PAGE = 5;

    const publicFolders = allFolders.filter(f => f.visibility !== 'private').sort((a, b) => a.order_index - b.order_index);
    const examsByFolder = {};
    const rootExams = [];

    filteredExams.forEach(ex => {
      if (ex.folderId && publicFolders.find(f => f.id === ex.folderId)) {
        if (!examsByFolder[ex.folderId]) examsByFolder[ex.folderId] = [];
        examsByFolder[ex.folderId].push(ex);
      } else {
        rootExams.push(ex);
      }
    });

    const renderableFolders = publicFolders.map(f => ({
      ...f,
      isRoot: false,
      exams: examsByFolder[f.id] || []
    })).filter(f => f.exams.length > 0 || f.visibility === 'locked');

    if (rootExams.length > 0) {
      renderableFolders.push({
        id: 'root',
        name: 'Đề thi khác',
        isRoot: true,
        exams: rootExams,
        visibility: 'public'
      });
    }

    browseTotalPages = Math.ceil(renderableFolders.length / FOLDERS_PER_PAGE);
    const visibleFolders = renderableFolders.slice((browsePage - 1) * FOLDERS_PER_PAGE, browsePage * FOLDERS_PER_PAGE);

    renderContent = visibleFolders.length > 0 ? (
      <div className="space-y-6">
        {visibleFolders.map(folder => {
          const isLocked = folder.visibility === 'locked';
          const isExpanded = expandedFolders[folder.id];
          const fExams = folder.exams;

          return (
            <div key={folder.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedFolders(prev => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                className="flex items-center justify-between p-4 sm:p-5 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <button className="p-1 rounded-md text-gray-400 hover:bg-gray-200">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  {folder.isRoot ? <Folder className="w-5 h-5 text-gray-400" /> : isLocked ? <Lock className="w-5 h-5 text-gray-400" /> : <Folder className="w-5 h-5 text-indigo-500" fill="currentColor" fillOpacity={0.2} />}
                  <h2 className="text-lg font-bold text-gray-800">{folder.name}</h2>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">{fExams.length} đề</span>
                  {isLocked && <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-md ml-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Đã khoá</span>}
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 bg-white">
                  {fExams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {fExams.map(exam => (
                        <div key={exam.id} className={isLocked ? 'opacity-60 grayscale-[50%] pointer-events-none relative' : ''}>
                          <ExamCard exam={exam} onStart={isLocked ? undefined : handleStartExam} isSaved={savedExams.has(exam.id.toString())} isLocked={isLocked} />
                          {isLocked && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl cursor-not-allowed">
                            <div className="bg-gray-900/80 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg pointer-events-none">
                              <Lock className="w-4 h-4" /> Đã khoá
                            </div>
                          </div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-400 py-4 italic">Chưa có đề thi nào trong thư mục này.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : null;
  }

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

        {/* Exam List (Grid or Accordion) */}
        {renderContent ? (
          <>
            {renderContent}

            {/* Pagination */}
            {browseTotalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={browsePage}
                  totalPages={browseTotalPages}
                  onPageChange={setBrowsePage}
                  variant="light"
                />
              </div>
            )}
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
