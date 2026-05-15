'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Copy, FileUp, Loader2, Sparkles } from 'lucide-react';
import { parseQuizText } from '@/lib/parser';
import { supabase } from '@/lib/supabase';
import { getAdminApiHeaders } from '@/lib/adminApi';

const ACCEPTED = '.txt,.pdf,.docx,.png,.jpg,.jpeg';

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

async function dataUrlToFile(dataUrl, filename, mimeType) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType || blob.type || 'image/png' });
}

async function attachImageCandidates(questions, candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return questions;

  let sequentialIndex = 0;
  const byQuestionId = new Map(
    candidates
      .filter((candidate) => candidate.questionId)
      .map((candidate) => [String(candidate.questionId), candidate]),
  );

  const enhanced = [];
  for (const question of questions) {
    let candidate = byQuestionId.get(String(question.id));
    if (!candidate && question.needsImageReview) {
      candidate = candidates[sequentialIndex];
      sequentialIndex += 1;
    }

    if (candidate?.dataUrl) {
      const file = await dataUrlToFile(
        candidate.dataUrl,
        candidate.filename || `ai-image-${question.id || sequentialIndex}.png`,
        candidate.mimeType,
      );
      enhanced.push({
        ...question,
        imageFile: file,
        image: URL.createObjectURL(file),
        needsImageReview: true,
        aiImageNote: candidate.note || 'AI tự gợi ý ảnh, vui lòng duyệt lại.',
      });
    } else {
      enhanced.push(question);
    }
  }

  return enhanced;
}

export default function AIExamGenerator({ onQuestionsReady, trackedRequestId = '', onTrackedRequestIdChange = null }) {
  const inputRef = useRef(null);
  const scanAbortRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [structuredText, setStructuredText] = useState('');
  const [meta, setMeta] = useState(null);
  const [scanRequestId, setScanRequestId] = useState('');
  const [progressLog, setProgressLog] = useState(null);
  const [lastLogAt, setLastLogAt] = useState(0);
  const [backendLogWarning, setBackendLogWarning] = useState('');
  const [importedRequestId, setImportedRequestId] = useState('');
  const [importWarning, setImportWarning] = useState('');

  useEffect(() => {
    if (!scanRequestId) return undefined;
    let cancelled = false;

    const poll = async () => {
      const { data } = await supabase
        .from('ocr_import_logs')
        .select('*')
        .eq('request_id', scanRequestId)
        .maybeSingle();
      if (!cancelled && data) {
        setProgressLog(data);
        setLastLogAt(Date.now());
      }
    };

    poll();
    const timer = setInterval(poll, 1200);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [scanRequestId]);

  useEffect(() => {
    if (!trackedRequestId) return;
    const timer = setTimeout(() => {
      setScanRequestId(trackedRequestId);
      setProgressLog((prev) => (
        prev?.request_id === trackedRequestId
          ? prev
          : {
              request_id: trackedRequestId,
              status: 'processing',
              stage: 'received',
              duration_ms: 0,
            }
      ));
      setLastLogAt(Date.now());
      setBackendLogWarning('');
    }, 0);
    return () => clearTimeout(timer);
  }, [trackedRequestId]);

  useEffect(() => {
    const tryImportFromLog = async () => {
      if (!progressLog || progressLog.request_id !== scanRequestId) return;
      if (importedRequestId === progressLog.request_id) return;

      // Skip failed logs — show error_message if available
      if (progressLog.status === 'failed') {
        setImportedRequestId(progressLog.request_id);
        if (progressLog.error_message) {
          setImportWarning(progressLog.error_message);
        }
        return;
      }

      if (progressLog.status !== 'success') return;

      // Early check: if question_count from DB is 0, skip parsing
      if (progressLog.question_count === 0) {
        setImportedRequestId(progressLog.request_id);
        setImportWarning(
          progressLog.error_message ||
          `OCR hoàn tất nhưng không tạo được câu hỏi hợp lệ (question_count = 0).`,
        );
        if (progressLog.structured_text) {
          setStructuredText(progressLog.structured_text);
        }
        return;
      }

      // Case 1: structured_text is missing from the polled log
      if (!progressLog.structured_text) {
        console.warn('[AIExamGenerator] OCR log success but structured_text is empty/null. question_count from log:', progressLog.question_count);
        // Try fetching structured_text via API fallback
        try {
          const res = await fetch(
            `/api/admin/ai-exam/logs/detail?requestId=${encodeURIComponent(progressLog.request_id)}`,
            { headers: await getAdminApiHeaders() },
          );
          if (res.ok) {
            const detail = await res.json();
            if (detail?.structured_text) {
              setProgressLog((prev) => ({ ...prev, structured_text: detail.structured_text, image_candidates: detail.image_candidates || prev?.image_candidates }));
              setImportWarning('');
              return; // Will re-trigger via dependency change
            }
          }
        } catch (fetchErr) {
          console.error('[AIExamGenerator] Fallback fetch for structured_text failed:', fetchErr);
        }
        setImportedRequestId(progressLog.request_id);
        setImportWarning(
          `OCR thành công nhưng không lấy được structured_text. Hãy kiểm tra bảng ocr_import_logs trên Supabase.`,
        );
        return;
      }

      try {
        const parsed = parseQuizText(progressLog.structured_text || '');
        if (parsed.length === 0) {
          console.warn('[AIExamGenerator] parseQuizText returned 0 questions from structured_text. Text length:', progressLog.structured_text?.length);
          setImportWarning(
            `OCR thành công nhưng parser không tìm thấy câu hỏi hợp lệ trong structured_text (${progressLog.structured_text?.length || 0} ký tự). ` +
            `Có thể format output từ AI chưa đúng ====START==== / ====END====.`,
          );
          setStructuredText(progressLog.structured_text || '');
          setImportedRequestId(progressLog.request_id);
          return;
        }
        const questions = await attachImageCandidates(parsed, progressLog.image_candidates || []);
        setStructuredText(progressLog.structured_text || '');
        setImportWarning('');
        setMeta({
          questionCount: questions.length,
          imageCandidateCount: progressLog.image_candidate_count || 0,
          usedOcr: !!progressLog.used_ocr,
          requestId: progressLog.request_id,
          totalTokens: progressLog.total_tokens || 0,
        });
        onQuestionsReady?.({
          questions,
          structuredText: progressLog.structured_text || '',
          fileName: progressLog.file_name || '',
          meta: {
            requestId: progressLog.request_id,
            usedOcr: !!progressLog.used_ocr,
          },
        });
        setImportedRequestId(progressLog.request_id);
      } catch (err) {
        console.error('[AIExamGenerator] Import from OCR log failed:', err);
        setImportWarning(`Lỗi khi import từ OCR log: ${err.message}`);
      }
    };

    tryImportFromLog();
  }, [progressLog, scanRequestId, importedRequestId, onQuestionsReady]);

  useEffect(() => {
    if (!isLoading || !scanRequestId) {
      const resetTimer = setTimeout(() => setBackendLogWarning(''), 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setInterval(() => {
      const elapsed = lastLogAt ? Date.now() - lastLogAt : 0;
      if (elapsed > 8000) {
        setBackendLogWarning(
          'Chưa nhận heartbeat log từ backend. Kiểm tra SUPABASE_SERVICE_ROLE_KEY, migration ocr_import_logs, hoặc quyền đọc bảng.',
        );
      } else {
        setBackendLogWarning('');
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [isLoading, scanRequestId, lastLogAt]);

  const stageLabel = (stage) => {
    if (!stage) return 'Đang xử lý...';
    const map = {
      received: 'Đã nhận file',
      reading_file: 'Đang đọc file',
      extract_txt: 'Đang đọc TXT',
      extract_docx: 'Đang đọc DOCX',
      extract_pdf_text: 'Đang đọc text từ PDF',
      extract_pdf_ocr_needed: 'PDF scan, chuyển sang OCR',
      extract_image_ocr: 'Đang OCR ảnh',
      ocr_image: 'Đang OCR ảnh',
      ocr_pdf_render: 'Đang render PDF thành ảnh',
      normalizing: 'Đang chuẩn hóa đề thi',
      repairing: 'Đang sửa format output',
      parse_completed: 'Đã parse câu hỏi',
      repair_completed: 'Đã repair và parse xong',
    };
    if (stage.startsWith('ocr_pdf_page_')) {
      const display = stage.replace('ocr_pdf_page_', 'OCR trang ').replace('_of_', '/');
      return display;
    }
    return map[stage] || stage;
  };

  const getProgressPercent = (log) => {
    if (!log) return 0;
    if (log.status === 'success') return 100;
    if (log.status === 'failed') return 100;

    const stage = log.stage || '';
    if (stage.startsWith('ocr_pdf_page_')) {
      const match = stage.match(/^ocr_pdf_page_(\d+)_of_(\d+)$/);
      if (match) {
        const current = Number(match[1]);
        const total = Number(match[2]);
        if (total > 0) {
          const ratio = Math.max(0, Math.min(1, current / total));
          return Math.round(30 + ratio * 45); // OCR page loop takes big portion
        }
      }
    }

    const stagePercent = {
      received: 5,
      reading_file: 10,
      extract_txt: 25,
      extract_docx: 25,
      extract_pdf_text: 20,
      extract_pdf_ocr_needed: 30,
      extract_image_ocr: 35,
      ocr_image: 45,
      ocr_pdf_render: 30,
      normalizing: 80,
      repairing: 90,
      parse_completed: 100,
      repair_completed: 100,
    };
    return stagePercent[stage] ?? 15;
  };

  const handleFile = (nextFile) => {
    setError('');
    setStructuredText('');
    setMeta(null);
    setBackendLogWarning('');
    setImportWarning('');
    if (!nextFile) return;
    setFile(nextFile);
  };

  const handleScan = async () => {
    if (!file || isLoading) return;

    setIsLoading(true);
    setError('');
    setStructuredText('');
    setMeta(null);
    const requestId = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    setScanRequestId(requestId);
    onTrackedRequestIdChange?.(requestId);
    setProgressLog({
      request_id: requestId,
      status: 'processing',
      stage: 'received',
      file_name: file.name,
      duration_ms: 0,
    });
    setLastLogAt(Date.now());
    setBackendLogWarning('');
    setImportWarning('');
    setImportedRequestId('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('request_id', requestId);
      const controller = new AbortController();
      scanAbortRef.current = controller;

      const response = await fetch('/api/admin/ai-exam/import', {
        method: 'POST',
        headers: await getAdminApiHeaders(),
        body: formData,
        signal: controller.signal,
      });

      let data = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (response.status === 413) {
          throw new Error('File tải lên quá lớn (Lỗi 413: Payload Too Large).');
        }
        throw new Error(`Lỗi máy chủ (${response.status}): ${text.substring(0, 150)}...`);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Không thể quét đề bằng AI.');
      }

      const parsed = parseQuizText(data.structuredText || '');
      if (parsed.length === 0) {
        throw new Error('AI đã trả text nhưng parser không tìm thấy câu hỏi hợp lệ.');
      }

      const questions = await attachImageCandidates(parsed, data.imageCandidates || []);

      setStructuredText(data.structuredText || '');
      setMeta({
        ...(data.meta || {}),
        questionCount: questions.length,
        imageCandidateCount: data.imageCandidates?.length || 0,
        totalTokens: data.meta?.totalTokens || 0,
      });
      setScanRequestId(data?.meta?.requestId || requestId);
      onTrackedRequestIdChange?.(data?.meta?.requestId || requestId);
      setImportedRequestId(data?.meta?.requestId || requestId);
      onQuestionsReady?.({
        questions,
        structuredText: data.structuredText || '',
        fileName: file.name,
        meta: data.meta || {},
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('Đã hủy tiến trình OCR.');
      } else {
        // If the progress log already shows success, don't show a confusing
        // fetch error — the fallback tryImportFromLog path will handle import.
        const logAlreadySucceeded = progressLog?.request_id === requestId && progressLog?.status === 'success';
        if (logAlreadySucceeded) {
          console.warn('[AIExamGenerator] Direct API fetch failed but backend log shows success. Relying on polling fallback.', err.message);
          // Reset importedRequestId so tryImportFromLog can pick it up
          setImportedRequestId('');
        } else {
          setError(err.message || 'Không thể quét đề bằng AI.');
        }
      }
    } finally {
      setIsLoading(false);
      setBackendLogWarning('');
      scanAbortRef.current = null;
    }
  };

  const handleCancelProgress = async () => {
    if (!scanRequestId) return;

    try {
      scanAbortRef.current?.abort();
      await fetch('/api/admin/ai-exam/cancel', {
        method: 'POST',
        headers: await getAdminApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ requestId: scanRequestId, cancelledBy: 'user' }),
      });
      setProgressLog((prev) => ({
        ...(prev || {}),
        request_id: scanRequestId,
        status: 'failed',
        stage: 'cancelled_by_user',
        error_message: 'Đã hủy bởi người dùng.',
      }));
      setIsLoading(false);
      setError('Đã hủy tiến trình OCR.');
    } catch (error) {
      setError(error.message || 'Không thể hủy tiến trình OCR.');
    }
  };

  const handleDeleteCompletedProgress = async () => {
    if (!scanRequestId) return;
    try {
      const response = await fetch('/api/admin/ai-exam/logs/delete', {
        method: 'POST',
        headers: await getAdminApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ requestId: scanRequestId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Không thể xóa tiến trình.');

      setScanRequestId('');
      setProgressLog(null);
      setBackendLogWarning('');
      setImportedRequestId('');
      onTrackedRequestIdChange?.('');
    } catch (error) {
      setError(error.message || 'Không thể xóa tiến trình đã hoàn thành.');
    }
  };

  const isShowingProgress = Boolean(scanRequestId) && (isLoading || trackedRequestId);
  const effectiveLog = progressLog?.request_id === scanRequestId ? progressLog : null;

  const handleCopy = async () => {
    if (!structuredText) return;
    await navigator.clipboard?.writeText(structuredText);
  };

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white">Tạo đề bằng AI</h3>
          <p className="text-xs sm:text-sm text-white/45 mt-1 leading-relaxed">
            Upload PDF/DOCX/PNG/JPG để DeepSeek OCR chuyển thành định dạng .txt rồi tự parse vào editor.
          </p>
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-5 transition-all ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/15 text-indigo-200'
            : 'border-white/15 bg-white/5 text-white/50 hover:border-indigo-400/50 hover:text-white/70'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={(event) => handleFile(event.target.files?.[0])}
          className="hidden"
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <FileUp className="w-6 h-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {file ? file.name : 'Kéo thả hoặc chọn file đề thi'}
            </p>
            <p className="text-xs text-white/35 mt-1">Hỗ trợ TXT, PDF, DOCX, PNG, JPG. Tối đa 25MB.</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleScan}
        disabled={!file || isLoading}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {isLoading ? 'Đang quét bằng AI...' : 'Quét bằng AI'}
      </button>
      {scanRequestId && (
        <button
          type="button"
          onClick={handleCancelProgress}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm font-bold hover:bg-red-500/25 transition-all"
        >
          Hủy tiến trình OCR
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isShowingProgress && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/75 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-white/85">Tiến trình OCR realtime</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setScanRequestId('');
                  setProgressLog(null);
                  setBackendLogWarning('');
                  onTrackedRequestIdChange?.('');
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80 transition-colors"
                title="Ẩn tiến trình"
              >
                Ẩn
              </button>
              {scanRequestId && (
                <button
                  type="button"
                  onClick={handleCancelProgress}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-200 hover:bg-red-500/25 transition-colors"
                  title="Hủy tiến trình OCR"
                >
                  Hủy
                </button>
              )}
              {scanRequestId && effectiveLog?.status && effectiveLog.status !== 'processing' && (
                <button
                  type="button"
                  onClick={handleDeleteCompletedProgress}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
                  title="Xóa tiến trình đã hoàn thành"
                >
                  Xóa
                </button>
              )}
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              effectiveLog?.status === 'failed'
                ? 'bg-red-500/20 text-red-300'
                : effectiveLog?.status === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-indigo-500/20 text-indigo-300'
            }`}
            >
              {effectiveLog?.status || (isLoading ? 'processing' : 'idle')}
            </span>
            </div>
          </div>
          <div className="text-white/70">
            <span className="text-white/45">Stage: </span>
            {stageLabel(effectiveLog?.stage)}
          </div>
          {scanRequestId && (
            <div className="text-white/60 break-all">
              <span className="text-white/40">request_id: </span>
              {scanRequestId}
            </div>
          )}
          <div className="text-white/60">
            <span className="text-white/40">Thời gian: </span>
            {formatDuration(effectiveLog?.duration_ms)}
          </div>
          {effectiveLog?.total_tokens > 0 && (
            <div className="text-amber-400/80 font-medium">
              <span className="text-white/40 font-normal">Tokens: </span>
              {formatNumber(effectiveLog.total_tokens)}
            </div>
          )}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] text-white/55 mb-1">
              <span>Tiến độ ước lượng</span>
              <span>{getProgressPercent(effectiveLog)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  effectiveLog?.status === 'failed' ? 'bg-red-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${getProgressPercent(effectiveLog)}%` }}
              />
            </div>
          </div>
          {backendLogWarning && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-amber-200 whitespace-pre-wrap break-words">
              {backendLogWarning}
            </div>
          )}
          {importWarning && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-amber-200 whitespace-pre-wrap break-words">
              ⚠️ {importWarning}
            </div>
          )}
          {effectiveLog?.error_message && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-200 whitespace-pre-wrap break-words">
              {effectiveLog.error_message}
            </div>
          )}
        </div>
      )}

      {meta && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Đã parse {meta.questionCount} câu hỏi
            {meta.imageCandidateCount ? `, gợi ý ${meta.imageCandidateCount} ảnh` : ''}.
            {meta.usedOcr ? ' Có dùng DeepSeek OCR.' : ''}
            {meta.totalTokens ? ` Tiêu thụ: ${formatNumber(meta.totalTokens)} tokens.` : ''}
          </span>
        </div>
      )}

      {structuredText && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/35">Output .txt từ AI</p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white/50 hover:bg-white/10 hover:text-white"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-white/70 whitespace-pre-wrap">
            {structuredText}
          </pre>
        </div>
      )}
    </div>
  );
}
