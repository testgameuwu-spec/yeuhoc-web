'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Bell, ExternalLink, Inbox, Loader2, PlayCircle, Video, X } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { getPublishedNotifications, markNotificationsSeen } from '@/lib/notificationStore';

const NOTIFICATION_MARKDOWN_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'del', 'code',
    'blockquote', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'hr',
  ],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
};

function formatNotificationTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
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

export default function HomeNotifications() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeVideoId, setActiveVideoId] = useState(null);
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const autoOpenedIdsRef = useRef(new Set());
  const markingRef = useRef(false);
  const userId = user?.id || null;

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => notification.isUnread),
    [notifications]
  );
  const unreadCount = unreadNotifications.length;

  const markUnreadSeen = useCallback(async (items) => {
    if (!userId || markingRef.current) return;
    const unreadIds = (items || [])
      .filter((notification) => notification.isUnread)
      .map((notification) => notification.id);
    if (unreadIds.length === 0) return;

    markingRef.current = true;
    try {
      await markNotificationsSeen(userId, unreadIds);
      setNotifications((prev) => prev.map((notification) => (
        unreadIds.includes(notification.id)
          ? { ...notification, isUnread: false, seenAt: notification.seenAt || new Date().toISOString() }
          : notification
      )));
    } catch (markError) {
      console.warn('markNotificationsSeen failed:', markError);
    } finally {
      markingRef.current = false;
    }
  }, [userId]);

  const refreshNotifications = useCallback(async ({ autoOpen = false } = {}) => {
    if (!userId) {
      setNotifications([]);
      return [];
    }

    setLoading(true);
    setError('');
    try {
      const nextNotifications = await getPublishedNotifications(userId);
      setNotifications(nextNotifications);

      const unread = nextNotifications.filter((notification) => notification.isUnread);
      const unseenUnread = unread.filter((notification) => !autoOpenedIdsRef.current.has(notification.id));
      if (autoOpen && unseenUnread.length > 0) {
        unseenUnread.forEach((notification) => autoOpenedIdsRef.current.add(notification.id));
        setOpen(true);
        await markUnreadSeen(unread);
      }
      return nextNotifications;
    } catch (loadError) {
      console.warn('load notifications failed:', loadError);
      setError('Không thể tải thông báo.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [markUnreadSeen, userId]);

  useEffect(() => {
    let isMounted = true;
    let authSubscription = null;

    async function loadSession() {
      const { supabase } = await import('@/lib/supabase');
      if (!isMounted) return;

      const applySession = async (session) => {
        if (!isMounted) return;
        const sessionUser = session?.user || null;
        setUser(sessionUser);
        setAuthLoaded(true);
        autoOpenedIdsRef.current = new Set();

        if (!sessionUser) {
          setIsAdmin(false);
          setNotifications([]);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sessionUser.id)
          .maybeSingle();
        if (isMounted) setIsAdmin(profile?.role === 'admin');
      };

      const { data: { session } } = await supabase.auth.getSession();
      await applySession(session);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        applySession(session);
      });
      authSubscription = subscription;
    }

    loadSession();
    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    const timer = setTimeout(() => {
      refreshNotifications({ autoOpen: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshNotifications, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const onFocus = () => refreshNotifications({ autoOpen: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshNotifications, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let channel = null;
    let cancelled = false;

    async function subscribe() {
      const { supabase } = await import('@/lib/supabase');
      if (cancelled) return;
      channel = supabase
        .channel('home-notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          refreshNotifications({ autoOpen: true });
        })
        .subscribe();
    }

    subscribe();
    return () => {
      cancelled = true;
      if (channel) {
        import('@/lib/supabase').then(({ supabase }) => supabase.removeChannel(channel));
      }
    };
  }, [refreshNotifications, userId]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event) => {
      const clickedTrigger = wrapperRef.current?.contains(event.target);
      const clickedPanel = panelRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedPanel) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) setActiveVideoId(null);
    if (nextOpen) {
      let items = notifications;
      if (notifications.length === 0) {
        items = await refreshNotifications({ autoOpen: false });
      }
      await markUnreadSeen(items);
    }
  };

  if (!authLoaded || !user) return null;

  const panel = open ? (
    <>
      <div className="fixed inset-0 z-[9997] bg-black/20 sm:hidden" onClick={() => setOpen(false)} />
      <section
        ref={panelRef}
        className="home-notification-panel fixed inset-x-3 bottom-3 z-[9998] flex max-h-[min(72vh,520px)] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-16 sm:w-[380px] sm:max-h-[520px]"
      >
        <div className="home-notification-panel-header flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-[var(--app-text)]">Thông báo</h2>
            <p className="mt-0.5 text-xs font-medium text-[var(--app-muted)]">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa xem` : 'Bạn đã xem hết thông báo'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] transition-colors"
            aria-label="Đóng thông báo"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="home-notification-panel-body min-h-0 flex-1 overflow-y-auto p-3 sm:max-h-[380px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--home-brand-primary)]" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm font-medium text-rose-600">
              {error}
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className="home-notification-item overflow-hidden rounded-xl border p-3 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${notification.isUnread ? 'bg-rose-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-bold leading-snug text-[var(--app-text)]">{notification.title}</h3>
                      <NotificationMarkdown text={notification.body} />
                      <NotificationMedia
                        notification={notification}
                        active={activeVideoId === notification.id}
                        onActivate={() => setActiveVideoId(notification.id)}
                      />
                      <p className="mt-2 text-[11px] font-semibold text-[var(--app-muted)]">
                        {formatNotificationTime(notification.publishedAt || notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="home-notification-empty rounded-xl border border-dashed px-4 py-9 text-center">
              <Inbox className="mx-auto mb-3 h-9 w-9 text-[var(--app-muted-2)]" />
              <p className="text-sm font-semibold text-[var(--app-text-soft)]">Chưa có thông báo nào.</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="home-notification-panel-footer border-t px-3 py-3">
            <Link
              href="/admin?tab=notifications"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--home-brand-primary)] px-4 py-2.5 text-sm font-bold text-white no-underline transition-colors hover:bg-[var(--home-brand-hover)]"
              onClick={() => setOpen(false)}
            >
              Chỉnh thông báo
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </>
  ) : null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="theme-toggle home-notification-trigger relative"
        aria-label="Mở thông báo"
        title="Thông báo"
        aria-expanded={open}
      >
        <Bell className="theme-toggle-icon home-notification-icon" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
}

function NotificationMarkdown({ text }) {
  const html = useMemo(() => {
    const rendered = marked.parse(String(text || ''), { breaks: true, gfm: true });
    return DOMPurify.sanitize(rendered, NOTIFICATION_MARKDOWN_SANITIZE_CONFIG);
  }, [text]);

  return (
    <div
      className="markdown-content home-notification-markdown mt-1 text-sm leading-relaxed text-[var(--app-text-soft)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function NotificationMedia({ notification, active, onActivate }) {
  const imageUrl = isDisplayableMediaUrl(notification.imageUrl) ? notification.imageUrl : '';
  const videoUrl = isDisplayableMediaUrl(notification.videoUrl) ? notification.videoUrl : '';
  const posterUrl = isDisplayableMediaUrl(notification.videoPosterUrl)
    ? notification.videoPosterUrl
    : imageUrl;
  const alt = notification.mediaAlt || notification.title || 'Ảnh thông báo';

  if (videoUrl) {
    if (active) {
      return (
        <video
          src={videoUrl}
          poster={posterUrl || undefined}
          controls
          playsInline
          preload="metadata"
          className="mt-3 aspect-video w-full rounded-xl border border-gray-100 bg-black object-cover"
        />
      );
    }

    return (
      <button
        type="button"
        onClick={onActivate}
        className="group relative mt-3 aspect-video w-full overflow-hidden rounded-xl border border-gray-100 bg-slate-900 text-white"
        aria-label="Xem video thông báo"
      >
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={alt}
            fill
            sizes="(max-width: 640px) calc(100vw - 64px), 340px"
            className="object-cover opacity-85 transition-opacity group-hover:opacity-100"
            loading="lazy"
            fetchPriority="low"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <Video className="h-9 w-9 text-white/45" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <PlayCircle className="h-11 w-11 drop-shadow-lg" />
        </span>
      </button>
    );
  }

  if (!imageUrl) return null;

  return (
    <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes="(max-width: 640px) calc(100vw - 64px), 340px"
        className="object-cover"
        loading="lazy"
        fetchPriority="low"
      />
    </div>
  );
}
