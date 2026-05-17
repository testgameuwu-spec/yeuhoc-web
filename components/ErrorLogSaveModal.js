'use client';

import { useState } from 'react';
import { BookMarked, CheckCircle2, Loader2, X } from 'lucide-react';
import { ERROR_LOG_BATCH_OPTIONS, ERROR_LOG_REASONS } from '@/lib/errorLogStore';

export function ErrorLogSaveModal({
  isOpen,
  question,
  saving = false,
  onClose,
  onSave,
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const resetAndClose = () => {
    setReason('');
    setNote('');
    onClose();
  };

  const handleSave = () => {
    onSave({ reason, note });
    setReason('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm animate-fadeIn" onClick={resetAndClose}>
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--home-brand-soft)] text-[var(--home-brand-primary)]">
              <BookMarked className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-gray-950 [html[data-theme=dark]_&]:text-white">Lưu vào Nhật ký lỗi</h3>
              <p className="truncate text-xs font-medium text-gray-500 [html[data-theme=dark]_&]:text-white/60">
                Câu {question?.content?.replace(/\s+/g, ' ').slice(0, 64) || ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 [html[data-theme=dark]_&]:hover:bg-white/10 [html[data-theme=dark]_&]:hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-gray-700 [html[data-theme=dark]_&]:text-white/80">
            Nguyên nhân sai (không bắt buộc)
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ERROR_LOG_REASONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setReason((current) => (current === item.value ? '' : item.value))}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                  reason === item.value
                    ? 'border-[var(--home-brand-primary)] bg-[var(--home-brand-soft)] text-[var(--home-brand-primary)]'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-white [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-800 [html[data-theme=dark]_&]:text-white/70'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-bold text-gray-700 [html[data-theme=dark]_&]:text-white/80">
            Ghi chú thêm
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Ví dụ: quên công thức, đọc thiếu dữ kiện..."
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[var(--home-brand-primary)] focus:ring-2 focus:ring-[var(--home-brand-border)] [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-800 [html[data-theme=dark]_&]:text-white"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetAndClose}
            disabled={saving}
            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-60 [html[data-theme=dark]_&]:bg-white/10 [html[data-theme=dark]_&]:text-white/70"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--home-brand-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--home-brand-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorLogBatchModal({
  isOpen,
  title = 'Lưu vào Nhật ký lỗi?',
  message = 'Bạn muốn lưu những câu nào để ôn lại sau?',
  saving = false,
  onClose,
  onSelect,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-gray-950 [html[data-theme=dark]_&]:text-white">{title}</h3>
            <p className="mt-1 text-sm font-medium leading-relaxed text-gray-500 [html[data-theme=dark]_&]:text-white/60">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60 [html[data-theme=dark]_&]:hover:bg-white/10 [html[data-theme=dark]_&]:hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {ERROR_LOG_BATCH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              disabled={saving}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                option.value === 'none'
                  ? 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 [html[data-theme=dark]_&]:border-white/10 [html[data-theme=dark]_&]:bg-slate-800 [html[data-theme=dark]_&]:text-white/70'
                  : 'border-[var(--home-brand-border)] bg-[var(--home-brand-soft)] text-[var(--home-brand-primary)] hover:border-[var(--home-brand-primary)]'
              }`}
            >
              <span>{option.label}</span>
              {saving && option.value !== 'none' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
