import { supabase } from '@/lib/supabase';

function normalizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeMediaUrl(value) {
  const url = normalizeText(value);
  if (!url) return null;
  if (url.startsWith('/')) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
  } catch {
    // Fall through to a user-facing validation error.
  }

  throw new Error('Media URL phải là link http(s) hoặc đường dẫn bắt đầu bằng /.');
}

function mapNotificationFromDb(row, readMap = new Map()) {
  if (!row) return null;
  const seenAt = readMap.get(row.id) || row.seen_at || null;
  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    imageUrl: row.image_url || '',
    videoUrl: row.video_url || '',
    videoPosterUrl: row.video_poster_url || '',
    mediaAlt: row.media_alt || '',
    isPublished: row.is_published === true,
    publishedAt: row.published_at || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    seenAt,
    isUnread: !seenAt,
  };
}

export async function getPublishedNotifications(userId, { limit = 30 } = {}) {
  if (!userId) return [];

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, title, body, image_url, video_url, video_poster_url, media_alt, is_published, published_at, created_at, updated_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = notifications || [];
  const ids = rows.map((notification) => notification.id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: reads, error: readsError } = await supabase
    .from('notification_reads')
    .select('notification_id, seen_at')
    .eq('user_id', userId)
    .in('notification_id', ids);

  if (readsError) throw readsError;
  const readMap = new Map((reads || []).map((read) => [read.notification_id, read.seen_at]));
  return rows.map((row) => mapNotificationFromDb(row, readMap)).filter(Boolean);
}

export async function markNotificationsSeen(userId, notificationIds) {
  if (!userId) throw new Error('Thiếu user.');
  const ids = [...new Set((notificationIds || []).filter(Boolean))];
  if (ids.length === 0) return;

  const seenAt = new Date().toISOString();
  const rows = ids.map((notificationId) => ({
    user_id: userId,
    notification_id: notificationId,
    seen_at: seenAt,
  }));

  const { error } = await supabase
    .from('notification_reads')
    .upsert(rows, { onConflict: 'user_id,notification_id' });

  if (error) throw error;
}

export async function getAdminNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, image_url, video_url, video_poster_url, media_alt, is_published, published_at, created_by, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => mapNotificationFromDb(row)).filter(Boolean);
}

export async function saveNotification(notification, currentUserId) {
  const title = normalizeText(notification?.title);
  const body = normalizeText(notification?.body);
  if (!title) throw new Error('Vui lòng nhập tiêu đề thông báo.');
  if (!body) throw new Error('Vui lòng nhập nội dung thông báo.');

  const isPublished = notification?.isPublished === true;
  const payload = {
    title,
    body,
    image_url: normalizeMediaUrl(notification?.imageUrl),
    video_url: normalizeMediaUrl(notification?.videoUrl),
    video_poster_url: normalizeMediaUrl(notification?.videoPosterUrl),
    media_alt: normalizeText(notification?.mediaAlt) || null,
    is_published: isPublished,
    published_at: isPublished ? (notification?.publishedAt || new Date().toISOString()) : null,
  };

  if (notification?.id) {
    const { data, error } = await supabase
      .from('notifications')
      .update(payload)
      .eq('id', notification.id)
      .select()
      .single();

    if (error) throw error;
    return mapNotificationFromDb(data);
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert([{ ...payload, created_by: currentUserId || null }])
    .select()
    .single();

  if (error) throw error;
  return mapNotificationFromDb(data);
}

export async function deleteNotification(id) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
