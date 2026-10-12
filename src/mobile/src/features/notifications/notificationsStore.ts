// Thông báo trong app (giả lập, sống trong bộ nhớ).
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
};

/** Mốc thời gian cách hiện tại `days` ngày, lúc hh:mm */
const at = (days: number, hh: number, mm: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

let notifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'budget',
    // Khớp số liệu mẫu: ngân sách Ăn uống 350.000đ, đã chi 242.000đ
    title: 'Đã dùng hơn nửa ngân sách Ăn uống',
    body: 'Bạn đã dùng 69% ngân sách tháng (242.000đ / 350.000đ).',
    createdAt: at(0, 9, 12),
    read: false,
    link: '/advice',
  },
  {
    id: 'n2',
    type: 'ocr',
    title: 'Đã đọc xong hóa đơn Co.opmart',
    body: 'Kiểm tra và xác nhận để lưu giao dịch 312.500đ.',
    createdAt: at(0, 8, 47),
    read: false,
    link: '/transactions',
  },
  {
    id: 'n3',
    type: 'advice',
    title: 'Lời khuyên mới từ trợ lý AI',
    body: 'Chi tiêu ăn uống đang tăng so với tuần trước.',
    createdAt: at(1, 20, 5),
    read: false,
    link: '/advice',
  },
  {
    id: 'n4',
    type: 'reminder',
    title: 'Nhắc ghi chép chi tiêu',
    body: 'Hôm nay bạn chưa ghi giao dịch nào.',
    createdAt: at(10, 21, 0),
    read: true,
    link: '/transaction/add',
  },
  {
    id: 'n5',
    type: 'security',
    title: 'Mật khẩu đã được thay đổi',
    body: 'Nếu không phải bạn, hãy đổi mật khẩu ngay.',
    createdAt: at(14, 10, 30),
    read: true,
    link: '/profile',
  },
];

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

/** Chỉ dùng cho giả lập trong bản dev: xóa hết để xem màn Hộp thư trống */
export const clearAllForDemo = () => {
  notifications = [];
};

export const markAllRead = () => {
  notifications = notifications.map((n) => ({ ...n, read: true }));
};

// ---------- Cài đặt: loại thông báo nào được gửi ----------

/** Thông báo bảo mật luôn bật, không cho tắt */
export type ConfigurableType = Exclude<NotificationType, 'security'>;
let settings: Record<ConfigurableType, boolean> = { budget: true, ocr: true, advice: true, reminder: true };

export const getNotificationSettings = () => ({ ...settings });
export const setNotificationSetting = (type: ConfigurableType, enabled: boolean) => {
  settings = { ...settings, [type]: enabled };
};

/** Tạo thông báo mới (nếu loại đó đang bật) và báo cho banner trong app */
export const pushNotification = (input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
  if (input.type !== 'security' && !settings[input.type]) return null;
  const n: AppNotification = { ...input, id: `n${Date.now()}`, createdAt: new Date().toISOString(), read: false };
  notifications = [...notifications, n];
  listeners.forEach((fn) => fn(n));
  return n;
};
