'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bot,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Loader2,
  PencilLine,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import ErrorLogIcon from '@/components/ErrorLogIcon';
import { ErrorLogSaveModal } from '@/components/ErrorLogSaveModal';
import Navbar from '@/components/Navbar';
import QuestionCard from '@/components/QuestionCard';
import ContentWithInlineImage from '@/components/ContentWithInlineImage';
import { supabase } from '@/lib/supabase';
import { ERROR_LOG_REASONS, formatAnswerForDisplay, incrementErrorLogRetryCounts } from '@/lib/errorLogStore';
import { getEmptyAnswerForType, hasCompletedAnswer } from '@/lib/questionResult';

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

function getRetryCount(entry) {
  const count = Number(entry?.retry_count);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function getRetryBadgeText(entry) {
  const count = getRetryCount(entry);
  return count > 0 ? `${count} lượt` : 'Chưa làm lại';
}

function RetryQuestionOverlay({ entry, onClose, onRetryCounted }) {
  const question = useMemo(() => normalizeSnapshotQuestion(entry.question_snapshot, entry.correct_answer), [entry]);
  const context = entry.context_snapshot || null;
  const [answer, setAnswer] = useState(getEmptyAnswerForType(question.type));
  const [revealed, setRevealed] = useState(false);
  const [retryCounted, setRetryCounted] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiChatMounted, setAiChatMounted] = useState(false);
  const canReveal = hasCompletedAnswer(question, answer);

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

  const handleReveal = () => {
    setRevealed(true);
    if (retryCounted || !entry?.id) return;

    setRetryCounted(true);
    incrementErrorLogRetryCounts([entry.id])
      .then((rows) => {
        onRetryCounted?.(rows);
      })
      .catch((error) => {
        console.error('Increment error log retry count failed:', error);
      });
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
              <div className="practice-card-wrap error-log-retry-question">
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
              </div>

              <div className="practice-retry-actions mt-4">
                <div className="text-sm font-semibold text-gray-500 [html[data-theme=dark]_&]:text-white/60">
                  {revealed ? 'Bạn đang xem đáp án và lời giải của câu này.' : 'Làm lại câu hỏi, sau đó xem gợi ý hoặc xem đáp án khi đã hoàn thành.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openAIChat}
                    disabled={revealed}
                    className="practice-action-btn is-hint"
                  >
                    <Bot className="h-4 w-4" />
                    Xem gợi ý
                  </button>
                  {canReveal && !revealed && (
                    <button
                      type="button"
                      onClick={handleReveal}
                      className="practice-action-btn is-answer"
                    >
                      <Eye className="h-4 w-4" />
                      Xem đáp án
                    </button>
                  )}
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
          logSource="error_log_retry"
          logMetadata={{
            errorLogEntryId: entry.id,
            examKey: entry.exam_key,
            subject: entry.subject,
            sectionLabel: entry.section_label,
          }}
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
  const [unretriedOnly, setUnretriedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryEntry, setRetryEntry] = useState(null);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [deletingExamId, setDeletingExamId] = useState(null);
  const [editingReasonEntry, setEditingReasonEntry] = useState(null);
  const [savingReasonEntryId, setSavingReasonEntryId] = useState(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

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

  const sourceFilteredEntries = useMemo(() => {
    if (activeSourceExamId === 'all') return scopedEntries;
    return scopedEntries.filter((entry) => String(entry.exam_id) === activeSourceExamId);
  }, [activeSourceExamId, scopedEntries]);

  const filteredEntries = useMemo(() => (
    unretriedOnly
      ? sourceFilteredEntries.filter((entry) => getRetryCount(entry) === 0)
      : sourceFilteredEntries
  ), [sourceFilteredEntries, unretriedOnly]);

  const unretriedEntryCount = useMemo(() => (
    sourceFilteredEntries.filter((entry) => getRetryCount(entry) === 0).length
  ), [sourceFilteredEntries]);

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

  const handleUpdateEntryReason = useCallback(async ({ reason, note }) => {
    if (!editingReasonEntry?.id) return;

    const updatedAt = new Date().toISOString();
    const payload = {
      reason: reason || null,
      note: note?.trim() || null,
      updated_at: updatedAt,
    };

    setSavingReasonEntryId(editingReasonEntry.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('error_log_entries')
        .update(payload)
        .eq('id', editingReasonEntry.id)
        .eq('user_id', session.user.id)
        .select('id, reason, note, updated_at')
        .single();

      if (error) throw error;

      const updatedEntry = data || payload;
      setEntries((current) => current
        .map((entry) => (
          entry.id === editingReasonEntry.id
            ? {
              ...entry,
              reason: updatedEntry.reason,
              note: updatedEntry.note,
              updated_at: updatedEntry.updated_at || updatedAt,
            }
            : entry
        ))
        .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)));
      setEditingReasonEntry(null);
    } catch (error) {
      console.error('Update error log reason failed:', error);
      window.alert('Không lưu được nguyên nhân sai. Vui lòng thử lại.');
    } finally {
      setSavingReasonEntryId(null);
    }
  }, [editingReasonEntry, router]);

  const applyRetryCountUpdates = useCallback((rows = []) => {
    if (!rows.length) return;

    const updatesById = new Map(rows.map((row) => [row.id, row]));
    const applyUpdate = (entry) => {
      const update = updatesById.get(entry?.id);
      if (!update) return entry;

      return {
        ...entry,
        retry_count: update.retry_count,
        last_retried_at: update.last_retried_at,
        updated_at: update.updated_at || entry.updated_at,
      };
    };

    setEntries((current) => current.map(applyUpdate));
    setRetryEntry((current) => (current ? applyUpdate(current) : current));
  }, []);

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              disabled={filteredEntries.length === 0}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[var(--home-brand-primary)] px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-[var(--home-brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Tạo đề ôn tập
            </button>
            <button
              type="button"
              onClick={() => router.push('/phan-tich/')}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[var(--home-brand-border)] bg-white px-4 py-2.5 text-sm font-extrabold text-[var(--home-brand-primary)] shadow-sm transition-colors hover:bg-[var(--home-brand-soft)]"
            >
              Về phân tích
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
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
            <label className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-[var(--home-brand-border)] [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-800 [html[data-theme=dark]_&]:text-white">
              <input
                type="checkbox"
                checked={unretriedOnly}
                onChange={(event) => setUnretriedOnly(event.target.checked)}
                disabled={sourceFilteredEntries.length === 0}
                className="h-4 w-4 accent-[var(--home-brand-primary)] disabled:cursor-not-allowed"
              />
              <span>Chưa từng làm lại</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500 [html[data-theme=dark]_&]:bg-slate-900 [html[data-theme=dark]_&]:text-white/70">
                {unretriedEntryCount}
              </span>
            </label>
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
            <ErrorLogIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
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
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 [html[data-theme=dark]_&]:bg-slate-800 [html[data-theme=dark]_&]:text-white/70">
                          Câu {entry.question_number || '--'} · {getRetryBadgeText(entry)}
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
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-wider text-amber-700 [html[data-theme=dark]_&]:text-amber-200">Nguyên nhân sai</p>
                      <button
                        type="button"
                        onClick={() => setEditingReasonEntry(entry)}
                        disabled={isDeletingEntry || savingReasonEntryId === entry.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-extrabold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 [html[data-theme=dark]_&]:border-amber-300/30 [html[data-theme=dark]_&]:bg-amber-950/30 [html[data-theme=dark]_&]:text-amber-100"
                      >
                        {savingReasonEntryId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PencilLine className="h-3.5 w-3.5" />}
                        {entry.reason || entry.note ? 'Đổi nguyên nhân' : 'Nhập nguyên nhân'}
                      </button>
                    </div>
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
          onRetryCounted={applyRetryCountUpdates}
        />
      )}

      {editingReasonEntry && (
        <ErrorLogSaveModal
          isOpen={Boolean(editingReasonEntry)}
          question={normalizeSnapshotQuestion(editingReasonEntry.question_snapshot, editingReasonEntry.correct_answer)}
          initialReason={editingReasonEntry.reason || ''}
          initialNote={editingReasonEntry.note || ''}
          title={editingReasonEntry.reason || editingReasonEntry.note ? 'Đổi nguyên nhân sai' : 'Nhập nguyên nhân sai'}
          submitLabel="Lưu nguyên nhân"
          saving={savingReasonEntryId === editingReasonEntry.id}
          onClose={() => setEditingReasonEntry(null)}
          onSave={handleUpdateEntryReason}
        />
      )}

      {isConfigModalOpen && (
        <MistakesConfigModal
          maxQuestions={filteredEntries.length}
          onClose={() => setIsConfigModalOpen(false)}
          onStart={({ mode, limit }) => {
            setIsConfigModalOpen(false);
            const params = new URLSearchParams();
            params.set('examKey', activeExamKey);
            if (activeExamKey === 'THPT') params.set('subject', activeSubject);
            if (activeSourceExamId !== 'all') params.set('sourceExamId', activeSourceExamId);
            params.set('mode', mode);
            if (mode !== 'all') params.set('limit', limit);
            if (unretriedOnly) params.set('retryFilter', 'unretried');
            router.push(`/on-tap-loi-sai?${params.toString()}`);
          }}
        />
      )}
    </div>
  );
}

const REVIEW_MODE_OPTIONS = [
  { value: 'random', label: 'Ngẫu nhiên' },
  { value: 'oldest_due', label: 'Cũ nhất' },
  { value: 'all', label: 'Tất cả' },
];

function MistakesConfigModal({ maxQuestions, onClose, onStart }) {
  const [mode, setMode] = useState('random');
  const [limit, setLimit] = useState(20);
  const isAllMode = mode === 'all';
  const validLimit = isAllMode ? maxQuestions : Math.min(limit, maxQuestions, 50);
  const canStart = isAllMode ? maxQuestions > 0 : validLimit > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden [html[data-theme=dark]_&]:bg-slate-900">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-gray-900 [html[data-theme=dark]_&]:text-white">Cấu hình đề ôn tập</h2>
            <p className="text-sm text-gray-500 mt-1 [html[data-theme=dark]_&]:text-white/60">{maxQuestions} câu trong phạm vi đang lọc.</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 [html[data-theme=dark]_&]:text-white/80">Chế độ</label>
            <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1 [html[data-theme=dark]_&]:bg-slate-800">
              {REVIEW_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-extrabold transition-colors ${
                    mode === option.value
                      ? 'bg-white text-[var(--home-brand-primary)] shadow-sm [html[data-theme=dark]_&]:bg-slate-950'
                      : 'text-gray-500 hover:text-gray-800 [html[data-theme=dark]_&]:text-white/60 [html[data-theme=dark]_&]:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {!isAllMode && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 [html[data-theme=dark]_&]:text-white/80">Số lượng câu hỏi</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[10, 20, 30, 40, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLimit(num)}
                  disabled={num > maxQuestions}
                  className={`flex-1 min-w-[3rem] py-2 rounded-lg text-sm font-bold transition-colors ${
                    limit === num
                      ? 'bg-[var(--home-brand-primary)] text-white'
                      : num > maxQuestions
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max={Math.min(maxQuestions, 50)}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 1)}
                className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-center outline-none focus:border-[var(--home-brand-primary)]"
              />
              <span className="text-sm text-gray-500">Tối đa 50 câu / đề</span>
            </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => onStart({ mode, limit: validLimit })}
            disabled={!canStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--home-brand-primary)] text-white text-sm font-bold hover:bg-[var(--home-brand-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            Bắt đầu làm bài ({validLimit})
          </button>
        </div>
      </div>
    </div>
  );
}
