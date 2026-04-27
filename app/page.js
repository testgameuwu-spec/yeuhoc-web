'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, User, ArrowLeft, ChevronRight, RotateCcw, Clock, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import UserProfile from '@/components/UserProfile';
import { getPublishedExams, getExamById } from '@/lib/examStore';
import FilterBar from '@/components/FilterBar';
import ExamCard from '@/components/ExamCard';
import QuestionCard from '@/components/QuestionCard';
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
  const [quizPhase, setQuizPhase] = useState('browse'); // browse | preview | quiz | results
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

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null, onCancel: null, confirmText: 'Xác nhận', cancelText: 'Hủy', extraBtn: null });

  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null, onCancel: null, extraBtn: null });
  const showConfirm = (title, message, onConfirm, onCancel = null, confirmText = 'Xác nhận', cancelText = 'Hủy', extraBtn = null) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm, onCancel, confirmText, cancelText, extraBtn });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const mainRef = useRef(null);

  const getProgressKey = (examId) => `yeuhoc_progress_${user?.id}_${examId}`;

  // Read saved exams
  useEffect(() => {
    if (user && quizPhase === 'browse') {
      const keys = Object.keys(localStorage);
      const saved = new Set();
      keys.forEach(k => {
        if (k.startsWith(`yeuhoc_progress_${user.id}_`)) {
          const examId = k.split('_').pop();
          saved.add(examId);
        }
      });
      setSavedExams(saved);
    }
  }, [user, quizPhase]);

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
  const answeredCount = questions.filter(q => {
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

  const startFreshQuiz = () => {
    setAnswers({});
    setBookmarks(new Set());
    setCurrentQ(0);
    setSavedSecondsLeft(null);
    setIsPaused(false);
    setQuizPhase('quiz');
    setTimerRunning(true);
    setStartTime(Date.now());
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
            setQuizPhase('quiz');
            setTimerRunning(true);
            setStartTime(Date.now());
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
    setTimerRunning(false);
    setQuizPhase('results');

    if (user && activeExam) {
      // Clear auto-saved progress
      localStorage.removeItem(getProgressKey(activeExam.id));

      const timeSpentSecs = savedSecondsLeft !== null ? (activeExam.duration * 60 - savedSecondsLeft) : (startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);
      let correctCount = 0;

      activeExam.questions.forEach(q => {
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

      const score = activeExam.questions.length > 0 ? (correctCount / activeExam.questions.length) * 10 : 0;

      const { error } = await supabase.from('exam_attempts').insert({
        user_id: user.id,
        exam_id: activeExam.id,
        score: score,
        correct_answers: correctCount,
        total_questions: activeExam.questions.length,
        time_spent: timeSpentSecs,
        user_answers: answers,
      });

      if (error) {
        console.error("Error saving exam attempt:", error);
        showAlert("Lỗi lưu kết quả", "Không lưu được kết quả bài thi: " + error.message + "\n(Hãy kiểm tra RLS Policy)");
      }
    }
  };

  const handleTimeUp = () => { handleSubmit(); };
  const handleReset = () => { setActiveExam(null); setQuizPhase('browse'); setAnswers({}); setTimerRunning(false); setCurrentQ(0); setStartTime(null); setIsPaused(false); };
  const handleRetry = () => {
    if (activeExam && user) localStorage.removeItem(getProgressKey(activeExam.id));
    startFreshQuiz();
  };

  const scrollToQ = (i) => {
    setCurrentQ(i);
    const el = document.getElementById(`q-card-${i}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!authLoaded || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div style={{ color: 'var(--et-gray-500)', fontSize: 16, fontWeight: 500 }}>Đang tải...</div>
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
              Nhấn "Bắt đầu" để vào làm bài. Thời gian sẽ được tính ngay khi bắt đầu.
            </p>
            <button
              onClick={handleBeginQuiz}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--et-blue)', color: '#fff', fontSize: 15, fontWeight: 600,
                fontFamily: 'inherit', transition: 'background .2s',
              }}
              onMouseOver={e => e.target.style.background = '#2f5cc0'}
              onMouseOut={e => e.target.style.background = 'var(--et-blue)'}
            >
              Bắt đầu làm bài <ChevronRight style={{ width: 18, height: 18 }} />
            </button>

            {/* Preview questions list */}
            <div style={{ marginTop: 30, textAlign: 'left' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--et-gray-400)', marginBottom: 10 }}>
                Danh sách câu hỏi
              </div>
              {questions.slice(0, 8).map((q, i) => (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                  border: '1px solid var(--et-gray-100)', background: 'var(--et-gray-50)',
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    background: 'var(--et-gray-100)', color: 'var(--et-gray-600)',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: 'var(--et-gray-600)', flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {q.content || q.text || ''}
                  </span>
                  <span className="et-tag" style={{ fontSize: 10 }}>{q.type}</span>
                </div>
              ))}
              {questions.length > 8 && (
                <p style={{ fontSize: 11, color: 'var(--et-gray-400)', textAlign: 'center', padding: 8 }}>
                  và {questions.length - 8} câu nữa…
                </p>
              )}
            </div>
          </div>
        </div>
        {modal.isOpen && <CustomModal {...modal} onClose={closeModal} />}
      </div>
    );
  }

  // ── QUIZ (2-column layout) ──
  if (quizPhase === 'quiz' && activeExam) {
    const pct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset}>
          <div className="mobile-only bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-indigo-600" />
            <Timer compact initialMinutes={activeExam.duration || 90} initialSeconds={savedSecondsLeft} onTick={handleTick} onTimeUp={handleTimeUp} isRunning={timerRunning} />
          </div>
          <button className="et-btn-outline" style={{ fontSize: 12, padding: '5px 11px' }} onClick={handlePause} title="Tạm dừng">
            <PauseIcon /> <span className="hidden sm:inline">Tạm dừng</span>
          </button>
        </Topbar>
        <div className="et-screen" style={{ position: 'relative' }}>

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

          {/* Main area */}
          <div className="et-main" ref={mainRef}>
            <div className="et-exam-hd">
              <div>
                <div className="et-exam-title">{activeExam.title}</div>
                <div className="et-exam-sub">{activeExam.subject} · {questions.length} câu</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="et-btn-outline" style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => { showConfirm('Làm lại từ đầu', 'Toàn bộ câu trả lời hiện tại sẽ bị xóa. Bạn có chắc chắn?', () => handleRetry()); }}>
                  <RotateCcw style={{ width: 13, height: 13 }} /> Làm lại
                </button>
              </div>
            </div>

            {questions.map((q, i) => (
              <div key={q.id} id={`q-card-${i}`} onClick={() => setCurrentQ(i)}>
                <QuestionCard
                  question={q}
                  index={i}
                  selectedAnswer={answers[q.id] || (q.type === 'TF' ? {} : '')}
                  onAnswerChange={(val) => handleAnswerChange(q.id, val)}
                  isBookmarked={bookmarks.has(q.id)}
                  onToggleBookmark={() => {
                    const next = new Set(bookmarks);
                    if (next.has(q.id)) next.delete(q.id);
                    else next.add(q.id);
                    setBookmarks(next);
                  }}
                />
              </div>
            ))}

            {/* Bottom Submit Button */}
            <div className="mt-8 mb-24 flex justify-center">
              <button
                onClick={() => {
                  const unanswered = questions.length - answeredCount;
                  const msg = unanswered > 0
                    ? `⚠️ CẢNH BÁO: Bạn còn ${unanswered} câu chưa làm!\n\nBạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`
                    : `Bạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`;
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

            <div className="et-prog-row mt-2"><span>Đã làm</span><span>{answeredCount} / {questions.length}</span></div>
            <div className="et-prog-bg mb-4"><div className="et-prog-fill" style={{ width: `${pct}%` }} /></div>

            <div className="et-nav-grid mb-4">
              {questions.map((q, i) => {
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
                const unanswered = questions.length - answeredCount;
                const msg = unanswered > 0
                  ? `⚠️ CẢNH BÁO: Bạn còn ${unanswered} câu chưa làm!\n\nBạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`
                  : `Bạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`;
                showConfirm('Xác nhận nộp bài', msg, () => handleSubmit());
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
                Nộp bài
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="et-sidebar desktop-only">
            <Timer initialMinutes={activeExam.duration || 90} initialSeconds={savedSecondsLeft} onTick={handleTick} onTimeUp={handleTimeUp} isRunning={timerRunning} />

            <button className="et-btn-submit" onClick={() => {
              const unanswered = questions.length - answeredCount;
              const msg = unanswered > 0
                ? `⚠️ CẢNH BÁO: Bạn còn ${unanswered} câu chưa làm!\n\nBạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`
                : `Bạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`;
              showConfirm('Xác nhận nộp bài', msg, () => handleSubmit());
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12" /></svg>
              Nộp bài
            </button>

            <div className="et-prog-block">
              <div className="et-prog-row"><span>Đã làm</span><span>{answeredCount} / {questions.length}</span></div>
              <div className="et-prog-bg"><div className="et-prog-fill" style={{ width: `${pct}%` }} /></div>
            </div>

            <div className="et-nav-block">
              <div className="et-nav-title">Danh sách câu hỏi</div>
              <div className="et-nav-grid">
                {questions.map((q, i) => {
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
              </div>
              <div className="et-nav-legend">
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
    questions.forEach(q => {
      const ua = answers[q.id] || '';
      let ok = false;
      if (q.type === 'MCQ') ok = ua === q.answer;
      else if (q.type === 'TF' && q.answer && typeof q.answer === 'object') {
        const s = typeof ua === 'object' ? ua : {};
        ok = Object.keys(q.answer).every(k => s[k] === q.answer[k]);
      } else ok = (ua || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
      if (ok) correctCount++;
    });
    const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    return (
      <div className="fixed inset-0 z-50 bg-[#f8f9fb] flex flex-col" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'var(--et-gray-800)' }}>
        <Topbar activeExam={activeExam} handleReset={handleReset} />
        <div className="et-screen">
          <div className="et-main">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button className="et-btn-outline" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setQuizPhase('results')}>
                <ArrowLeft style={{ width: 14, height: 14 }} /> Quay lại kết quả
              </button>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--et-gray-400)' }}>
                Chi tiết từng câu
              </div>
            </div>
            {questions.map((q, i) => (
              <div key={q.id} id={`q-card-${i}`}>
                <QuestionCard
                  question={q}
                  index={i}
                  selectedAnswer={answers[q.id] || (q.type === 'TF' ? {} : '')}
                  onAnswerChange={() => { }}
                  showResult
                  disabled
                />
              </div>
            ))}

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
                <div className="text-2xl font-black text-indigo-600">{correctCount}/{questions.length}</div>
                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-1">Câu đúng</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">{pct}%</div>
                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-1">Điểm số</div>
              </div>
            </div>

            <div className="et-nav-grid mb-5">
              {questions.map((q, i) => {
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

          {/* Results sidebar with nav */}
          <div className="et-sidebar desktop-only">
            <div className="et-timer-block">
              <div className="et-timer-lbl">📊 Kết quả</div>
              <div className="et-timer-disp" style={{ fontSize: 28 }}>Hoàn thành</div>
            </div>
            <div className="et-nav-block">
              <div className="et-nav-title">Danh sách câu hỏi</div>
              <div className="et-nav-grid">
                {questions.map((q, i) => {
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
              </div>
              <div className="et-nav-legend">
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

  // ── BROWSE (unchanged light theme) ──
  return (
    <main className="min-h-screen bg-gray-100" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8 pb-20 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Kho đề thi luyện tập 📚</h1>
          <p className="text-sm text-gray-500">{allExams.length} đề — THPT Quốc gia · HSA · TSA</p>
        </div>

        {allExams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allExams.map(exam => (
              <ExamCard key={exam.id} exam={exam} onStart={handleStartExam} isSaved={savedExams.has(exam.id.toString())} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm text-gray-500 mb-4">Chưa có đề thi nào được đăng tải.</p>
          </div>
        )}
      </div>
    </main>
  );
}
