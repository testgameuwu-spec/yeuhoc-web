'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Trophy,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import QuestionCard from '@/components/QuestionCard';
import ReportModal, { REPORT_REASONS } from '@/components/QuestionReportModal';
import { supabase } from '@/lib/supabase';
import { getEmptyAnswerForType, getQuestionResultState } from '@/lib/questionResult';
import { getTsaSectionIndex, isTsaExam, TSA_SECTIONS } from '@/lib/examScoring';

function mapExamQuestions(examData) {
  const questions = Array.isArray(examData.questions)
    ? [...examData.questions].sort((a, b) => {
        const orderA = Number.isFinite(Number(a.order_index)) ? Number(a.order_index) : 0;
        const orderB = Number.isFinite(Number(b.order_index)) ? Number(b.order_index) : 0;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.id || '').localeCompare(String(b.id || ''));
      })
    : [];

  return {
    ...examData,
    questions: questions.map(q => {
      const tfSubs = q.tf_sub_questions || undefined;
      const stmts = q.statements || undefined;
      let answer = q.answer;
        if (q.type === 'TF' && tfSubs && Array.isArray(tfSubs)) {
          const obj = {};
          tfSubs.forEach((sub, i) => {
            const letter = i < 26 ? String.fromCharCode(97 + i) : String(i + 1);
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
    }),
  };
}

function formatDuration(seconds) {
  const totalSeconds = Number(seconds) || 0;
  return `${Math.floor(totalSeconds / 60)}p ${totalSeconds % 60}s`;
}

function isAnswerCorrect(question, answers) {
  const fallbackAnswer = getEmptyAnswerForType(question.type);
  return getQuestionResultState(question, answers?.[question.id] ?? fallbackAnswer) === 'correct';
}

export default function AttemptHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId;

  const [user, setUser] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [reportModal, setReportModal] = useState({ isOpen: false, question: null });

  const showAlert = useCallback((title, message) => {
    setNotice({ title, message });
  }, []);

  const handleOpenReport = useCallback((question) => {
    if (!user?.id) {
      showAlert('Cần đăng nhập', 'Vui lòng đăng nhập để báo cáo câu hỏi.');
      return;
    }
    setReportModal({ isOpen: true, question });
  }, [showAlert, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          if (isMounted) {
            setError('Vui lòng đăng nhập để xem lịch sử làm bài.');
          }
          router.replace('/login/');
          return;
        }

        const { data: attemptData, error: attemptError } = await supabase
          .from('exam_attempts')
          .select('*, exams(title, subject)')
          .eq('id', attemptId)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (attemptError) throw attemptError;
        if (!attemptData) {
          throw new Error('Không tìm thấy lịch sử làm bài này.');
        }

        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*, questions(*)')
          .eq('id', attemptData.exam_id)
          .order('order_index', { referencedTable: 'questions', ascending: true })
          .single();

        if (examError) throw examError;

        if (isMounted) {
          setUser(session.user);
          setAttempt(attemptData);
          setExam(mapExamQuestions(examData));
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Không thể tải chi tiết bài làm.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [attemptId, router]);

  const answers = useMemo(() => attempt?.user_answers || {}, [attempt?.user_answers]);
  const examTitle = exam?.title || attempt?.exams?.title || 'Chi tiết bài làm';
  const realQuestions = useMemo(() => (
    (exam?.questions || []).filter((question) => question.type !== 'TEXT')
  ), [exam?.questions]);
  const correctCount = useMemo(() => (
    realQuestions.reduce((count, question) => count + (isAnswerCorrect(question, answers) ? 1 : 0), 0)
  ), [answers, realQuestions]);
  const unansweredCount = useMemo(() => (
    realQuestions.reduce((count, question) => {
      const resultState = getQuestionResultState(question, answers?.[question.id] ?? getEmptyAnswerForType(question.type));
      return count + (resultState === 'unanswered' ? 1 : 0);
    }, 0)
  ), [answers, realQuestions]);

  const scrollToQuestion = useCallback((index) => {
    const el = document.getElementById(`history-q-card-${index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scoreText = useMemo(() => {
    const score = Number(attempt?.score) || 0;
    return isTsaExam(exam) ? `${Math.min(score, 100).toFixed(0)}/100` : score.toFixed(1);
  }, [attempt?.score, exam]);

  const renderNavButtons = useCallback((renderBtn) => {
    if (isTsaExam(exam)) {
      return (
        <div className="flex flex-col gap-4">
          {TSA_SECTIONS.map((section, sectionIndex) => {
            const entries = realQuestions
              .map((question, index) => ({ question, index }))
              .filter(({ index }) => getTsaSectionIndex(index) === sectionIndex);
            if (!entries.length) return null;
            return (
              <div key={section.key}>
                <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">{section.name}</div>
                <div className="et-nav-grid">{entries.map(({ question, index }) => renderBtn(question, index))}</div>
              </div>
            );
          })}
        </div>
      );
    }

    if (exam?.exam_type !== 'THPT') {
      return (
        <div className="et-nav-grid">
          {realQuestions.map((question, index) => renderBtn(question, index))}
        </div>
      );
    }

    const part1 = [];
    const partMA = [];
    const part2 = [];
    const part3 = [];
    const part4 = [];
    realQuestions.forEach((question, index) => {
      if (question.type === 'MCQ') part1.push({ question, index });
      else if (question.type === 'MA') partMA.push({ question, index });
      else if (question.type === 'TF') part2.push({ question, index });
      else if (question.type === 'SA') part3.push({ question, index });
      else if (question.type === 'DRAG') part4.push({ question, index });
    });

    return (
      <div className="flex flex-col gap-4">
        {part1.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần I</div>
            <div className="et-nav-grid">{part1.map(({ question, index }) => renderBtn(question, index))}</div>
          </div>
        )}
        {partMA.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Chọn nhiều đáp án</div>
            <div className="et-nav-grid">{partMA.map(({ question, index }) => renderBtn(question, index))}</div>
          </div>
        )}
        {part2.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần II</div>
            <div className="et-nav-grid">{part2.map(({ question, index }) => renderBtn(question, index))}</div>
          </div>
        )}
        {part3.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phần III</div>
            <div className="et-nav-grid">{part3.map(({ question, index }) => renderBtn(question, index))}</div>
          </div>
        )}
        {part4.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Kéo thả</div>
            <div className="et-nav-grid">{part4.map(({ question, index }) => renderBtn(question, index))}</div>
          </div>
        )}
      </div>
    );
  }, [exam, realQuestions]);

  const hasResultNav = !loading && !error && attempt && exam && realQuestions.length > 0;

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
      <Navbar />

      <div className={`et-screen ${(isSidebarCollapsed || !hasResultNav) ? 'sidebar-hidden' : ''}`} style={{ position: 'relative' }}>
        <div className="et-main">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <button
              type="button"
              onClick={() => router.push('/profile/?tab=history')}
              className="mb-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:bg-[var(--home-brand-soft)] hover:text-[var(--home-brand-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại lịch sử
            </button>

            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
                <Loader2 className="w-10 h-10 text-[var(--home-brand-primary)] animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">Đang tải chi tiết bài làm...</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h1 className="text-lg font-bold text-gray-900 mb-1">Không thể mở chi tiết bài làm</h1>
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            ) : !attempt || !exam ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h1 className="text-lg font-bold text-gray-900 mb-1">Không thể mở chi tiết bài làm</h1>
                <p className="text-sm text-gray-500">Không tìm thấy dữ liệu bài làm.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--home-brand-primary)] mb-2 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Lịch sử làm bài
                      </p>
                      <h1 className="text-xl sm:text-2xl font-black text-gray-950">{examTitle}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {exam?.subject || attempt?.exams?.subject || 'Không rõ môn'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(attempt.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:min-w-[300px]">
                      <div className="rounded-xl border border-[var(--home-brand-border)] bg-[var(--home-brand-soft)] p-3 text-center">
                        <Trophy className="w-4 h-4 text-[var(--home-brand-primary)] mx-auto mb-1" />
                        <p className="text-[11px] font-semibold text-[var(--home-brand-primary)] uppercase">Điểm</p>
                        <p className="text-lg font-black text-[var(--home-brand-hover)]">{scoreText}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <p className="text-[11px] font-semibold text-emerald-600 uppercase">Đúng</p>
                        <p className="text-lg font-black text-emerald-700">{attempt.correct_answers}/{attempt.total_questions}</p>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                        <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-[11px] font-semibold text-amber-600 uppercase">Thời gian</p>
                        <p className="text-sm font-black text-amber-700">{formatDuration(attempt.time_spent)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {realQuestions.length > 0 ? (
                  <div className="space-y-6">
                    {realQuestions.map((question, index) => (
                      <div key={question.id || index} id={`history-q-card-${index}`}>
                        <QuestionCard
                          question={question}
                          index={index}
                          selectedAnswer={answers[question.id] ?? getEmptyAnswerForType(question.type)}
                          onAnswerChange={() => {}}
                          onReport={handleOpenReport}
                          showResult
                          disabled
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    <p className="text-sm text-gray-500">Không có dữ liệu câu hỏi cho bài làm này.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {hasResultNav && isSidebarCollapsed && (
          <button className="et-sidebar-toggle desktop-only" onClick={() => setIsSidebarCollapsed(false)} title="Mở danh sách câu hỏi" aria-label="Mở danh sách câu hỏi">
            <span className="et-sidebar-toggle-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="15 18 9 12 15 6"></polyline></svg>
            </span>
          </button>
        )}

        {hasResultNav && (
          <div className={`et-sidebar desktop-only ${isSidebarCollapsed ? 'et-sidebar-collapsed' : ''}`}>
            <div className="flex justify-between items-center px-[17px] py-4 border-b border-gray-100">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Chi tiết bài làm</div>
              <button onClick={() => setIsSidebarCollapsed(true)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600" title="Đóng panel">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[var(--home-brand-soft)] rounded-xl p-3 m-[17px] mb-2">
              <div>
                <div className="text-xl font-black text-[var(--home-brand-primary)]">{correctCount}/{realQuestions.length}</div>
                <div className="text-[10px] text-[var(--home-brand-primary)] font-bold uppercase tracking-wider mt-1">Đúng</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-amber-600">{unansweredCount}</div>
                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1">Chưa làm</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-[var(--home-brand-primary)]">{scoreText}</div>
                <div className="text-[10px] text-[var(--home-brand-primary)] font-bold uppercase tracking-wider mt-1">Điểm</div>
              </div>
            </div>

            <div className="et-nav-block">
              <div className="et-nav-title">Danh sách câu hỏi</div>
              {renderNavButtons((question, index) => {
                const resultState = getQuestionResultState(question, answers?.[question.id] ?? getEmptyAnswerForType(question.type));
                return (
                  <button
                    key={question.id || index}
                    className={`et-nav-btn ${resultState}`}
                    onClick={() => scrollToQuestion(index)}
                  >
                    {index + 1}
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
        )}
      </div>

      {hasResultNav && (
        <>
          <button className="et-fab mobile-only" onClick={() => setIsDrawerOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>

          <div className={`et-drawer-overlay mobile-only ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />
          <div className={`et-drawer mobile-only flex flex-col ${isDrawerOpen ? 'open' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-gray-800 uppercase text-xs tracking-wider">Chi tiết bài làm</div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-[var(--home-brand-soft)] rounded-xl p-4 mb-5">
              <div>
                <div className="text-2xl font-black text-[var(--home-brand-primary)]">{correctCount}/{realQuestions.length}</div>
                <div className="text-xs text-[var(--home-brand-primary)] font-bold uppercase tracking-wider mt-1">Câu đúng</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-amber-600">{unansweredCount}</div>
                <div className="text-xs text-amber-500 font-bold uppercase tracking-wider mt-1">Chưa làm</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[var(--home-brand-primary)]">{scoreText}</div>
                <div className="text-xs text-[var(--home-brand-primary)] font-bold uppercase tracking-wider mt-1">Điểm số</div>
              </div>
            </div>

            <div className="mb-4">
              {renderNavButtons((question, index) => {
                const resultState = getQuestionResultState(question, answers?.[question.id] ?? getEmptyAnswerForType(question.type));
                return (
                  <button
                    key={question.id || index}
                    className={`et-nav-btn ${resultState}`}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      scrollToQuestion(index);
                    }}
                  >
                    {index + 1}
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
        </>
      )}

      {notice && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-[90%] max-w-sm p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{notice.title}</h3>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{notice.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--home-brand-primary)] hover:bg-[var(--home-brand-hover)] transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModal.isOpen && (
        <ReportModal
          reportModal={reportModal}
          setReportModal={setReportModal}
          user={user}
          activeExam={exam}
          showAlert={showAlert}
          reportReasons={REPORT_REASONS}
        />
      )}
    </div>
  );
}
