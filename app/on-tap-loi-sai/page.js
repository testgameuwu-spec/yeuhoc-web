'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ExamSessionPage from '@/components/ExamSessionPage';

const REVIEW_MODES = new Set(['random', 'oldest_due', 'all']);

function normalizeReviewMode(value) {
  return REVIEW_MODES.has(value) ? value : 'random';
}

function shuffleArray(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getEntryGroupKey(entry, index) {
  const question = entry.question_snapshot || {};
  const linkedTo = question.linkedTo || entry.context_snapshot?.id;

  if (linkedTo) {
    return `linked:${entry.exam_id || ''}:${linkedTo}`;
  }

  return `single:${entry.exam_id || ''}:${question.id || index}`;
}

function compareEntryOrder(a, b) {
  const numberA = Number(a.entry.question_number);
  const numberB = Number(b.entry.question_number);
  const hasNumberA = Number.isFinite(numberA);
  const hasNumberB = Number.isFinite(numberB);

  if (hasNumberA && hasNumberB && numberA !== numberB) return numberA - numberB;
  if (hasNumberA !== hasNumberB) return hasNumberA ? -1 : 1;
  return a.index - b.index;
}

function countRealEntries(group) {
  return group.items.filter(({ entry }) => entry.question_snapshot?.type !== 'TEXT').length;
}

function getEntryDueTime(entry) {
  const time = Date.parse(entry.last_retried_at || entry.created_at || entry.updated_at || '');
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function getGroupedEntries(entries) {
  const groupsByKey = new Map();

  entries.forEach((entry, index) => {
    const key = getEntryGroupKey(entry, index);
    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push({ entry, index });
  });

  return Array.from(groupsByKey.values()).map((items) => {
    const sortedItems = items.sort(compareEntryOrder);
    return {
      items: sortedItems,
      index: Math.min(...sortedItems.map(({ index }) => index)),
      dueTime: Math.min(...sortedItems.map(({ entry }) => getEntryDueTime(entry))),
    };
  });
}

function flattenGroups(groups) {
  return groups.flatMap((group) => group.items.map(({ entry }) => entry));
}

function selectEntriesKeepingLinkedGroups(entries, limit, mode = 'random') {
  const normalizedLimit = Number(limit);
  const maxRealQuestions = Number.isFinite(normalizedLimit) && normalizedLimit > 0 ? normalizedLimit : null;
  const groups = getGroupedEntries(entries);
  const orderedGroups = mode === 'oldest_due'
    ? [...groups].sort((a, b) => a.dueTime - b.dueTime || a.index - b.index)
    : mode === 'all'
      ? [...groups].sort((a, b) => a.index - b.index)
      : shuffleArray(groups);

  if (mode === 'all' || !maxRealQuestions) {
    return flattenGroups(orderedGroups);
  }

  const selected = [];
  let selectedRealCount = 0;

  for (const group of orderedGroups) {
    if (selectedRealCount >= maxRealQuestions) break;

    selected.push(...group.items);
    selectedRealCount += countRealEntries(group);
  }

  return selected.map(({ entry }) => entry);
}

function appendQuestionSnapshot(questionsMap, snapshot, extra = {}) {
  if (!snapshot?.id || questionsMap.has(snapshot.id)) return;
  questionsMap.set(snapshot.id, { ...snapshot, ...extra });
}

function getSelectionKey(entries) {
  const source = entries.map((entry) => entry.id).join('|');
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36) || 'empty';
}

function VirtualExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examKey = searchParams.get('examKey') || 'THPT';
  const subject = searchParams.get('subject') || 'Toán';
  const sourceExamId = searchParams.get('sourceExamId') || 'all';
  const mode = normalizeReviewMode(searchParams.get('mode'));
  const retryFilter = searchParams.get('retryFilter') || '';
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
  const [loading, setLoading] = useState(true);
  const [virtualExam, setVirtualExam] = useState(null);
  
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      
      try {
        let query = supabase
          .from('error_log_entries')
          .select('id, exam_id, question_number, question_snapshot, context_snapshot, retry_count, last_retried_at, created_at, updated_at')
          .eq('user_id', session.user.id)
          .eq('exam_key', examKey)
          .order('updated_at', { ascending: false });
          
        if (examKey === 'THPT' && subject) {
          query = query.eq('subject', subject);
        }
        if (sourceExamId && sourceExamId !== 'all') {
          query = query.eq('exam_id', sourceExamId);
        }
        if (retryFilter === 'unretried') {
          query = query.eq('retry_count', 0);
        }

        const { data, error } = await query;
        if (error) throw error;

        const results = selectEntriesKeepingLinkedGroups(data || [], limit, mode);

        const questionsMap = new Map();

        results.forEach(entry => {
          appendQuestionSnapshot(questionsMap, entry.context_snapshot);
          appendQuestionSnapshot(questionsMap, entry.question_snapshot, {
            errorLogEntryId: entry.id,
          });
        });

        const questions = Array.from(questionsMap.values()).map(snapshot => ({
          id: snapshot.id,
          type: snapshot.type,
          content: snapshot.content || '',
          options: snapshot.options || [],
          answer: snapshot.answer || null,
          solution: snapshot.solution || null,
          image: snapshot.image || null,
          linkedTo: snapshot.linkedTo || null,
          statements: snapshot.statements || [],
          tfSubQuestions: snapshot.tfSubQuestions || null,
          errorLogEntryId: snapshot.errorLogEntryId || null,
        }));

        const realQuestionsCount = questions.filter(q => q.type !== 'TEXT').length;

        if (realQuestionsCount === 0) {
          alert('Không tìm thấy câu hỏi lỗi sai nào!');
          router.push('/error-log');
          return;
        }

        const examTitle = examKey === 'THPT' 
          ? `Ôn tập lỗi sai - ${examKey} môn ${subject}`
          : `Ôn tập lỗi sai - ${examKey}`;

        // Tạo virtual exam
        setVirtualExam({
          id: `virtual-mistakes-${getSelectionKey(results)}`,
          title: examTitle,
          subject: examKey === 'THPT' ? subject : 'Tổng hợp',
          examType: 'MISTAKES_REVIEW',
          duration: 0,
          questions: questions,
          allowReview: true,
          showQuestionLevel: false,
          antiCheatEnabled: false,
          isVirtual: true, // Cờ để bỏ qua insert attempt
          isVirtualMistakesReview: true,
        });
      } catch (err) {
        console.error(err);
        alert('Lỗi tải dữ liệu ôn tập');
        router.push('/error-log');
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, [examKey, subject, sourceExamId, mode, retryFilter, limit, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--home-brand-primary)]" />
          Đang tạo đề ôn tập...
        </div>
      </div>
    );
  }

  if (!virtualExam) return null;

  return <ExamSessionPage virtualExam={virtualExam} />;
}

export default function MistakesReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <VirtualExamContent />
    </Suspense>
  );
}
