'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, BookOpen, CheckCircle, Clock, Users, Trophy, ChevronRight, Edit3 } from 'lucide-react';

export default function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState({ users: 0, exams: 0, attempts: 0 });
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [recentExams, setRecentExams] = useState([]);
  const [recentResolved, setRecentResolved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      try {
        // 1. Lấy tổng quan số liệu
        const [
          { count: usersCount }, 
          { count: examsCount }, 
          { count: attemptsCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('exams').select('*', { count: 'exact', head: true }),
          supabase.from('exam_attempts').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          users: usersCount || 0,
          exams: examsCount || 0,
          attempts: attemptsCount || 0
        });

        // 2. Hoạt động làm bài gần nhất (48h qua)
        const { data: attemptsData } = await supabase
          .from('exam_attempts')
          .select('id, score, created_at, time_spent, profiles(full_name, avatar_url), exams(title)')
          .gte('created_at', fortyEightHoursAgo)
          .order('created_at', { ascending: false })
          .limit(8);
        
        // 3. Đề thi mới tạo (48h qua)
        const { data: examsData } = await supabase
          .from('exams')
          .select('id, title, subject, created_at, published')
          .gte('created_at', fortyEightHoursAgo)
          .order('created_at', { ascending: false })
          .limit(6);

        // 4. Câu hỏi vừa được sửa/xử lý báo cáo (48h qua)
        const { data: resolvedData } = await supabase
          .from('question_reports')
          .select('id, question_content, exam_title, resolved_at, admin_reply')
          .eq('status', 'resolved')
          .gte('resolved_at', fortyEightHoursAgo)
          .order('resolved_at', { ascending: false })
          .limit(6);

        setRecentAttempts(attemptsData || []);
        setRecentExams(examsData || []);
        setRecentResolved(resolvedData || []);
      } catch (err) {
        console.error('Lỗi khi tải overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm font-medium animate-pulse">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  // Format time relative
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Thống kê tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#14142a] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Tổng học sinh</div>
            <div className="text-2xl font-black text-white">{stats.users}</div>
          </div>
        </div>
        <div className="bg-[#14142a] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Tổng đề thi</div>
            <div className="text-2xl font-black text-white">{stats.exams}</div>
          </div>
        </div>
        <div className="bg-[#14142a] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Lượt làm bài</div>
            <div className="text-2xl font-black text-white">{stats.attempts}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Hoạt động làm bài (2/3 chiều rộng) */}
        <div className="lg:col-span-2 bg-[#14142a] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Hoạt động gần đây (48h)</h2>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-y-auto max-h-[400px]">
            {recentAttempts.length > 0 ? (
              <ul className="space-y-1">
                {recentAttempts.map(attempt => (
                  <li key={attempt.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 overflow-hidden font-bold text-sm">
                      {attempt.profiles?.avatar_url ? (
                        <img src={attempt.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (attempt.profiles?.full_name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        <span className="font-semibold text-indigo-300">{attempt.profiles?.full_name || 'Ai đó'}</span> 
                        {' '}đã hoàn thành{' '}
                        <span className="font-medium text-white/80">{attempt.exams?.title || 'một đề thi'}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(attempt.created_at)}</span>
                        <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-500/70" /> Điểm: <strong className="text-amber-500">{attempt.score.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/40 py-10">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Chưa có lượt làm bài nào trong 48h qua.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Cột bên phải: Đề thi mới & Câu hỏi vừa sửa */}
        <div className="space-y-6">
          
          {/* Đề thi mới */}
          <div className="bg-[#14142a] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Đề thi mới tạo</h2>
              </div>
              <button onClick={() => onNavigate('exams')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2">
              {recentExams.length > 0 ? (
                <ul className="space-y-1">
                  {recentExams.map(exam => (
                    <li key={exam.id} className="p-3 hover:bg-white/5 rounded-xl transition-colors">
                      <div className="text-sm font-medium text-white truncate mb-1">{exam.title}</div>
                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span>{exam.subject}</span>
                        <span>{timeAgo(exam.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-white/40 py-6 text-sm">Không có đề thi mới.</div>
              )}
            </div>
          </div>

          {/* Câu hỏi vừa được sửa (Resolved Reports) */}
          <div className="bg-[#14142a] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Câu hỏi vừa sửa</h2>
              </div>
              <button onClick={() => onNavigate('reports')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center">
                Báo cáo <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2">
              {recentResolved.length > 0 ? (
                <ul className="space-y-1">
                  {recentResolved.map(rep => (
                    <li key={rep.id} className="p-3 hover:bg-white/5 rounded-xl transition-colors">
                      <div className="text-sm text-white/90 line-clamp-2 mb-1 leading-snug">
                        {rep.question_content || 'Nội dung câu hỏi...'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/40 mt-2">
                        <span className="truncate max-w-[120px]">{rep.exam_title}</span>
                        <span className="text-emerald-400/80 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Đã sửa</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-white/40 py-6 text-sm">Chưa có câu hỏi nào được sửa/xử lý gần đây.</div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
