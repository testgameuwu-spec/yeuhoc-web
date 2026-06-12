'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, Activity, ArrowRight } from 'lucide-react';

export default function TeacherOverview({ onNavigate }) {
  const [stats, setStats] = useState({
    classrooms: 0,
    students: 0,
    exams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch classrooms count
        const { count: classCount } = await supabase
          .from('classrooms')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id);

        // Fetch total unique approved students in these classrooms
        // For simplicity, we just count all approved classroom_members for this teacher's classrooms
        const { data: classIds } = await supabase.from('classrooms').select('id').eq('teacher_id', user.id);
        let studentsCount = 0;
        let examsCount = 0;

        if (classIds && classIds.length > 0) {
          const ids = classIds.map(c => c.id);
          const { count: sCount } = await supabase
            .from('classroom_members')
            .select('*', { count: 'exact', head: true })
            .in('classroom_id', ids)
            .eq('status', 'approved');
          studentsCount = sCount || 0;

          const { count: eCount } = await supabase
            .from('classroom_exams')
            .select('*', { count: 'exact', head: true })
            .in('classroom_id', ids);
          examsCount = eCount || 0;
        }

        setStats({
          classrooms: classCount || 0,
          students: studentsCount,
          exams: examsCount,
        });
      } catch (err) {
        console.error('Lỗi tải thống kê giáo viên:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Xin chào, Giáo viên! 👋</h2>
        <p className="text-sm text-white/60">Cùng xem qua tổng quan các lớp học của bạn nhé.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Tổng số lớp học', value: stats.classrooms, icon: BookOpen, color: 'emerald' },
          { label: 'Học sinh quản lý', value: stats.students, icon: Users, color: 'blue' },
          { label: 'Đề thi đã giao', value: stats.exams, icon: Activity, color: 'purple' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/10 rounded-full blur-2xl -translate-y-8 translate-x-8`} />
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-xl bg-${stat.color}-500/20 text-${stat.color}-400`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{loading ? '...' : stat.value}</div>
                  <div className="text-xs font-medium text-white/50">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('classrooms')}
          className="group flex flex-col items-start p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20 hover:to-teal-500/10 transition-all text-left"
        >
          <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Quản lý Lớp học</h3>
          <p className="text-sm text-white/60 mb-4 line-clamp-2">Tạo lớp học mới, xem danh sách học sinh và phê duyệt yêu cầu tham gia.</p>
          <div className="mt-auto flex items-center text-sm font-semibold text-emerald-400">
            Truy cập <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('exams')}
          className="group flex flex-col items-start p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 hover:from-blue-500/20 hover:to-indigo-500/10 transition-all text-left"
        >
          <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Quản lý Đề thi</h3>
          <p className="text-sm text-white/60 mb-4 line-clamp-2">Tạo, sửa đề thi và xem báo cáo điểm số của học sinh trong các lớp.</p>
          <div className="mt-auto flex items-center text-sm font-semibold text-blue-400">
            Truy cập <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}
