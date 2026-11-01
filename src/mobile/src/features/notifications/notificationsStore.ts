// Kiểu thông báo, banner trong app và bản sao cài đặt thông báo.
// Hộp thư và cài đặt lưu ở server (notificationsApi.ts); thông báo do server tạo theo nghiệp vụ.
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
};

// ---------- Cài đặt (bản sao từ server, để banner biết có được hiện không) ----------

/** Loại thông báo người dùng bật/tắt được; thông báo bảo mật luôn bật */
export type ConfigurableType = Exclude<NotificationType, 'security'>;

export type NotificationSettings = Record<ConfigurableType, boolean> & {
  /** Thông báo đẩy của hệ điều hành (khi không mở app) — chưa hỗ trợ */
  push: boolean;
  /** Banner trượt xuống khi đang mở app */
  banner: boolean;
  /** Bản tin tổng kết tháng qua email */
  email: boolean;
};

let cachedSettings: NotificationSettings | null = null;

export const getCachedSettings = () => cachedSettings;
export const setCachedSettings = (s: NotificationSettings) => {
  cachedSettings = s;
};

/** Xóa bản sao khi đăng xuất, để tài khoản sau không dùng cài đặt của tài khoản trước */
export const clearNotificationCache = () => {
  cachedSettings = null;
};

// ---------- Banner trong app ----------

/** Nội dung banner; có `id` khi ứng với một thông báo đã lưu (chạm vào thì đánh dấu đã đọc) */
export type BannerMessage = Pick<AppNotification, 'type' | 'title' | 'body' | 'link' | 'tone'> & { id?: string };

type Listener = (m: BannerMessage) => void;
const listeners = new Set<Listener>();

export const onNewNotification = (fn: Listener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Hiện banner nếu người dùng chưa tắt banner hoặc tắt loại đó (chưa tải cài đặt thì mặc định hiện) */
export function showBanner(m: BannerMessage) {
  const s = cachedSettings;
  if (s && (!s.banner || (m.type !== 'security' && !s[m.type]))) return;
  listeners.forEach((fn) => fn(m));
}
