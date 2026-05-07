'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Activity, AlertCircle, BookOpen, CheckCircle2, Clock, RefreshCw, Search, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const formatDateTime = (value) => {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function PracticeProgressManagement() {
  const [progressRows, setProgressRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase
        .from('practice_progress')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        setProgressRows([]);
        setErrorMessage(error.message);
        return;
      }

      const rows = data || [];
      const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
      const examIds = [...new Set(rows.map(row => row.exam_id).filter(Boolean))];

      const [{ data: profiles }, { data: exams }] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds)
          : Promise.resolve({ data: [] }),
        examIds.length > 0
          ? supabase.from('exams').select('id, title, subject, exam_type, year').in('id', examIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
      const examMap = new Map((exams || []).map(exam => [exam.id, exam]));

      setProgressRows(rows.map(row => ({
        ...row,
        profile: profileMap.get(row.user_id) || null,
        exam: examMap.get(row.exam_id) || null,
      })));
    } catch (error) {
      console.error('Fetch practice progress error:', error);
      setProgressRows([]);
      setErrorMessage(error.message || 'Không tải được tiến trình ôn luyện.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetchTimer = setTimeout(fetchProgress, 0);

    const channel = supabase
      .channel('admin-practice-progress')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_progress' }, () => {
        fetchProgress();
      })
      .subscribe();

    return () => {
      clearTimeout(initialFetchTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchProgress]);

  const filteredRows = progressRows.filter(row => {
    const query = searchTerm.trim().toLowerCase();
    const statusMatches =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && row.completed) ||
      (statusFilter === 'in_progress' && !row.completed);

    if (!statusMatches) return false;
    if (!query) return true;

    return [
      row.profile?.full_name,
      row.profile?.email,
      row.exam?.title,
      row.exam?.subject,
      row.exam?.exam_type,
    ].some(value => value?.toLowerCase().includes(query));
  });

  const totalRows = progressRows.length;
  const completedRows = progressRows.filter(row => row.completed).length;
  const activeRows = totalRows - completedRows;
  const averageProgress = totalRows > 0
    ? Math.round(progressRows.reduce((sum, row) => {
        const total = row.total_questions || 0;
        return sum + (total > 0 ? (row.revealed_count || 0) / total : 0);
      }, 0) / totalRows * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl border border-white/10 p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Activity className="w-48 h-48" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Lịch sử ôn luyện
            </h2>
            <p className="text-sm text-white/60 max-w-xl">
              Theo dõi tiến trình ôn luyện đã lưu của từng học sinh theo từng đề.
            </p>
          </div>
          <button
            onClick={fetchProgress}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-300">Chưa tải được lịch sử ôn luyện</p>
            <p className="text-xs text-white/50 mt-1">
              {errorMessage}. Hãy đảm bảo migration `20260507_create_practice_progress.sql` đã được chạy trên Supabase.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-white/40 mb-1">Tổng tiến trình</p>
          <p className="text-2xl font-black text-white">{totalRows}</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-white/40 mb-1">Đang ôn luyện</p>
          <p className="text-2xl font-black text-amber-400">{activeRows}</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-white/40 mb-1">Hoàn thành</p>
          <p className="text-2xl font-black text-emerald-400">{completedRows}</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-white/40 mb-1">Tiến độ TB</p>
          <p className="text-2xl font-black text-indigo-300">{averageProgress}%</p>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col" style={{ maxHeight: '72vh', minHeight: 360 }}>
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center gap-3 bg-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Tìm theo học sinh, email, đề thi..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="in_progress">Đang ôn luyện</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-white/60">Đang tải lịch sử ôn luyện...</p>
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="divide-y divide-white/10">
              {filteredRows.map(row => {
                const totalQuestions = row.total_questions || 0;
                const revealedCount = row.revealed_count || 0;
                const answeredCount = row.answered_count || 0;
                const percent = totalQuestions > 0 ? Math.round((revealedCount / totalQuestions) * 100) : 0;
                const currentQuestion = totalQuestions > 0 ? Math.min((row.current_question || 0) + 1, totalQuestions) : 0;

                return (
                  <div key={row.id} className="p-4 hover:bg-white/[0.03] transition-colors">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                      <div className="flex items-center gap-3 min-w-0 xl:w-72">
                        {row.profile?.avatar_url ? (
                          <Image
                            src={row.profile.avatar_url}
                            alt=""
                            width={44}
                            height={44}
                            unoptimized
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold shrink-0">
                            {(row.profile?.full_name || row.profile?.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{row.profile?.full_name || 'Người dùng ẩn danh'}</p>
                          <p className="text-xs text-white/40 truncate">{row.profile?.email || row.user_id}</p>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{row.exam?.title || 'Đề thi đã bị xóa'}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mt-1">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {row.exam?.subject || 'Không rõ'}</span>
                          {row.exam?.exam_type && <span>{row.exam.exam_type}</span>}
                          {row.exam?.year && <span>{row.exam.year}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:w-[520px]">
                        <div>
                          <p className="text-xs text-white/30 mb-0.5">Đã xem</p>
                          <p className="text-sm font-black text-emerald-400">{revealedCount}/{totalQuestions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/30 mb-0.5">Đã trả lời</p>
                          <p className="text-sm font-bold text-white/90">{answeredCount}/{totalQuestions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/30 mb-0.5">Câu hiện tại</p>
                          <p className="text-sm font-bold text-white/90">{currentQuestion}/{totalQuestions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/30 mb-0.5">Cập nhật</p>
                          <p className="text-xs font-semibold text-white/60">{formatDateTime(row.updated_at || row.saved_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${percent}%` }} />
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        row.completed
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {row.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {row.completed ? 'Hoàn thành' : `${percent}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <User className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Chưa có lịch sử ôn luyện phù hợp</p>
              <p className="text-xs text-white/30 mt-1">Dữ liệu sẽ xuất hiện sau khi học sinh vào chế độ ôn luyện và hệ thống lưu tiến trình.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
