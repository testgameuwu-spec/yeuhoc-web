'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const REPORT_REASONS = [
  { value: 'wrong_question', label: 'Sai đề / Đề bị lỗi' },
  { value: 'wrong_answer', label: 'Sai đáp án' },
  { value: 'wrong_solution', label: 'Sai lời giải' },
  { value: 'unclear', label: 'Đề không rõ ràng' },
  { value: 'missing_image', label: 'Thiếu hình ảnh' },
  { value: 'other', label: 'Lý do khác' },
];

export default function QuestionReportModal({
  reportModal,
  setReportModal,
  user,
  activeExam,
  showAlert,
  reportReasons = REPORT_REASONS,
}) {
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!reportModal.isOpen || !user?.id || !activeExam?.id || !reportModal.question?.id) {
        setExistingReport(null);
        return;
      }
      setLoadingExisting(true);
      try {
        const { data, error } = await supabase
          .from('question_reports')
          .select('id, status, reason, note, created_at, resolved_at, admin_reply, admin_replied_at')
          .eq('user_id', user.id)
          .eq('exam_id', activeExam.id)
          .eq('question_id', reportModal.question.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && !error) setExistingReport(data || null);
      } catch {
        if (!cancelled) setExistingReport(null);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [reportModal.isOpen, reportModal.question?.id, user?.id, activeExam?.id]);

  const handleSubmitReport = async () => {
    if (!reportReason || existingReport) return;
    setReportSubmitting(true);
    try {
      const { error } = await supabase.from('question_reports').insert({
        user_id: user?.id,
        exam_id: activeExam?.id,
        question_id: reportModal.question?.id,
        question_content: reportModal.question?.content?.substring(0, 200),
        reason: reportReason,
        note: reportNote,
        exam_title: activeExam?.title,
        status: 'pending',
      });
      if (error) throw error;
      setReportModal({ isOpen: false, question: null });
      setReportReason('');
      setReportNote('');
      showAlert('Đã gửi báo cáo', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý sớm nhất. Bạn có thể theo dõi trong Hồ sơ → Báo cáo câu hỏi.');
    } catch (err) {
      console.error('Report error:', err);
      showAlert('Lỗi', 'Không thể gửi báo cáo: ' + (err.message || 'Vui lòng thử lại.'));
    }
    setReportSubmitting(false);
  };

  if (!reportModal.isOpen) return null;

  const existingReasonLabel = existingReport
    ? (reportReasons.find((r) => r.value === existingReport.reason)?.label || existingReport.reason)
    : '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn p-3" onClick={() => setReportModal({ isOpen: false, question: null })}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-5 sm:p-6 shadow-xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">Báo cáo câu hỏi</h3>
            <p className="truncate text-xs text-gray-500">Câu {reportModal.question?.content?.substring(0, 50)}...</p>
          </div>
        </div>

        {loadingExisting ? (
          <p className="text-sm text-gray-500 mb-4">Đang kiểm tra báo cáo trước đó...</p>
        ) : existingReport ? (
          <div className="mb-5 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900">
            <p className="font-semibold mb-1">Bạn đã gửi báo cáo cho câu này</p>
            <p className="text-xs text-indigo-800/90 mb-2">
              Lý do: {existingReasonLabel}
              {existingReport.note ? ` — ${existingReport.note}` : ''}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide">
              Trạng thái:{' '}
              {existingReport.status === 'resolved' ? (
                <span className="text-green-700">Đã xử lý</span>
              ) : (
                <span className="text-amber-700">Đang chờ xử lý</span>
              )}
            </p>
            <p className="text-[11px] text-indigo-700/80 mt-2">
              Xem tất cả báo cáo tại Hồ sơ → Báo cáo câu hỏi.
            </p>
            {existingReport.admin_reply && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                  Phản hồi từ Đội ngũ YeuHoc
                </p>
                <p className="text-xs text-emerald-800 mt-1">{existingReport.admin_reply}</p>
                {existingReport.admin_replied_at && (
                  <p className="text-[11px] text-emerald-700/80 mt-1">
                    {new Date(existingReport.admin_replied_at).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

        <div className={`mb-4 ${existingReport ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Lý do báo cáo *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {reportReasons.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReportReason(r.value)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left"
                style={{
                  background: reportReason === r.value ? '#eef2ff' : '#f9fafb',
                  color: reportReason === r.value ? '#4338ca' : '#6b7280',
                  border: `1.5px solid ${reportReason === r.value ? '#818cf8' : '#e5e7eb'}`,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`mb-5 ${existingReport ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú thêm (không bắt buộc)</label>
          <textarea
            value={reportNote}
            onChange={e => setReportNote(e.target.value)}
            placeholder="Mô tả chi tiết vấn đề bạn gặp..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-1.5 border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none"
            style={{ border: '1.5px solid #e5e7eb' }}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => setReportModal({ isOpen: false, question: null })}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Đóng
          </button>
          {!existingReport && (
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={!reportReason || reportSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-md flex items-center justify-center gap-2"
              style={{
                background: reportReason ? '#ef4444' : '#d1d5db',
                cursor: reportReason && !reportSubmitting ? 'pointer' : 'not-allowed',
                opacity: reportSubmitting ? 0.7 : 1,
              }}
            >
              {reportSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
