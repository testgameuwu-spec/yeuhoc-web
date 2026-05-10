'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Activity, AlertCircle, BookOpen, CheckCircle2, Clock,
  RefreshCw, Search, ShieldAlert, Trophy, User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const MODES = [
  { key: 'practice', label: 'Ôn luyện' },
  { key: 'exam', label: 'Thi nghiêm túc' },
];

const formatDateTime = (value) => {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  const minutes = Math.floor(value / 60);
  const remain = value % 60;
  return `${minutes}p ${remain}s`;
};

const enrichRows = async (rows) => {
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

  return rows.map(row => ({
    ...row,
    profile: profileMap.get(row.user_id) || null,
    exam: examMap.get(row.exam_id) || null,
  }));
};

const matchesSearch = (row, searchTerm) => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;

  return [
    row.profile?.full_name,
    row.profile?.email,
    row.exam?.title,
    row.exam?.subject,
    row.exam?.exam_type,
  ].some(value => value?.toLowerCase().includes(query));
};

export default function PracticeProgressManagement() {
  const [mode, setMode] = useState('practice');
  const [progressRows, setProgressRows] = useState([]);
  const [attemptRows, setAttemptRows] = useState([]);
  const [practiceLoading, setPracticeLoading] = useState(true);
  const [examLoading, setExamLoading] = useState(true);
  const [practiceError, setPracticeError] = useState('');
  const [examError, setExamError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProgress = useCallback(async () => {
    setPracticeLoading(true);
    setPracticeError('');
    try {
      const { data, error } = await supabase
        .from('practice_progress')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        setProgressRows([]);
        setPracticeError(error.message);
        return;
      }

      setProgressRows(await enrichRows(data || []));
    } catch (error) {
      console.error('Fetch practice progress error:', error);
      setProgressRows([]);
      setPracticeError(error.message || 'Không tải được tiến trình ôn luyện.');
    } finally {
      setPracticeLoading(false);
    }
  }, []);

  const fetchExamAttempts = useCallback(async () => {
    setExamLoading(true);
    setExamError('');
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('id, user_id, exam_id, score, correct_answers, total_questions, time_spent, created_at, violation_count')
        .order('created_at', { ascending: false });

      if (error) {
        setAttemptRows([]);
        setExamError(error.message);
        return;
      }

      setAttemptRows(await enrichRows(data || []));
    } catch (error) {
      console.error('Fetch exam attempts error:', error);
      setAttemptRows([]);
      setExamError(error.message || 'Không tải được lịch sử thi nghiêm túc.');
    } finally {
      setExamLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetchTimer = setTimeout(() => {
      fetchProgress();
      fetchExamAttempts();
    }, 0);

    const practiceChannel = supabase
      .channel('admin-practice-progress')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_progress' }, () => {
        fetchProgress();
      })
      .subscribe();

    const attemptsChannel = supabase
      .channel('admin-exam-attempts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_attempts' }, () => {
        fetchExamAttempts();
      })
      .subscribe();

    return () => {
      clearTimeout(initialFetchTimer);
      supabase.removeChannel(practiceChannel);
      supabase.removeChannel(attemptsChannel);
    };
  }, [fetchExamAttempts, fetchProgress]);

  const filteredPracticeRows = progressRows.filter(row => {
    const statusMatches =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && row.completed) ||
      (statusFilter === 'in_progress' && !row.completed);

    return statusMatches && matchesSearch(row, searchTerm);
  });

  const filteredAttemptRows = attemptRows.filter(row => matchesSearch(row, searchTerm));

  const totalRows = progressRows.length;
  const completedRows = progressRows.filter(row => row.completed).length;
  const activeRows = totalRows - completedRows;
  const averageProgress = totalRows > 0
    ? Math.round(progressRows.reduce((sum, row) => {
        const total = row.total_questions || 0;
        return sum + (total > 0 ? (row.revealed_count || 0) / total : 0);
      }, 0) / totalRows * 100)
    : 0;

  const totalAttempts = attemptRows.length;
  const averageScore = totalAttempts > 0
    ? attemptRows.reduce((sum, row) => sum + (Number(row.score) || 0), 0) / totalAttempts
    : 0;
  const highestScore = totalAttempts > 0
    ? Math.max(...attemptRows.map(row => Number(row.score) || 0))
    : 0;
  const violationAttempts = attemptRows.filter(row => (Number(row.violation_count) || 0) > 0).length;

  const loading = mode === 'practice' ? practiceLoading : examLoading;
  const errorMessage = mode === 'practice' ? practiceError : examError;
  const refreshActiveMode = mode === 'practice' ? fetchProgress : fetchExamAttempts;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="glass rounded-2xl border border-white/10 p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          {mode === 'practice' ? <Activity className="w-48 h-48" /> : <Trophy className="w-48 h-48" />}
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              {mode === 'practice'
                ? <Activity className="w-5 h-5 text-emerald-400" />
                : <Trophy className="w-5 h-5 text-amber-400" />
              }
              {mode === 'practice' ? 'Lịch sử ôn luyện' : 'Lịch sử thi nghiêm túc'}
            </h2>
            <p className="text-sm text-white/60 max-w-xl">
              {mode === 'practice'
                ? 'Theo dõi tiến trình ôn luyện đã lưu của từng học sinh theo từng đề.'
                : 'Theo dõi điểm, số câu đúng, thời gian và vi phạm của các lượt thi đã nộp.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black/20 border border-white/10 w-full sm:w-auto">
              {MODES.map(item => (
                <button
                  key={item.key}
                  onClick={() => setMode(item.key)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                    mode === item.key
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={refreshActiveMode}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-300">
              {mode === 'practice' ? 'Chưa tải được lịch sử ôn luyện' : 'Chưa tải được lịch sử thi nghiêm túc'}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {errorMessage}
              {mode === 'practice' ? '. Hãy đảm bảo migration `20260507_create_practice_progress.sql` đã được chạy trên Supabase.' : ''}
            </p>
          </div>
        </div>
      )}

      {mode === 'practice' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/40 mb-1">Tổng lượt thi</p>
            <p className="text-2xl font-black text-white">{totalAttempts}</p>
          </div>
          <div className="glass rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/40 mb-1">Điểm trung bình</p>
            <p className="text-2xl font-black text-indigo-300">{averageScore.toFixed(1)}</p>
          </div>
          <div className="glass rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/40 mb-1">Điểm cao nhất</p>
            <p className="text-2xl font-black text-emerald-400">{highestScore.toFixed(1)}</p>
          </div>
          <div className="glass rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/40 mb-1">Lượt có vi phạm</p>
            <p className="text-2xl font-black text-red-400">{violationAttempts}</p>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col min-w-0 md:max-h-[72vh]" style={{ minHeight: 360 }}>
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
          {mode === 'practice' && (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50 w-full sm:w-auto"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in_progress">Đang ôn luyện</option>
              <option value="completed">Hoàn thành</option>
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-white/60">
                {mode === 'practice' ? 'Đang tải lịch sử ôn luyện...' : 'Đang tải lịch sử thi nghiêm túc...'}
              </p>
            </div>
          ) : mode === 'practice' ? (
            filteredPracticeRows.length > 0 ? (
              <div className="divide-y divide-white/10">
                {filteredPracticeRows.map(row => {
                  const totalQuestions = row.total_questions || 0;
                  const revealedCount = row.revealed_count || 0;
                  const answeredCount = row.answered_count || 0;
                  const percent = totalQuestions > 0 ? Math.round((revealedCount / totalQuestions) * 100) : 0;
                  const currentQuestion = totalQuestions > 0 ? Math.min((row.current_question || 0) + 1, totalQuestions) : 0;

                  return (
                    <div key={row.id} className="p-4 hover:bg-white/[0.03] transition-colors min-w-0">
                      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,520px)] 2xl:items-center">
                        <StudentCell row={row} />
                        <ExamCell row={row} />

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
                          <Metric label="Đã xem" value={`${revealedCount}/${totalQuestions}`} className="text-emerald-400 font-black" />
                          <Metric label="Đã trả lời" value={`${answeredCount}/${totalQuestions}`} />
                          <Metric label="Câu hiện tại" value={`${currentQuestion}/${totalQuestions}`} />
                          <Metric label="Cập nhật" value={formatDateTime(row.updated_at || row.saved_at)} compact />
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
              <EmptyState mode="practice" />
            )
          ) : filteredAttemptRows.length > 0 ? (
            <div className="divide-y divide-white/10">
              {filteredAttemptRows.map(row => {
                const score = Number(row.score) || 0;
                const correct = Number(row.correct_answers) || 0;
                const total = Number(row.total_questions) || 0;
                const violationCount = Number(row.violation_count) || 0;
                const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

                return (
                  <div key={row.id} className="p-4 hover:bg-white/[0.03] transition-colors min-w-0">
                    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,620px)] 2xl:items-center">
                      <StudentCell row={row} />
                      <ExamCell row={row} />

                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 min-w-0">
                        <Metric label="Điểm" value={score.toFixed(1)} className="text-emerald-400 font-black" />
                        <Metric label="Đúng" value={`${correct}/${total}`} />
                        <Metric label="Tỉ lệ" value={`${accuracy}%`} />
                        <Metric label="Thời gian" value={formatDuration(row.time_spent)} />
                        <Metric label="Ngày nộp" value={formatDateTime(row.created_at)} compact />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${accuracy}%` }} />
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        violationCount > 0
                          ? 'bg-red-500/10 text-red-300 border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}>
                        {violationCount > 0 ? <ShieldAlert className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {violationCount > 0 ? `Vi phạm ${violationCount}` : 'Không vi phạm'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState mode="exam" />
          )}
        </div>
      </div>
    </div>
  );
}

const StudentCell = ({ row }) => (
  <div className="flex items-center gap-3 min-w-0">
    {row.profile?.avatar_url ? (
      <Image
        src={row.profile.avatar_url}
        alt=""
        width={44}
        height={44}
        sizes="44px"
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
);

const ExamCell = ({ row }) => (
  <div className="flex-1 min-w-0">
    <p className="font-bold text-white truncate">{row.exam?.title || 'Đề thi đã bị xóa'}</p>
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mt-1">
      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {row.exam?.subject || 'Không rõ'}</span>
      {row.exam?.exam_type && <span>{row.exam.exam_type}</span>}
      {row.exam?.year && <span>{row.exam.year}</span>}
    </div>
  </div>
);

const Metric = ({ label, value, className = 'text-white/90 font-bold', compact = false }) => (
  <div className="min-w-0">
    <p className="text-xs text-white/30 mb-0.5">{label}</p>
    <p className={`${compact ? 'text-xs leading-tight' : 'text-sm'} ${className} break-words`}>{value}</p>
  </div>
);

const EmptyState = ({ mode }) => (
  <div className="py-16 text-center">
    <User className="w-12 h-12 text-white/20 mx-auto mb-3" />
    <p className="text-sm text-white/60 font-medium">
      {mode === 'practice' ? 'Chưa có lịch sử ôn luyện phù hợp' : 'Chưa có lịch sử thi nghiêm túc phù hợp'}
    </p>
    <p className="text-xs text-white/30 mt-1">
      {mode === 'practice'
        ? 'Dữ liệu sẽ xuất hiện sau khi học sinh vào chế độ ôn luyện và hệ thống lưu tiến trình.'
        : 'Dữ liệu sẽ xuất hiện sau khi học sinh nộp bài ở chế độ làm bài thi.'}
    </p>
  </div>
);
