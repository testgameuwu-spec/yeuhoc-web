'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FileText, BookOpen, Clock, Pencil } from 'lucide-react';

export default function TeacherExamManagement({ showAlert }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: classrooms, error: classError } = await supabase
          .from('classrooms')
          .select('id, name')
          .eq('teacher_id', user.id);
        if (classError) throw classError;

        const classroomIds = (classrooms || []).map((cls) => cls.id);
        if (classroomIds.length === 0) {
          setExams([]);
          return;
        }

        const { data, error } = await supabase
          .from('classroom_exams')
          .select('*, classrooms(name)')
          .in('classroom_id', classroomIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setExams(data || []);
      } catch (err) {
        console.error('Fetch teacher exams error:', err);
        showAlert('Lỗi', 'Không thể tải danh sách đề thi.');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [showAlert]);

  if (loading) {
    return <div className="py-12 text-center text-white/50">Đang tải đề thi...</div>;
  }

  if (exams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
        <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/60 mb-2">Bạn chưa tạo đề thi nào.</p>
        <p className="text-sm text-white/40">Vào từng lớp học để tạo và giao đề cho học sinh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exams.map((exam) => {
        const questionCount = Array.isArray(exam.questions)
          ? exam.questions.filter((q) => q?.type !== 'TEXT').length
          : 0;
        return (
          <div key={exam.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-white truncate">{exam.title}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${exam.is_published ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>
                  {exam.is_published ? 'Đã xuất bản' : 'Nháp'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40 mt-1 flex-wrap">
                <span>{exam.classrooms?.name || 'Lớp không rõ'}</span>
                <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {exam.subject || 'Không rõ'}</span>
                <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> {questionCount} câu</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.time_limit || 45} phút</span>
              </div>
            </div>
            <Link
              href={`/teacher/classrooms/${exam.classroom_id}?tab=exams`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors no-underline shrink-0"
            >
              <Pencil className="w-4 h-4" /> Mở trong lớp
            </Link>
          </div>
        );
      })}
    </div>
  );
}
