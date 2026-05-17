'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import QuestionCard from '@/components/QuestionCard';
import ContentWithInlineImage from '@/components/ContentWithInlineImage';
import { supabase } from '@/lib/supabase';
import { ERROR_LOG_REASONS, formatAnswerForDisplay } from '@/lib/errorLogStore';
import { getEmptyAnswerForType, hasSubmittedAnswer } from '@/lib/questionResult';

const PracticeAIChatbox = dynamic(() => import('@/components/PracticeAIChatbox'), { ssr: false });

const EXAM_TABS = [
  { key: 'THPT', label: 'Trung học phổ thông quốc gia' },
  { key: 'HSA', label: 'HSA' },
  { key: 'TSA', label: 'TSA' },
];

const THPT_SUBJECT_TABS = ['Toán', 'Lý', 'Hóa'];

function getReasonLabel(reason) {
  if (!reason) return 'Chưa nhập';
  return ERROR_LOG_REASONS.find((item) => item.value === reason)?.label || reason;
}

function normalizeSnapshotQuestion(snapshot = {}, fallbackAnswer = null) {
  return {
    id: snapshot.id,
    type: snapshot.type,
    content: snapshot.content || '',
    options: snapshot.options || [],
    answer: snapshot.answer ?? fallbackAnswer,
    solution: snapshot.solution || null,
    image: snapshot.image || null,
    linkedTo: snapshot.linkedTo || null,
    statements: snapshot.statements || [],
    tfSubQuestions: snapshot.tfSubQuestions || null,
  };
}

function formatUpdatedAt(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getExamTitle(entry) {
  return entry.exams?.title || entry.exam_title || 'Đề thi';
}

function RetryQuestionOverlay({ entry, onClose }) {
  const question = useMemo(() => normalizeSnapshotQuestion(entry.question_snapshot, entry.correct_answer), [entry]);
  const context = entry.context_snapshot || null;
  const [answer, setAnswer] = useState(getEmptyAnswerForType(question.type));
  const [revealed, setRevealed] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiChatMounted, setAiChatMounted] = useState(false);
  const canReveal = hasSubmittedAnswer(question, answer);

  const aiQuestionData = {
    exam: {
      id: entry.exam_id,
      title: entry.exams?.title || 'Nhật ký lỗi',
      subject: entry.subject,
      examType: entry.exam_key,
    },
    context: context ? {
      id: context.id,
      content: context.content,
      image: context.image || null,
    } : null,
    question: {
      id: question.id,
      type: question.type,
      content: question.content,
      options: question.options || [],
      statements: question.statements || [],
      answer: question.answer,
      solution: question.solution,
      image: question.image || null,
    },
  };

  const openAIChat = () => {
    setAiChatMounted(true);
    setIsAIChatOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-black/45 backdrop-blur-sm">
      <div className="absolute inset-0 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-900">
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            {context && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-800">
                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-700 [html[data-theme=dark]_&]:text-indigo-200">
                  <BookOpen className="h-4 w-4" />
                  Ngữ cảnh
                </div>
                <ContentWithInlineImage
                  text={context.content || ''}
                  image={context.image || null}
                  alt="Ngữ cảnh câu hỏi"
                  className="text-sm leading-relaxed text-gray-700 [html[data-theme=dark]_&]:text-white/80"
                  imageWrapperClassName="mt-3"
                  imageClassName="max-h-[360px] w-auto max-w-full rounded-xl object-contain"
                />
              </div>
            )}

            <div className={`${context ? '' : 'lg:col-span-2'} error-log-retry-shell`}>
              <div className="error-log-retry-header">
                <div className="min-w-0">
                  <p className="error-log-retry-eyebrow">Làm lại từ Nhật ký lỗi</p>
                  <h2 className="error-log-retry-title">
                    Câu {entry.question_number || '--'} · {entry.section_label || entry.subject || 'Chưa phân loại'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="error-log-retry-close"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <QuestionCard
                question={question}
                index={(entry.question_number || 1) - 1}
                selectedAnswer={answer}
                onAnswerChange={(value) => {
                  if (!revealed) setAnswer(value);
                }}
                showResult={revealed}
                disabled={revealed}
                preloadImages
              />

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-gray-500 [html[data-theme=dark]_&]:text-white/60">
                  {revealed ? 'Bạn đang xem đáp án và lời giải của câu này.' : 'Làm lại câu hỏi, sau đó xem đáp án hoặc hỏi gợi ý AI.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openAIChat}
                    disabled={revealed}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 [html[data-theme=dark]_&]:border-violet-300/40 [html[data-theme=dark]_&]:bg-slate-900 [html[data-theme=dark]_&]:text-violet-200"
                  >
                    <Sparkles className="h-4 w-4" />
                    Gợi ý AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    disabled={!canReveal || revealed}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--home-brand-primary)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--home-brand-hover)] disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Xem đáp án
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {aiChatMounted && (
        <PracticeAIChatbox
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          questionKey={`error-log-${entry.id}-${question.id}`}
          questionData={aiQuestionData}
          examId={entry.exam_id}
          questionId={question.id || ''}
          questionNumber={entry.question_number || null}
        />
      )}
    </div>
  );
}

export default function ErrorLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [activeExamKey, setActiveExamKey] = useState('THPT');
  const [activeSubject, setActiveSubject] = useState('Toán');
  const [activeSourceExamId, setActiveSourceExamId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryEntry, setRetryEntry] = useState(null);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [deletingExamId, setDeletingExamId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEntries() {
      setLoading(true);
      setLoadError('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('error_log_entries')
        .select('*, exams(title, subject, exam_type, year)')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setLoadError('Không tải được nhật ký lỗi. Vui lòng thử lại sau.');
        setEntries([]);
      } else {
        setEntries(data || []);
      }

      setLoading(false);
    }

    loadEntries();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.push('/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const countsByExam = useMemo(() => (
    entries.reduce((counts, entry) => {
      counts[entry.exam_key] = (counts[entry.exam_key] || 0) + 1;
      return counts;
    }, {})
  ), [entries]);

  const scopedEntries = useMemo(() => (
    entries.filter((entry) => {
      if (entry.exam_key !== activeExamKey) return false;
      if (activeExamKey === 'THPT') return entry.subject === activeSubject;
      return true;
    })
  ), [activeExamKey, activeSubject, entries]);

  const sourceExamOptions = useMemo(() => {
    const exams = new Map();

    scopedEntries.forEach((entry) => {
      const id = String(entry.exam_id || '');
      if (!id) return;

      const existing = exams.get(id);
      exams.set(id, {
        id,
        title: getExamTitle(entry),
        subject: entry.exams?.subject || entry.subject || '',
        examType: entry.exams?.exam_type || entry.exam_key || '',
        year: entry.exams?.year || '',
        count: (existing?.count || 0) + 1,
      });
    });

    return Array.from(exams.values());
  }, [scopedEntries]);

  const filteredEntries = useMemo(() => {
    if (activeSourceExamId === 'all') return scopedEntries;
    return scopedEntries.filter((entry) => String(entry.exam_id) === activeSourceExamId);
  }, [activeSourceExamId, scopedEntries]);

  const activeSourceExam = useMemo(() => (
    sourceExamOptions.find((exam) => exam.id === activeSourceExamId) || null
  ), [activeSourceExamId, sourceExamOptions]);

  const thptCounts = useMemo(() => (
    THPT_SUBJECT_TABS.reduce((counts, subject) => {
      counts[subject] = entries.filter((entry) => entry.exam_key === 'THPT' && entry.subject === subject).length;
      return counts;
    }, {})
  ), [entries]);

  const handleExamTabChange = useCallback((examKey) => {
    setActiveExamKey(examKey);
    setActiveSourceExamId('all');
    if (examKey === 'THPT') setActiveSubject('Toán');
  }, []);

  const handleSubjectChange = useCallback((subject) => {
    setActiveSubject(subject);
    setActiveSourceExamId('all');
  }, []);

  const handleDeleteEntry = useCallback(async (entry) => {
    if (!entry?.id) return;
    const confirmed = window.confirm('Xóa câu này khỏi Nhật ký lỗi?');
    if (!confirmed) return;

    setDeletingEntryId(entry.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('error_log_entries')
        .delete()
        .eq('id', entry.id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setRetryEntry((current) => (current?.id === entry.id ? null : current));
    } catch (error) {
      console.error('Delete error log entry failed:', error);
      window.alert('Không xóa được câu khỏi Nhật ký lỗi. Vui lòng thử lại.');
    } finally {
      setDeletingEntryId(null);
    }
  }, [router]);

  const handleDeleteActiveExam = useCallback(async () => {
    if (!activeSourceExam) return;
    const confirmed = window.confirm(`Xóa ${activeSourceExam.count} câu Nhật ký lỗi của đề "${activeSourceExam.title}"?`);
    if (!confirmed) return;

    setDeletingExamId(activeSourceExam.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('error_log_entries')
        .delete()
        .eq('user_id', session.user.id)
        .eq('exam_id', activeSourceExam.id);

      if (error) throw error;

      setEntries((current) => current.filter((entry) => String(entry.exam_id) !== activeSourceExam.id));
      setRetryEntry((current) => (current && String(current.exam_id) === activeSourceExam.id ? null : current));
      setActiveSourceExamId('all');
    } catch (error) {
      console.error('Delete error log exam failed:', error);
      window.alert('Không xóa được Nhật ký lỗi của đề này. Vui lòng thử lại.');
    } finally {
      setDeletingExamId(null);
    }
  }, [activeSourceExam, router]);

  return (
    <div className="home-page min-h-screen bg-slate-50 text-slate-950" style={{ fontFamily: 'var(--font-be-vietnam), system-ui, sans-serif' }}>
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Nhật ký lỗi</h1>
            <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-slate-500">
              Lưu lại câu sai hoặc chưa làm để ôn đúng điểm yếu, xem đáp án đã chọn, đáp án đúng và làm lại với gợi ý AI.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/phan-tich/')}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[var(--home-brand-border)] bg-white px-4 py-2.5 text-sm font-extrabold text-[var(--home-brand-primary)] shadow-sm transition-colors hover:bg-[var(--home-brand-soft)]"
          >
            Về phân tích
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          {EXAM_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleExamTabChange(tab.key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                activeExamKey === tab.key
                  ? 'bg-[var(--home-brand-primary)] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-[var(--home-brand-soft)] hover:text-[var(--home-brand-primary)]'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-80">{countsByExam[tab.key] || 0}</span>
            </button>
          ))}
        </div>

        {activeExamKey === 'THPT' && (
          <div className="mb-6 flex flex-wrap gap-2">
            {THPT_SUBJECT_TABS.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => handleSubjectChange(subject)}
                className={`rounded-xl border px-4 py-2 text-sm font-extrabold transition-colors ${
                  activeSubject === subject
                    ? 'border-[var(--home-brand-primary)] bg-[var(--home-brand-soft)] text-[var(--home-brand-primary)]'
                    : 'border-gray-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {subject}
                <span className="ml-2 text-xs opacity-70">{thptCounts[subject] || 0}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--home-brand-primary)]">
              <Filter className="h-4 w-4" />
              Lọc theo đề
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500 [html[data-theme=dark]_&]:text-white/60">
              Chỉ hiện các đề đã có câu được lưu trong Nhật ký lỗi.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[420px]">
              <select
                value={activeSourceExamId}
                onChange={(event) => setActiveSourceExamId(event.target.value)}
                disabled={sourceExamOptions.length === 0}
                className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-slate-50 px-4 pr-10 text-sm font-bold text-slate-800 outline-none transition-colors hover:border-[var(--home-brand-border)] focus:border-[var(--home-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60 [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-800 [html[data-theme=dark]_&]:text-white"
              >
                <option value="all">Tất cả đề đã lưu ({scopedEntries.length})</option>
                {sourceExamOptions.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {activeSourceExam && (
              <button
                type="button"
                onClick={handleDeleteActiveExam}
                disabled={deletingExamId === activeSourceExam.id}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 [html[data-theme=dark]_&]:border-red-300/30 [html[data-theme=dark]_&]:bg-red-950/30 [html[data-theme=dark]_&]:text-red-200"
              >
                {deletingExamId === activeSourceExam.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Xóa đề này
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--home-brand-primary)]" />
              Đang tải nhật ký lỗi...
            </div>
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {loadError}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
            <BookMarked className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h2 className="text-lg font-extrabold text-slate-900">Chưa có câu nào trong tab này</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Khi làm bài hoặc ôn luyện, bấm nút lưu cạnh nút báo cáo để đưa câu vào nhật ký lỗi.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEntries.map((entry) => {
              const question = normalizeSnapshotQuestion(entry.question_snapshot, entry.correct_answer);
              const selectedText = formatAnswerForDisplay(question, entry.selected_answer);
              const preview = question.content?.replace(/\s+/g, ' ').trim() || '(Không có nội dung câu hỏi)';
              const examTitle = getExamTitle(entry);
              const examMeta = [
                entry.exams?.exam_type || entry.exam_key,
                entry.exams?.subject || entry.subject,
                entry.exams?.year,
              ].filter(Boolean).join(' · ');
              const isDeletingEntry = deletingEntryId === entry.id;

              return (
                <article key={entry.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[var(--home-brand-border)] hover:shadow-md">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--home-brand-soft)] px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--home-brand-primary)]">
                          {entry.exam_key}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {entry.subject || 'Chưa phân loại'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          Câu {entry.question_number || '--'}
                        </span>
                      </div>
                      <h2 className="line-clamp-2 text-base font-extrabold leading-relaxed text-slate-950">{preview}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>{examTitle}</span>
                        <span>·</span>
                        <span>{entry.section_label || 'Chưa phân loại'}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatUpdatedAt(entry.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setRetryEntry(entry)}
                        disabled={isDeletingEntry}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--home-brand-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--home-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Làm lại
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry)}
                        disabled={isDeletingEntry}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 [html[data-theme=dark]_&]:border-red-300/30 [html[data-theme=dark]_&]:bg-red-950/30 [html[data-theme=dark]_&]:text-red-200"
                      >
                        {isDeletingEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 [html[data-theme=dark]_&]:border-blue-300/20 [html[data-theme=dark]_&]:bg-blue-950/30">
                    <p className="mb-1 text-xs font-black uppercase tracking-wider text-blue-600 [html[data-theme=dark]_&]:text-blue-200">Đề xuất hiện</p>
                    <p className="text-sm font-extrabold text-blue-950 [html[data-theme=dark]_&]:text-blue-50">{examTitle}</p>
                    {examMeta && (
                      <p className="mt-1 text-xs font-semibold text-blue-700 [html[data-theme=dark]_&]:text-blue-200/80">{examMeta}</p>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="mb-1 text-xs font-black uppercase tracking-wider text-slate-400">Nội dung/Phần câu hỏi</p>
                      <p className="text-sm font-bold text-slate-700">{entry.section_label || entry.subject || 'Chưa phân loại'}</p>
                    </div>
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                      <p className="mb-1 text-xs font-black uppercase tracking-wider text-rose-600 [html[data-theme=dark]_&]:text-rose-200">Đáp án bạn đã chọn</p>
                      <p className="text-sm font-bold text-rose-800 [html[data-theme=dark]_&]:text-rose-50">{selectedText}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="mb-1 text-xs font-black uppercase tracking-wider text-amber-700 [html[data-theme=dark]_&]:text-amber-200">Nguyên nhân sai</p>
                    <p className="text-sm font-bold text-amber-900 [html[data-theme=dark]_&]:text-amber-50">
                      {getReasonLabel(entry.reason)}
                      {entry.note ? <span className="font-semibold"> · {entry.note}</span> : null}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {retryEntry && (
        <RetryQuestionOverlay
          entry={retryEntry}
          onClose={() => setRetryEntry(null)}
        />
      )}
    </div>
  );
}
