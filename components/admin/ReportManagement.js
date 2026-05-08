'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  AlertTriangle, CheckCircle2, Trash2, Search, Filter,
  ChevronDown, RefreshCw, MessageSquare, Clock, User, FileText, X
} from 'lucide-react';

const REASON_LABELS = {
  wrong_question: 'Sai đề / Đề bị lỗi',
  wrong_answer: 'Sai đáp án',
  wrong_solution: 'Sai lời giải',
  unclear: 'Đề không rõ ràng',
  missing_image: 'Thiếu hình ảnh',
  other: 'Lý do khác',
};

const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  resolved: { label: 'Đã xử lý', color: '#10b981', bg: '#d1fae5', icon: CheckCircle2 },
};

export default function ReportManagement({ onEditExam, showAlert, showConfirm }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminReplyDraft, setAdminReplyDraft] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('question_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data: reportsData, error } = await query;
      if (error) throw error;

      // Lấy thông tin user thủ công để tránh lỗi thiếu Foreign Key trong Supabase
      if (reportsData && reportsData.length > 0) {
        const userIds = [...new Set(reportsData.map(r => r.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const profileMap = {};
          if (profilesData) {
            profilesData.forEach(p => profileMap[p.id] = p);
          }

          reportsData.forEach(r => {
            if (r.user_id) {
              r.profiles = profileMap[r.user_id] || null;
            }
          });
        }
      }

      setReports(reportsData || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(fetchReports, 0);
    return () => clearTimeout(timer);
  }, [fetchReports]);

  useEffect(() => {
    const reportChannel = supabase
      .channel('admin-question-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'question_reports' },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportChannel);
    };
  }, [fetchReports]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAdminReplyDraft(selectedReport?.admin_reply || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedReport]);

  const handleResolve = async (reportId) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('question_reports')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw error;
      await fetchReports();
      setSelectedReport(null);
    } catch (err) {
      console.error('Error resolving report:', err);
      showAlert('Lỗi', err.message);
    }
    setActionLoading(false);
  };

  const handleDeleteReport = async (reportId) => {
    showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa báo cáo này?', async () => {
      setActionLoading(true);
      try {
        const { error } = await supabase
          .from('question_reports')
          .delete()
          .eq('id', reportId);
        if (error) throw error;
        await fetchReports();
        setSelectedReport(null);
      } catch (err) {
        console.error('Error deleting report:', err);
        showAlert('Lỗi', err.message);
      }
      setActionLoading(false);
    });
  };

  const handleSaveAdminReply = async (reportId) => {
    setActionLoading(true);
    try {
      const cleanReply = adminReplyDraft.trim();
      const updates = {
        admin_reply: cleanReply || null,
        admin_replied_at: cleanReply ? new Date().toISOString() : null,
      };
      if (cleanReply) {
        updates.status = 'resolved';
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('question_reports')
        .update(updates)
        .eq('id', reportId);
      if (error) throw error;
      await fetchReports();
      const { data: refreshed } = await supabase
        .from('question_reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();
      if (refreshed) {
        setSelectedReport((prev) => ({
          ...(prev || {}),
          ...refreshed,
        }));
      }
      showAlert('Thành công', cleanReply ? 'Đã lưu phản hồi ẩn danh cho user.' : 'Đã xóa phản hồi admin.');
    } catch (err) {
      console.error('Error saving admin reply:', err);
      showAlert('Lỗi', err.message);
    }
    setActionLoading(false);
  };

  const handleDeleteQuestion = async (report) => {
    showConfirm('Cảnh báo nguy hiểm', `Bạn có chắc chắn muốn XÓA câu hỏi "${report.question_content}..." khỏi đề thi "${report.exam_title}"?\n\nHành động này KHÔNG THỂ hoàn tác!`, async () => {
      setActionLoading(true);
      try {
        const { error: childDeleteError } = await supabase
          .from('questions')
          .delete()
          .eq('exam_id', report.exam_id)
          .eq('parent_id', report.question_id);

        if (childDeleteError) throw childDeleteError;

        const { error: questionDeleteError } = await supabase
          .from('questions')
          .delete()
          .eq('exam_id', report.exam_id)
          .eq('id', report.question_id);

        if (questionDeleteError) throw questionDeleteError;

        const { count, error: countError } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', report.exam_id);

        if (countError) throw countError;

        const { error: updateTotalError } = await supabase
          .from('exams')
          .update({ total_q: count || 0 })
          .eq('id', report.exam_id);

        if (updateTotalError) throw updateTotalError;

        // Mark report as resolved
        await supabase
          .from('question_reports')
          .update({ status: 'resolved', resolved_at: new Date().toISOString() })
          .eq('id', report.id);

        await fetchReports();
        setSelectedReport(null);
        showAlert('Thành công', 'Đã xóa câu hỏi và đánh dấu báo cáo đã xử lý.');
      } catch (err) {
        console.error('Error deleting question:', err);
        showAlert('Lỗi', err.message);
      } finally {
        setActionLoading(false);
      }
    });
  };

  const filteredReports = reports.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (r.question_content || '').toLowerCase().includes(q) ||
        (r.exam_title || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q) ||
        (r.profiles?.full_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  useEffect(() => {
    if (!selectedReport?.id) return;
    const latest = reports.find((r) => r.id === selectedReport.id);
    if (latest) {
      const timer = setTimeout(() => {
        setSelectedReport((prev) => ({ ...(prev || {}), ...latest }));
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [reports, selectedReport?.id]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{pendingCount}</div>
              <div className="text-xs text-white/50 font-semibold">Chờ xử lý</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{reports.filter(r => r.status === 'resolved').length}</div>
              <div className="text-xs text-white/50 font-semibold">Đã xử lý</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{reports.length}</div>
              <div className="text-xs text-white/50 font-semibold">Tổng báo cáo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white/[0.02] p-3 sm:p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm báo cáo (nội dung, người gửi...)"
            className="bg-transparent text-sm text-white placeholder:text-white/30 outline-none flex-1 font-medium"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Status Pills */}
          <div className="flex items-center bg-[#14142a] p-1 rounded-xl border border-white/10 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'all' ? 'bg-indigo-500 text-white shadow-md' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Chờ xử lý
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'resolved' ? 'bg-emerald-500 text-white shadow-md' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Đã xử lý
            </button>
          </div>

          <button
            onClick={fetchReports}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full sm:w-auto flex justify-center items-center gap-2"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="sm:hidden text-sm font-semibold">Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Report List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-white/40 font-medium animate-pulse">Đang tải báo cáo...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white/3 rounded-2xl border border-white/8">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-lg font-bold text-white/70 mb-1">Không có báo cáo nào</h3>
          <p className="text-sm text-white/40">
            {filterStatus !== 'all' ? 'Thử thay đổi bộ lọc trạng thái.' : 'Chưa có học sinh nào gửi báo cáo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => {
            const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConf.icon;
            const reasonLabel = REASON_LABELS[report.reason] || report.reason;

            return (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-2xl p-3.5 sm:p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {report.profiles?.avatar_url ? (
                      <Image src={report.profiles.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                        {(report.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-none">{report.profiles?.full_name || 'Ẩn danh'}</span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                        style={{ background: statusConf.bg, color: statusConf.color }}
                      >
                        {statusConf.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400">
                        {reasonLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/40 mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px] sm:max-w-none">{report.exam_title || 'Không rõ đề thi'}</span>
                      <span>·</span>
                      <span>{new Date(report.created_at).toLocaleDateString('vi-VN')} {new Date(report.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2">
                      <span className="text-white/30 font-medium">Câu hỏi: </span>
                      {report.question_content || 'Không có nội dung'}
                    </p>
                    {report.note && (
                      <p className="text-xs text-white/40 mt-1 italic">
                        💬 {`"${report.note}"`}
                      </p>
                    )}
                    {report.admin_reply && (
                      <p className="text-xs text-emerald-300/80 mt-1">
                        Đã phản hồi cho user
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="hidden sm:flex shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {report.status === 'pending' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResolve(report.id); }}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        title="Đánh dấu đã xử lý"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Xóa báo cáo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex sm:hidden items-center gap-2">
                  {report.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResolve(report.id); }}
                      className="flex-1 p-2 rounded-lg bg-green-500/15 text-green-300 hover:bg-green-500/25 transition-colors text-xs font-bold"
                    >
                      Đã xử lý
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                    className="flex-1 p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors text-xs font-bold"
                  >
                    Xóa report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedReport(null)}>
          <div className="bg-[#14142a] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:w-[90%] max-w-lg p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Chi tiết báo cáo
              </h3>
              <button onClick={() => setSelectedReport(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {selectedReport.profiles?.avatar_url ? (
                    <Image src={selectedReport.profiles.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                      {(selectedReport.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-white">{selectedReport.profiles?.full_name || 'Ẩn danh'}</div>
                    <div className="text-xs text-white/40">{new Date(selectedReport.created_at).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Đề thi</div>
                  <div className="text-sm text-white font-medium truncate">{selectedReport.exam_title || 'N/A'}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Lý do</div>
                  <div className="text-sm font-medium" style={{ color: '#ef4444' }}>
                    {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-[10px] font-bold text-white/40 uppercase mb-2">Nội dung câu hỏi</div>
                <p className="text-sm text-white/70 leading-relaxed">{selectedReport.question_content || 'Không có nội dung'}</p>
              </div>

              {selectedReport.note && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                  <div className="text-[10px] font-bold text-amber-400/60 uppercase mb-2">Ghi chú từ học sinh</div>
                  <p className="text-sm text-amber-200/80 leading-relaxed italic">{selectedReport.note}</p>
                </div>
              )}

              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="text-[10px] font-bold text-emerald-300/70 uppercase mb-2">Phản hồi ẩn danh cho user</div>
                <textarea
                  value={adminReplyDraft}
                  onChange={(e) => setAdminReplyDraft(e.target.value)}
                  placeholder="Nhập phản hồi để user thấy trong hồ sơ (sẽ hiển thị dưới tên Đội ngũ YeuHoc)..."
                  rows={3}
                  className="w-full rounded-xl bg-[#0f1021] border border-white/10 px-3 py-2 text-sm text-white/80 placeholder:text-white/35 outline-none focus:border-emerald-400/50"
                />
                {selectedReport.admin_replied_at && (
                  <p className="text-[11px] text-emerald-200/60 mt-2">
                    Cập nhật lần cuối: {new Date(selectedReport.admin_replied_at).toLocaleString('vi-VN')}
                  </p>
                )}
                <button
                  onClick={() => handleSaveAdminReply(selectedReport.id)}
                  disabled={actionLoading}
                  className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  Lưu phản hồi cho user
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2">
                {selectedReport.status === 'pending' && (
                  <button
                    onClick={() => handleResolve(selectedReport.id)}
                    disabled={actionLoading}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Đã xử lý xong
                  </button>
                )}
                <button
                  onClick={() => handleDeleteQuestion(selectedReport)}
                  disabled={actionLoading}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa câu hỏi
                </button>
                <button
                  onClick={() => handleDeleteReport(selectedReport.id)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Xóa báo cáo
                </button>
              </div>

              {/* Edit exam action */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (onEditExam && selectedReport.exam_id) {
                       onEditExam(selectedReport.exam_id, selectedReport.question_id);
                       setSelectedReport(null); // Đóng modal báo cáo
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Đi tới trang sửa đề thi này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
