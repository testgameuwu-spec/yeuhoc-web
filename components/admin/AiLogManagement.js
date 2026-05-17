'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Activity, AlertTriangle, Bell, Bot, CheckCircle2, Clock, FileText,
  RefreshCw, Search, Sparkles, Users, XCircle, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import OcrLogManagement from './OcrLogManagement';

const SUB_TABS = [
  { key: 'overview', label: 'Tổng quan', icon: Activity },
  { key: 'ocr', label: 'Tạo đề/OCR', icon: FileText },
  { key: 'practice', label: 'AI ôn luyện', icon: Bot },
  { key: 'notifications', label: 'AI thông báo', icon: Bell },
];

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

function formatDateTime(value) {
  if (!value) return 'Chưa rõ';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms) {
  const value = Number(ms) || 0;
  if (value < 1000) return `${value}ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}

function getDisplayName(profile, fallback = 'Người dùng ẩn danh') {
  return profile?.full_name || profile?.email || fallback;
}

async function enrichAiLogs(rows) {
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
}

function matchesText(values, search) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return values.some(value => String(value || '').toLowerCase().includes(query));
}

function getAiSourceLabel(source) {
  if (source === 'practice_chat') return 'AI ôn luyện';
  if (source === 'error_log_retry') return 'AI Nhật ký lỗi';
  if (source === 'notification_draft') return 'AI thông báo';
  return 'AI Logs';
}

export default function AiLogManagement({ showAlert, onTrackRequest }) {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [logs, setLogs] = useState([]);
  const [ocrLogs, setOcrLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [aiResult, ocrResult] = await Promise.all([
        supabase
          .from('ai_usage_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('ocr_import_logs')
          .select('id, request_id, status, file_name, total_tokens, duration_ms, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (aiResult.error) throw aiResult.error;
      setLogs(await enrichAiLogs(aiResult.data || []));

      if (ocrResult.error) {
        console.warn('AI Logs OCR summary fetch failed:', ocrResult.error.message);
        setOcrLogs([]);
      } else {
        setOcrLogs(ocrResult.data || []);
      }
    } catch (error) {
      console.error('AI usage logs fetch failed:', error);
      setLogs([]);
      setErrorMessage(`${error.message || 'Không tải được AI Logs.'} Hãy chạy migration ai_usage_logs mới nhất trên Supabase.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  useEffect(() => {
    const aiChannel = supabase
      .channel('admin-ai-usage-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_usage_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    const ocrChannel = supabase
      .channel('admin-ai-ocr-summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocr_import_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(aiChannel);
      supabase.removeChannel(ocrChannel);
    };
  }, [fetchLogs]);

  const practiceLogs = useMemo(() => logs.filter(log => log.source === 'practice_chat'), [logs]);
  const errorLogRetryLogs = useMemo(() => logs.filter(log => log.source === 'error_log_retry'), [logs]);
  const learningAssistantLogs = useMemo(() => (
    logs.filter(log => log.source === 'practice_chat' || log.source === 'error_log_retry')
  ), [logs]);
  const notificationLogs = useMemo(() => logs.filter(log => log.source === 'notification_draft'), [logs]);

  const stats = useMemo(() => {
    const totalTokens = logs.reduce((sum, log) => sum + (Number(log.total_tokens) || 0), 0)
      + ocrLogs.reduce((sum, log) => sum + (Number(log.total_tokens) || 0), 0);
    const failedCount = logs.filter(log => log.status === 'failed').length
      + ocrLogs.filter(log => log.status === 'failed').length;

    return {
      totalEvents: logs.length + ocrLogs.length,
      uniquePracticeUsers: new Set(learningAssistantLogs.map(log => log.user_id).filter(Boolean)).size,
      practiceCallCount: practiceLogs.length,
      errorLogRetryCount: errorLogRetryLogs.length,
      notificationDraftCount: notificationLogs.length,
      totalTokens,
      failedCount,
    };
  }, [errorLogRetryLogs, learningAssistantLogs, logs, notificationLogs, ocrLogs, practiceLogs]);

  const practiceGroups = useMemo(() => {
    const groupMap = new Map();

    learningAssistantLogs.forEach((log) => {
      const key = log.user_id || 'unknown';
      const current = groupMap.get(key) || {
        userId: log.user_id,
        profile: log.profile,
        total: 0,
        practiceTotal: 0,
        errorLogRetries: 0,
        initialHints: 0,
        followUps: 0,
        failed: 0,
        totalTokens: 0,
        lastUsed: log.created_at,
        exams: new Map(),
      };

      current.total += 1;
      current.practiceTotal += log.source === 'practice_chat' ? 1 : 0;
      current.errorLogRetries += log.source === 'error_log_retry' ? 1 : 0;
      current.initialHints += log.request_type === 'initial-hint' ? 1 : 0;
      current.followUps += log.request_type === 'follow-up' ? 1 : 0;
      current.failed += log.status === 'failed' ? 1 : 0;
      current.totalTokens += Number(log.total_tokens) || 0;
      if (new Date(log.created_at).getTime() > new Date(current.lastUsed).getTime()) {
        current.lastUsed = log.created_at;
      }
      if (log.exam_id) {
        current.exams.set(log.exam_id, log.exam?.title || log.exam_id);
      }

      groupMap.set(key, current);
    });

    return [...groupMap.values()]
      .filter(group => matchesText([
        getDisplayName(group.profile, group.userId),
        group.profile?.email,
        group.userId,
        ...group.exams.values(),
      ], search))
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
  }, [learningAssistantLogs, search]);

  const filteredNotificationLogs = useMemo(() => (
    notificationLogs.filter(log => matchesText([
      getDisplayName(log.profile, log.user_id),
      log.profile?.email,
      log.status,
      log.error_message,
      log.model,
    ], search))
  ), [notificationLogs, search]);

  const recentEvents = useMemo(() => ([
    ...logs.map(log => ({
      id: log.id,
      label: getAiSourceLabel(log.source),
      status: log.status,
      title: log.source === 'practice_chat' || log.source === 'error_log_retry'
        ? getDisplayName(log.profile, log.user_id)
        : getDisplayName(log.profile, 'Admin'),
      detail: log.source === 'practice_chat' || log.source === 'error_log_retry'
        ? (log.exam?.title || log.question_id || (log.source === 'error_log_retry' ? 'Làm lại Nhật ký lỗi' : 'Phòng ôn luyện'))
        : (log.metadata?.hasChanges === false ? 'Không có thay đổi mới' : 'Tạo nháp thông báo'),
      tokens: log.total_tokens,
      createdAt: log.created_at,
    })),
    ...ocrLogs.map(log => ({
      id: log.id,
      label: 'Tạo đề/OCR',
      status: log.status,
      title: log.file_name || log.request_id,
      detail: formatDuration(log.duration_ms),
      tokens: log.total_tokens,
      createdAt: log.created_at,
    })),
  ])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10), [logs, ocrLogs]);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="glass rounded-2xl border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              AI Logs
            </h2>
            <p className="mt-1 text-sm text-white/50">Theo dõi các luồng AI: tạo đề/OCR, trợ lý ôn luyện và AI viết thông báo.</p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? 'border-indigo-500/40 bg-indigo-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/45 hover:text-white/75'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage && activeSubTab !== 'ocr' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-black [html[data-theme=dark]_&]:text-amber-100">
          <AlertTriangle className="inline-block w-4 h-4 mr-2 text-amber-300" />
          {errorMessage}
        </div>
      )}

      {activeSubTab === 'overview' && (
        <OverviewTab stats={stats} recentEvents={recentEvents} loading={loading} />
      )}

      {activeSubTab === 'ocr' && (
        <OcrLogManagement showAlert={showAlert} onTrackRequest={onTrackRequest} />
      )}

      {activeSubTab === 'practice' && (
        <PracticeTab
          groups={practiceGroups}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
        />
      )}

      {activeSubTab === 'notifications' && (
        <NotificationTab
          logs={filteredNotificationLogs}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
        />
      )}
    </div>
  );
}

function OverviewTab({ stats, recentEvents, loading }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4">
        <StatCard icon={Activity} label="Tổng AI events" value={formatNumber(stats.totalEvents)} tone="indigo" />
        <StatCard icon={Users} label="User dùng AI học tập" value={formatNumber(stats.uniquePracticeUsers)} tone="emerald" />
        <StatCard icon={Bot} label="Lượt AI ôn luyện" value={formatNumber(stats.practiceCallCount)} tone="sky" />
        <StatCard icon={Sparkles} label="AI Nhật ký lỗi" value={formatNumber(stats.errorLogRetryCount)} tone="cyan" />
        <StatCard icon={Bell} label="AI thông báo" value={formatNumber(stats.notificationDraftCount)} tone="violet" />
        <StatCard icon={Zap} label="Tổng tokens" value={formatNumber(stats.totalTokens)} tone="amber" />
        <StatCard icon={AlertTriangle} label="Thất bại" value={formatNumber(stats.failedCount)} tone="red" />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-bold text-white">Hoạt động gần đây</h3>
        </div>
        {loading ? (
          <LoadingState label="Đang tải AI Logs..." />
        ) : recentEvents.length > 0 ? (
          <div className="divide-y divide-white/10">
            {recentEvents.map(event => (
              <div key={`${event.label}-${event.id}`} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={event.status} />
                    <span className="text-xs font-bold text-indigo-300">{event.label}</span>
                    <span className="text-xs text-white/35">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 font-bold text-white truncate">{event.title || 'Không rõ'}</p>
                  <p className="mt-1 text-sm text-white/45 truncate">{event.detail || 'Không có chi tiết'}</p>
                </div>
                <div className="text-sm font-black text-amber-300">{formatNumber(event.tokens)} tokens</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="Chưa có AI Logs." />
        )}
      </section>
    </div>
  );
}

function PracticeTab({ groups, loading, search, onSearchChange }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <Toolbar search={search} onSearchChange={onSearchChange} placeholder="Tìm theo học sinh, email, đề thi..." />
      {loading ? (
        <LoadingState label="Đang tải người dùng AI ôn luyện..." />
      ) : groups.length > 0 ? (
        <div className="divide-y divide-white/10">
          {groups.map(group => (
            <div key={group.userId || 'unknown'} className="p-4 sm:p-5">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,520px)] gap-4 xl:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  {group.profile?.avatar_url ? (
                    <Image
                      src={group.profile.avatar_url}
                      alt={getDisplayName(group.profile)}
                      width={44}
                      height={44}
                      sizes="44px"
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-500/20 text-indigo-200 flex items-center justify-center font-black shrink-0">
                      {getDisplayName(group.profile, 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{getDisplayName(group.profile)}</p>
                    <p className="text-xs text-white/40 truncate">{group.profile?.email || group.userId || 'Không có user_id'}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-1">Đề/câu đã dùng AI</p>
                  <p className="text-sm text-black [html[data-theme=dark]_&]:text-white/65 line-clamp-2">
                    {[...group.exams.values()].join(', ') || 'Chưa gắn đề thi'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                  <Metric label="Tổng lượt" value={formatNumber(group.total)} />
                  <Metric label="Ôn luyện" value={formatNumber(group.practiceTotal)} />
                  <Metric label="Nhật ký lỗi" value={formatNumber(group.errorLogRetries)} />
                  <Metric label="Gợi ý đầu" value={formatNumber(group.initialHints)} />
                  <Metric label="Hỏi thêm" value={formatNumber(group.followUps)} />
                  <Metric label="Tokens" value={formatNumber(group.totalTokens)} className="text-amber-300" />
                  <Metric label="Lần cuối" value={formatDateTime(group.lastUsed)} compact />
                </div>
              </div>

              {group.failed > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {group.failed} lượt lỗi
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState label="Chưa có học sinh dùng AI ôn luyện phù hợp." />
      )}
    </section>
  );
}

function NotificationTab({ logs, loading, search, onSearchChange }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <Toolbar search={search} onSearchChange={onSearchChange} placeholder="Tìm theo admin, trạng thái, model..." />
      {loading ? (
        <LoadingState label="Đang tải log AI thông báo..." />
      ) : logs.length > 0 ? (
        <div className="divide-y divide-white/10">
          {logs.map(log => {
            const counts = log.metadata?.counts || {};
            const hasChanges = log.metadata?.hasChanges !== false;
            return (
              <div key={log.id} className="p-4 sm:p-5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={log.status} />
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                        hasChanges
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                      }`}>
                        {hasChanges ? 'Có dữ liệu mới' : 'Không có thay đổi mới'}
                      </span>
                      <span className="text-xs text-white/35">{formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="mt-2 font-bold text-white truncate">{getDisplayName(log.profile, 'Admin')}</p>
                    <p className="mt-1 text-xs text-white/40 truncate">{log.profile?.email || log.user_id}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 xl:min-w-[620px]">
                    <Metric label="Đề input" value={formatNumber(counts.totalExamsInInput)} />
                    <Metric label="Đề mới" value={formatNumber(counts.newExamsCreatedAfterCutoff)} />
                    <Metric label="Đề cập nhật" value={formatNumber(counts.updatedExamsAfterCutoff)} />
                    <Metric label="Thư mục" value={formatNumber(counts.foldersInInput)} />
                    <Metric label="Tokens" value={formatNumber(log.total_tokens)} className="text-amber-300" />
                  </div>
                </div>

                {log.error_message && (
                  <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100">
                    {log.error_message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState label="Chưa có log AI thông báo phù hợp." />
      )}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const toneClass = {
    indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    sky: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    red: 'border-red-500/20 bg-red-500/10 text-red-300',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <Icon className="w-5 h-5 mb-3" />
      <p className="text-xs font-bold uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Toolbar({ search, onSearchChange, placeholder }) {
  return (
    <div className="border-b border-white/10 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/35 outline-none focus:border-indigo-500/50"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const success = status === 'success';
  const processing = status === 'processing';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
      success
        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
        : processing
          ? 'border-sky-500/25 bg-sky-500/10 text-sky-300'
          : 'border-red-500/25 bg-red-500/10 text-red-300'
    }`}>
      {success ? <CheckCircle2 className="w-3 h-3" /> : processing ? <RefreshCw className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {success ? 'Success' : processing ? 'Processing' : 'Failed'}
    </span>
  );
}

function Metric({ label, value, className = 'text-white/90', compact = false }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-white/30 mb-0.5">{label}</p>
      <p className={`${compact ? 'text-xs leading-tight' : 'text-sm'} font-black break-words ${className}`}>{value}</p>
    </div>
  );
}

function LoadingState({ label }) {
  return (
    <div className="py-16 flex flex-col items-center">
      <div className="w-8 h-8 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
      <p className="mt-3 text-sm text-white/45">{label}</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="py-16 text-center">
      <Clock className="w-10 h-10 text-white/20 mx-auto mb-3" />
      <p className="text-sm font-semibold text-white/50">{label}</p>
    </div>
  );
}
