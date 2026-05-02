'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Activity, CheckCircle2, AlertTriangle, RefreshCw, Search, Clock, FileText,
  Coins, Zap, Check, XCircle
} from 'lucide-react';

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const remainingS = Math.floor(s % 60);
  return `${m}m ${remainingS}s`;
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('vi-VN').format(num);
}

export default function OcrLogManagement({ showAlert, onTrackRequest }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cancellingRequestId, setCancellingRequestId] = useState('');
  const [deletingRequestId, setDeletingRequestId] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ocr_import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching OCR logs:', error);
      showAlert?.('Lỗi tải OCR logs', `${error.message}\n\nHãy chạy migration tạo bảng ocr_import_logs trên Supabase.`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [showAlert, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-ocr-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocr_import_logs' }, (payload) => {
        setLogs(currentLogs => {
          const newLog = payload.new;
          if (payload.eventType === 'INSERT') {
            return [newLog, ...currentLogs];
          }
          if (payload.eventType === 'UPDATE') {
            return currentLogs.map(log => log.id === newLog.id ? newLog : log);
          }
          if (payload.eventType === 'DELETE') {
            return currentLogs.filter(log => log.id !== payload.old.id);
          }
          return currentLogs;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => (
      (log.file_name || '').toLowerCase().includes(q)
      || (log.stage || '').toLowerCase().includes(q)
      || (log.error_message || '').toLowerCase().includes(q)
      || (log.request_id || '').toLowerCase().includes(q)
    ));
  }, [logs, search]);

  const handleCancelLog = async (requestId) => {
    if (!requestId || cancellingRequestId) return;
    setCancellingRequestId(requestId);
    try {
      const response = await fetch('/yeuhoc/api/admin/ai-exam/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, cancelledBy: 'admin' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Không thể hủy OCR.');
      }
      await fetchLogs();
    } catch (error) {
      showAlert?.('Lỗi hủy OCR', error.message || 'Không thể hủy tiến trình OCR.');
    } finally {
      setCancellingRequestId('');
    }
  };

  const handleDeleteCompletedLog = async (requestId) => {
    if (!requestId || deletingRequestId) return;
    setDeletingRequestId(requestId);
    try {
      const response = await fetch('/yeuhoc/api/admin/ai-exam/logs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Không thể xóa OCR log.');
      await fetchLogs();
    } catch (error) {
      showAlert?.('Lỗi xóa OCR log', error.message || 'Không thể xóa OCR log.');
    } finally {
      setDeletingRequestId('');
    }
  };

  const successCount = logs.filter((l) => l.status === 'success').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const processingCount = logs.filter((l) => l.status === 'processing').length;
  const avgDuration = logs.length > 0
    ? logs.reduce((sum, item) => sum + (item.duration_ms || 0), 0) / logs.length
    : 0;
  const totalTokensUsed = logs.reduce((sum, item) => sum + (item.total_tokens || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black text-white truncate">{successCount}</div>
              <div className="text-xs text-white/50 font-semibold truncate">Thành công</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black text-white truncate">{failedCount}</div>
              <div className="text-xs text-white/50 font-semibold truncate">Thất bại</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 border border-sky-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black text-white truncate">{processingCount}</div>
              <div className="text-xs text-white/50 font-semibold truncate">Đang xử lý</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black text-white truncate">{formatDuration(avgDuration)}</div>
              <div className="text-xs text-white/50 font-semibold truncate">Thời gian TB</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black text-white truncate">{formatNumber(totalTokensUsed)}</div>
              <div className="text-xs text-white/50 font-semibold truncate">Tổng Tokens</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex-1">
          <Search className="w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo file, stage, request_id, lỗi..."
            className="bg-transparent text-sm text-white placeholder:text-white/30 outline-none flex-1 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'processing', 'success', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === status ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              {status === 'all'
                ? 'Tất cả'
                : status === 'processing'
                  ? 'Processing'
                  : status === 'success'
                    ? 'Success'
                    : 'Failed'}
            </button>
          ))}

          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="py-16 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-white/45">Đang tải OCR logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 bg-white/3 rounded-2xl border border-white/8">
          <Activity className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50">Chưa có log OCR hoặc chưa chạy migration.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div key={log.id} className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      log.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : log.status === 'processing'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                    >
                      {log.status === 'success' && <Check className="w-3 h-3" />}
                      {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                      {log.status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {log.status}
                    </span>
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {log.stage}
                    </span>
                    <span className="text-xs text-white/40 flex items-center gap-1 font-medium bg-white/5 px-2 py-1 rounded-md">
                      <Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs text-white/70">
                  <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-2 bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <div className="text-white/40 mb-1 text-[10px] uppercase font-bold tracking-wider">File</div>
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="w-3.5 h-3.5 text-white/50 shrink-0" />
                      <span className="truncate" title={log.file_name}>{log.file_name || 'Không có tên file'}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <div className="text-white/40 mb-1 text-[10px] uppercase font-bold tracking-wider">Thời gian</div>
                    <div className="font-semibold text-white/90">{formatDuration(log.duration_ms)}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <div className="text-white/40 mb-1 text-[10px] uppercase font-bold tracking-wider">Câu hỏi</div>
                    <div className="font-semibold text-white/90">{log.question_count ?? 0} câu</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/5 flex flex-col justify-center">
                    <div className="text-amber-400/60 mb-1 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Tokens
                    </div>
                    <div className="font-bold text-amber-400/90">{formatNumber(log.total_tokens)}</div>
                  </div>
                </div>

                {log.error_message && (
                  <div className="mt-3 text-xs text-red-200/90 bg-red-500/10 border border-red-500/20 rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed font-mono">
                    <span className="font-bold text-red-400 block mb-1">Error Message:</span>
                    {log.error_message}
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-2">
                      <div className="text-white/40 uppercase tracking-wider text-[10px] font-bold">Request Info</div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">Request ID:</span> <span className="font-mono text-white/80">{log.request_id}</span></div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">File Type:</span> <span className="font-mono text-white/80">{log.file_type || 'N/A'}</span></div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">File Size:</span> <span className="font-mono text-white/80">{log.file_size_bytes ? `${Math.round(log.file_size_bytes / 1024)} KB` : 'N/A'}</span></div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-white/40 uppercase tracking-wider text-[10px] font-bold">Extraction Info</div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">Extracted Chars:</span> <span className="font-mono text-white/80">{formatNumber(log.extracted_chars)}</span></div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">Image Candidates:</span> <span className="font-mono text-white/80">{log.image_candidate_count || 0}</span></div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">Used OCR / Repaired:</span> <span className="font-mono text-white/80">{log.used_ocr ? 'Yes' : 'No'} / {log.repaired ? 'Yes' : 'No'}</span></div>
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                      <div className="text-white/40 uppercase tracking-wider text-[10px] font-bold">Model & Token Details</div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">Normalize Model:</span> <span className="font-mono text-indigo-300">{log.normalize_model || 'N/A'}</span></div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">Prompt Tokens:</span> <span className="font-mono text-amber-300">{formatNumber(log.prompt_tokens)}</span></div>
                      <div className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded"><span className="text-white/50">Completion Tokens:</span> <span className="font-mono text-amber-300">{formatNumber(log.completion_tokens)}</span></div>
                    </div>
                  </div>
                )}

                {onTrackRequest && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onTrackRequest(log.request_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
                    >
                      Theo dõi ở tab Đề thi
                    </button>
                    {log.status === 'processing' && (
                      <button
                        onClick={() => handleCancelLog(log.request_id)}
                        disabled={cancellingRequestId === log.request_id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-200 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                      >
                        {cancellingRequestId === log.request_id ? 'Đang hủy...' : 'Hủy tiến trình'}
                      </button>
                    )}
                    {log.status !== 'processing' && (
                      <button
                        onClick={() => handleDeleteCompletedLog(log.request_id)}
                        disabled={deletingRequestId === log.request_id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {deletingRequestId === log.request_id ? 'Đang xóa...' : 'Xóa tiến trình'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
