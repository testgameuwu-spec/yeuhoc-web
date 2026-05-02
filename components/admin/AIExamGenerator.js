'use client';

import { useRef, useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Copy, FileUp, Loader2, Sparkles } from 'lucide-react';
import { parseQuizText } from '@/lib/parser';

const ACCEPTED = '.txt,.pdf,.docx,.png,.jpg,.jpeg';

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

export default function AIExamGenerator({ onQuestionsReady }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [structuredText, setStructuredText] = useState('');
  const [meta, setMeta] = useState(null);

  const handleFile = (nextFile) => {
    setError('');
    setStructuredText('');
    setMeta(null);
    if (!nextFile) return;
    setFile(nextFile);
  };

  const handleScan = async () => {
    if (!file || isLoading) return;

    setIsLoading(true);
    setError('');
    setStructuredText('');
    setMeta(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/yeuhoc/api/admin/ai-exam/import', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

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
      });
      onQuestionsReady?.({
        questions,
        structuredText: data.structuredText || '',
        fileName: file.name,
        meta: data.meta || {},
      });
    } catch (err) {
      setError(err.message || 'Không thể quét đề bằng AI.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Upload PDF/DOCX/PNG/JPG để DeepSeek OCR + DeepSeek V4 Pro chuyển thành định dạng .txt rồi tự parse vào editor.
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

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {meta && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Đã parse {meta.questionCount} câu hỏi
            {meta.imageCandidateCount ? `, gợi ý ${meta.imageCandidateCount} ảnh` : ''}.
            {meta.usedOcr ? ' Có dùng DeepSeek OCR.' : ''}
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
