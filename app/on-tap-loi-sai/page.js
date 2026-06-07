'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ExamSessionPage from '@/components/ExamSessionPage';

function VirtualExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examKey = searchParams.get('examKey') || 'THPT';
  const subject = searchParams.get('subject') || 'Toán';
  const sourceExamId = searchParams.get('sourceExamId') || 'all';
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
          .select('question_snapshot, context_snapshot')
          .eq('user_id', session.user.id)
          .eq('exam_key', examKey);
          
        if (examKey === 'THPT' && subject) {
          query = query.eq('subject', subject);
        }
        if (sourceExamId && sourceExamId !== 'all') {
          query = query.eq('exam_id', sourceExamId);
        }

        const { data, error } = await query;
        if (error) throw error;

        let results = data || [];
        // Shuffle ngẫu nhiên
        results.sort(() => 0.5 - Math.random());
        // Giới hạn số lượng
        if (limit) results = results.slice(0, limit);

        const questionsMap = new Map();

        results.forEach(entry => {
          const q = entry.question_snapshot;
          if (q) questionsMap.set(q.id, q);
          
          if (entry.context_snapshot) {
            const ctx = entry.context_snapshot;
            if (!questionsMap.has(ctx.id)) {
              questionsMap.set(ctx.id, ctx);
            }
          }
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
          id: 'virtual-mistakes',
          title: examTitle,
          subject: examKey === 'THPT' ? subject : 'Tổng hợp',
          examType: 'MISTAKES_REVIEW',
          duration: 0,
          questions: questions,
          allowReview: true,
          showQuestionLevel: false,
          antiCheatEnabled: false,
          isVirtual: true, // Cờ để bỏ qua insert attempt
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
  }, [examKey, subject, sourceExamId, limit, router]);

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
