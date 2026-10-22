import type { Href } from 'expo-router';

import { apiFetch } from '@/lib/api/client';
import {
  setCachedSettings,
  type AppNotification,
  type NotificationSettings,
  type NotificationType,
} from './notificationsStore';

type ApiNotification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  tone: '' | 'danger';
  read: boolean;
  created_at: string;
};

type Page<T> = { count: number; next: string | null; results: T[] };

const toNotification = (n: ApiNotification): AppNotification => ({
  id: String(n.id),
  type: n.type,
  title: n.title,
  body: n.body,
  createdAt: n.created_at,
  read: n.read,
  link: (n.link || undefined) as Href | undefined,
  tone: n.tone || undefined,
});

export type NotificationPage = { items: AppNotification[]; count: number; hasMore: boolean };

/** Hộp thư, mới nhất trước; unread = chỉ thông báo chưa đọc */
export async function listNotifications({ page = 1, unread = false } = {}): Promise<NotificationPage> {
  const query = `page=${page}${unread ? '&unread=1' : ''}`;
  const data = await apiFetch<Page<ApiNotification>>(`/notifications/?${query}`);
  return { items: data.results.map(toNotification), count: data.count, hasMore: data.next !== null };
}

export async function markRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read/`, { method: 'POST' });
}

export async function markAllRead(): Promise<void> {
  await apiFetch('/notifications/read-all/', { method: 'POST' });
}

export async function getUnreadCount(): Promise<number> {
  return (await apiFetch<{ count: number }>('/notifications/unread-count/')).count;
}

export async function getSettings(): Promise<NotificationSettings> {
  const s = await apiFetch<NotificationSettings>('/notifications/settings/');
  setCachedSettings(s);
  return s;
}

export async function updateSettings(input: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const s = await apiFetch<NotificationSettings>('/notifications/settings/', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  setCachedSettings(s);
  return s;
}
