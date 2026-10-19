// Thông báo trong app (sống trong bộ nhớ, mất khi tải lại app).
// TODO: thay bằng API thông báo + push notification khi có backend.
import type { Href } from 'expo-router';

export type NotificationType = 'budget' | 'ocr' | 'advice' | 'reminder' | 'security';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** ISO 8601 */
  createdAt: string;
  read: boolean;
  /** Màn mở ra khi chạm vào thông báo */
  link?: Href;
  /** danger: tô đỏ (vd. đã vượt ngân sách); mặc định theo màu của loại thông báo */
  tone?: 'danger';
  /** Thông báo cùng key thay thế bản cũ (vd. mỗi ngân sách chỉ giữ cảnh báo mới nhất) */
  key?: string;
};

// Chỉ chứa thông báo phát sinh trong phiên dùng app (vượt ngân sách, đổi mật khẩu...)
let notifications: AppNotification[] = [];

// ---------- Theo dõi thông báo mới (để hiện banner trong app) ----------
type Listener = (n: AppNotification) => void;
const listeners = new Set<Listener>();

export const onNewNotification = (fn: Listener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Mới nhất trước */
export const getNotifications = () =>
  [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((n) => ({ ...n }));

export const unreadCount = () => notifications.filter((n) => !n.read).length;

export const markRead = (id: string) => {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
};

/** Xóa hết thông báo: khi đăng xuất, và trong bản dev để xem màn Hộp thư trống */
export const clearAllForDemo = () => {
  notifications = [];
};

export const markAllRead = () => {
  notifications = notifications.map((n) => ({ ...n, read: true }));
};

// ---------- Cài đặt thông báo ----------

/** Loại thông báo người dùng bật/tắt được; thông báo bảo mật luôn bật */
export type ConfigurableType = Exclude<NotificationType, 'security'>;

export type NotificationSettings = Record<ConfigurableType, boolean> & {
  /** Thông báo đẩy của hệ điều hành (khi không mở app) */
  push: boolean;
  /** Banner trượt xuống khi đang mở app */
  banner: boolean;
  /** Bản tin tổng kết tháng qua email */
  email: boolean;
};

let settings: NotificationSettings = {
  push: true,
  banner: true,
  budget: true,
  ocr: true,
  reminder: true,
  advice: false,
  email: false,
};

export const getNotificationSettings = () => ({ ...settings });
export const setNotificationSetting = (key: keyof NotificationSettings, enabled: boolean) => {
  settings = { ...settings, [key]: enabled };
};

/**
 * Tạo thông báo mới (nếu loại đó đang bật) và báo cho banner trong app.
 * `silent`: chỉ lưu vào Hộp thư, không hiện banner (khi màn hình đã tự báo kết quả).
 */
export const pushNotification = (
  input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
  { silent = false }: { silent?: boolean } = {},
) => {
  if (input.type !== 'security' && !settings[input.type]) return null;
  const n: AppNotification = { ...input, id: `n${Date.now()}`, createdAt: new Date().toISOString(), read: false };
  notifications = [...notifications.filter((x) => !input.key || x.key !== input.key), n];
  if (settings.banner && !silent) listeners.forEach((fn) => fn(n));
  return n;
};
