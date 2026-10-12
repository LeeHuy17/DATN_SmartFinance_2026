// Hồ sơ người dùng (giả lập, sống trong bộ nhớ).
// TODO: thay bằng apiFetch khi backend có endpoint hồ sơ / đổi mật khẩu.
// Giữ nguyên chữ ký hàm để màn hình không phải sửa.
import { pushNotification } from '@/features/notifications/notificationsStore';

export type Gender = 'male' | 'female' | 'other';

export type Profile = {
  fullName: string;
  /** Email đăng nhập, không sửa được ở màn Thông tin cá nhân */
  email: string;
  phone: string;
  /** YYYY-MM-DD */
  birthDate: string | null;
  gender: Gender;
  /** Ảnh đại diện; null thì hiện chữ viết tắt của tên */
  avatarUri: string | null;
};

export type ProfileInput = Omit<Profile, 'email'>;

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

export class WrongPasswordError extends Error {
  constructor() {
    super('WRONG_PASSWORD');
  }
}

const fakeDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

let profile: Profile = {
  fullName: 'Nguyễn Văn An',
  email: 'an.nguyen@example.com',
  phone: '0901 234 567',
  birthDate: '1998-08-15',
  gender: 'male',
  avatarUri: null,
};

/** Đọc ngay (không chờ) để vẽ màn hình lần đầu không bị nháy */
export const getProfileNow = (): Profile => ({ ...profile });

export async function getProfile(): Promise<Profile> {
  await fakeDelay(200);
  return getProfileNow();
}

export async function updateProfile(input: Partial<ProfileInput>): Promise<Profile> {
  await fakeDelay();
  profile = { ...profile, ...input };
  return getProfileNow();
}

/** "Nguyễn Văn An" → "Văn An": tên gọi ngắn ở lời chào */
export const shortName = (fullName: string) => fullName.trim().split(/\s+/).slice(-2).join(' ');

export async function changePassword(current: string, next: string): Promise<void> {
  await fakeDelay(800);
  // Giả lập: mật khẩu hiện tại "sai" để xem trạng thái lỗi (giống màn đăng nhập)
  if (current === 'sai') throw new WrongPasswordError();
  void next;
  // Màn đổi mật khẩu đã tự hiện thông báo thành công, chỉ cần lưu vào Hộp thư
  pushNotification(
    {
      type: 'security',
      title: 'Mật khẩu đã được thay đổi',
      body: 'Nếu không phải bạn, hãy đổi mật khẩu ngay.',
      link: '/profile',
    },
    { silent: true },
  );
}
