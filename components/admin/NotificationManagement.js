'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Bell, CheckCircle2, Edit3, EyeOff, ImageIcon, Loader2, PlayCircle, Plus, Save, Search, Send, Trash2, Video, WandSparkles, XCircle
} from 'lucide-react';
import { getAdminApiHeaders } from '@/lib/adminApi';
import { supabase } from '@/lib/supabase';
import { deleteNotification, getAdminNotifications, saveNotification } from '@/lib/notificationStore';

const emptyForm = {
  id: null,
  title: '',
  body: '',
  imageUrl: '',
  videoUrl: '',
  videoPosterUrl: '',
  mediaAlt: '',
  isPublished: false,
  publishedAt: null,
};

function formatDateTime(value) {
  if (!value) return 'Chưa publish';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Không rõ thời gian';
  }
}

function formFromNotification(notification) {
  if (!notification) return emptyForm;
  return {
    id: notification.id,
    title: notification.title || '',
    body: notification.body || '',
    imageUrl: notification.imageUrl || '',
    videoUrl: notification.videoUrl || '',
    videoPosterUrl: notification.videoPosterUrl || '',
    mediaAlt: notification.mediaAlt || '',
    isPublished: notification.isPublished === true,
    publishedAt: notification.publishedAt || null,
  };
}

function isDisplayableMediaUrl(value) {
  const url = String(value || '').trim();
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function NotificationManagement({ showAlert, showConfirm }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [sourceSummary, setSourceSummary] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: { session } }, rows] = await Promise.all([
        supabase.auth.getSession(),
        getAdminNotifications(),
      ]);
      setCurrentUserId(session?.user?.id || null);
      setNotifications(rows);

      if (selectedId && !rows.some((notification) => notification.id === selectedId)) {
        setSelectedId(null);
        setForm(emptyForm);
      }
    } catch (error) {
      showAlert?.('Lỗi tải thông báo', `${error.message}\n\nHãy chạy migration notifications mới nhất trên Supabase.`);
    } finally {
      setLoading(false);
    }
  }, [selectedId, showAlert]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (statusFilter === 'published' && !notification.isPublished) return false;
      if (statusFilter === 'draft' && notification.isPublished) return false;
      if (!q) return true;
      return (
        notification.title.toLowerCase().includes(q)
        || notification.body.toLowerCase().includes(q)
      );
    });
  }, [notifications, search, statusFilter]);

  const publishedCount = notifications.filter((notification) => notification.isPublished).length;
  const draftCount = notifications.length - publishedCount;
  const selectedNotification = notifications.find((notification) => notification.id === selectedId) || null;

  const openCreateForm = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setSourceSummary('');
  };

  const openEditForm = (notification) => {
    setSelectedId(notification.id);
    setForm(formFromNotification(notification));
    setSourceSummary('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await saveNotification(form, currentUserId);
      setSelectedId(saved.id);
      setForm(formFromNotification(saved));
      setSourceSummary('');
      await fetchNotifications();
      showAlert?.('Thành công', saved.isPublished ? 'Đã lưu và publish thông báo.' : 'Đã lưu nháp thông báo.');
    } catch (error) {
      showAlert?.('Lỗi lưu thông báo', error.message || 'Không thể lưu thông báo.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (notification) => {
    setSaving(true);
    try {
      const nextIsPublished = !notification.isPublished;
      const saved = await saveNotification({
        ...notification,
        isPublished: nextIsPublished,
        publishedAt: nextIsPublished ? new Date().toISOString() : null,
      }, currentUserId);
      if (selectedId === notification.id) {
        setForm(formFromNotification(saved));
      }
      await fetchNotifications();
      showAlert?.('Thành công', nextIsPublished ? 'Đã publish thông báo.' : 'Đã chuyển về nháp.');
    } catch (error) {
      showAlert?.('Lỗi cập nhật', error.message || 'Không thể cập nhật trạng thái thông báo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (notification) => {
    showConfirm?.(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa thông báo "${notification.title}"?\n\nTrạng thái đã xem của user cho thông báo này cũng sẽ bị xóa.`,
      async () => {
        try {
          await deleteNotification(notification.id);
          if (selectedId === notification.id) {
            setSelectedId(null);
            setForm(emptyForm);
          }
          await fetchNotifications();
          showAlert?.('Thành công', 'Đã xóa thông báo.');
        } catch (error) {
          showAlert?.('Lỗi xóa thông báo', error.message || 'Không thể xóa thông báo.');
        }
      }
    );
  };

  const handleGenerateDraft = async () => {
    setGenerating(true);
    setSourceSummary('');
    try {
      const headers = await getAdminApiHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('/api/admin/notifications/generate', {
        method: 'POST',
        headers,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tạo nháp bằng AI.');
      }

      if (payload.hasChanges === false || !payload.title || !payload.body) {
        showAlert?.('Chưa có thay đổi mới', payload.sourceSummary || 'Không có đề hoặc thư mục mới để viết thông báo.');
        return;
      }

      setSelectedId(null);
      setForm({
        id: null,
        title: payload.title,
        body: payload.body,
        imageUrl: '',
        videoUrl: '',
        videoPosterUrl: '',
        mediaAlt: '',
        isPublished: false,
        publishedAt: null,
      });
      setSourceSummary(payload.sourceSummary || '');
    } catch (error) {
      showAlert?.('Lỗi AI viết nháp', error.message || 'Không thể tạo nháp bằng AI.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/35">Tổng thông báo</p>
          <p className="mt-2 text-3xl font-black text-white">{notifications.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300/70">Đã publish</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{publishedCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300/70">Nháp</p>
          <p className="mt-2 text-3xl font-black text-amber-300">{draftCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                Chỉnh thông báo
              </h2>
              <p className="text-sm text-white/40 mt-1">Quản lý thông báo xuất hiện trên trang chủ.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm thông báo..."
                  className="w-full sm:w-64 pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <button
                type="button"
                onClick={openCreateForm}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tạo mới
              </button>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={generating}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-400 hover:to-purple-500 disabled:opacity-60 transition-all"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                AI viết nháp
              </button>
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3 flex flex-wrap gap-2">
            {[
              ['all', 'Tất cả'],
              ['published', 'Published'],
              ['draft', 'Draft'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  statusFilter === key
                    ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                    : 'border-white/10 bg-white/5 text-white/45 hover:text-white/75'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="divide-y divide-white/10">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openEditForm(notification)}
                  className={`w-full p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors ${
                    selectedId === notification.id ? 'bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate">{notification.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                          notification.isPublished
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                        }`}>
                          {notification.isPublished ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {notification.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/55">{notification.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-white/35">
                        <span>{formatDateTime(notification.publishedAt || notification.createdAt)}</span>
                        {notification.videoUrl && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                            <Video className="h-3 w-3" /> Video
                          </span>
                        )}
                        {notification.imageUrl && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                            <ImageIcon className="h-3 w-3" /> Ảnh
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="p-2 rounded-xl text-indigo-300 border border-indigo-500/20 bg-indigo-500/10"
                        title="Sửa thông báo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-white/50">Chưa có thông báo phù hợp.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">{form.id ? 'Sửa thông báo' : 'Tạo nháp thông báo'}</h2>
            <p className="text-sm text-white/40 mt-1">AI chỉ điền nháp; admin vẫn tự lưu hoặc publish.</p>
          </div>

          <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Tiêu đề</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="VD: Đã có bộ đề mới"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Nội dung</label>
              <textarea
                value={form.body}
                onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="Nội dung thông báo ngắn gọn..."
                rows={7}
                className="w-full resize-none px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm leading-relaxed focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <ImageIcon className="h-4 w-4 text-indigo-400" />
                  Media preview
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/35">
                  Thêm ảnh hoặc video vào thông báo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Image URL</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://.../preview.webp"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Video URL</label>
                <input
                  type="text"
                  value={form.videoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
                  placeholder="https://.../preview.mp4"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Video poster URL</label>
                <input
                  type="text"
                  value={form.videoPosterUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, videoPosterUrl: event.target.value }))}
                  placeholder="Để trống sẽ dùng Image URL làm poster"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Alt text</label>
                <input
                  type="text"
                  value={form.mediaAlt}
                  onChange={(event) => setForm((prev) => ({ ...prev, mediaAlt: event.target.value }))}
                  placeholder="Mô tả ngắn cho ảnh/video"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <AdminMediaPreview form={form} />
            </div>

            {sourceSummary && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-300/70">Nguồn AI</p>
                <p className="mt-1 text-sm leading-relaxed text-indigo-100/80">{sourceSummary}</p>
              </div>
            )}

            <label className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
              <span>
                <span className="block text-sm font-semibold text-white">Publish ngay</span>
                <span className="block text-xs text-white/35 mt-0.5">User sẽ thấy thông báo trên trang chủ.</span>
              </span>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  isPublished: event.target.checked,
                  publishedAt: event.target.checked ? (prev.publishedAt || new Date().toISOString()) : null,
                }))}
                className="w-5 h-5 accent-indigo-500"
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu
              </button>

              {selectedNotification && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleTogglePublish(selectedNotification)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      selectedNotification.isPublished
                        ? 'text-amber-300 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15'
                        : 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15'
                    }`}
                  >
                    {selectedNotification.isPublished ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {selectedNotification.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDelete(selectedNotification)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-300 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa
                  </button>
                </>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function AdminMediaPreview({ form }) {
  const imageUrl = isDisplayableMediaUrl(form.imageUrl) ? form.imageUrl : '';
  const videoUrl = isDisplayableMediaUrl(form.videoUrl) ? form.videoUrl : '';
  const posterUrl = isDisplayableMediaUrl(form.videoPosterUrl) ? form.videoPosterUrl : imageUrl;
  const alt = form.mediaAlt || form.title || 'Preview thông báo';

  if (videoUrl) {
    return (
      <div className="space-y-2">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={alt}
              fill
              sizes="420px"
              className="object-cover opacity-80"
              loading="lazy"
              fetchPriority="low"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="h-10 w-10 text-white/35" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="420px"
          className="object-cover"
          loading="lazy"
          fetchPriority="low"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
      <ImageIcon className="mx-auto mb-2 h-8 w-8 text-white/20" />
      <p className="text-xs font-medium text-white/35">Chưa có media preview.</p>
    </div>
  );
}
