// Hồ sơ người dùng lấy từ /auth/me/. Ảnh đại diện chỉ lưu trên máy vì server chưa có chỗ chứa ảnh.
import { pushNotification } from '@/features/notifications/notificationsStore';
import { apiFetch, getFieldErrors } from '@/lib/api/client';
import { getAvatarUri, setAvatarUri, setRefreshToken, setToken } from '@/lib/storage';

export type Gender = 'male' | 'female' | 'other';

export type Profile = {
  fullName: string;
  /** Email đăng nhập, không sửa được ở màn Thông tin cá nhân */
  email: string;
  phone: string;
  /** YYYY-MM-DD */
  birthDate: string | null;
  /** null: chưa chọn */
  gender: Gender | null;
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

/** Server từ chối mật khẩu mới (quá phổ biến, giống email...); message là lý do */
export class NewPasswordRejectedError extends Error {}

type ApiUser = {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  birth_date: string | null;
  gender: Gender | '';
};

const EMPTY: Profile = {
  fullName: '',
  email: '',
  phone: '',
  birthDate: null,
  gender: null,
  avatarUri: null,
};

let cached: Profile | null = null;

const toProfile = (u: ApiUser, avatarUri: string | null): Profile => ({
  fullName: u.full_name,
  email: u.email,
  phone: u.phone,
  birthDate: u.birth_date,
  gender: u.gender || null,
  avatarUri,
});

const save = async (u: ApiUser) => {
  cached = toProfile(u, await getAvatarUri(u.id).catch(() => null));
  return { ...cached };
};

/** Bản đã tải gần nhất (đọc ngay, không chờ) để vẽ màn hình lần đầu không bị nháy */
export const getProfileNow = (): Profile => ({ ...(cached ?? EMPTY) });

export async function getProfile(): Promise<Profile> {
  return save(await apiFetch<ApiUser>('/auth/me/'));
}

/** Lỗi 400 (vd. ngày sinh ở tương lai) đọc bằng getFieldErrors(e) với khóa full_name, phone, birth_date */
export async function updateProfile(input: Partial<ProfileInput>): Promise<Profile> {
  const { avatarUri, ...fields } = input;
  const body = {
    full_name: fields.fullName,
    phone: fields.phone,
    birth_date: fields.birthDate,
    gender: fields.gender === undefined ? undefined : (fields.gender ?? ''),
  };
  const hasFields = Object.values(body).some((v) => v !== undefined);
  const user = hasFields
    ? await apiFetch<ApiUser>('/auth/me/', { method: 'PATCH', body: JSON.stringify(body) })
    : await apiFetch<ApiUser>('/auth/me/');
  if (avatarUri !== undefined) await setAvatarUri(user.id, avatarUri);
  return save(user);
}

/** "Nguyễn Văn An" → "Văn An": tên gọi ngắn ở lời chào; chưa có tên thì lấy phần trước @ của email */
export const shortName = (fullName: string, email = '') =>
  fullName.trim().split(/\s+/).slice(-2).join(' ') || email.split('@')[0];

export async function changePassword(current: string, next: string): Promise<void> {
  try {
    const tokens = await apiFetch<{ access: string; refresh: string }>('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ current_password: current, new_password: next }),
    });
    // Server thu hồi mọi phiên cũ và cấp token mới cho máy này để không bị đăng xuất
    await Promise.all([setToken(tokens.access), setRefreshToken(tokens.refresh)]);
  } catch (e) {
    const errors = getFieldErrors(e);
    if (errors.current_password) throw new WrongPasswordError();
    if (errors.new_password) throw new NewPasswordRejectedError(errors.new_password);
    throw e;
  }
  // Màn đổi mật khẩu đã tự hiện thông báo thành công, chỉ cần lưu vào Hộp thư
  pushNotification(
    {
      type: 'security',
      title: 'Mật khẩu đã được thay đổi',
      body: 'Các thiết bị khác đã được đăng xuất. Nếu không phải bạn, hãy đổi mật khẩu ngay.',
      link: '/profile',
    },
    { silent: true },
  );
}

/** Xóa hồ sơ đã tải khi đăng xuất */
export const clearProfile = () => {
  cached = null;
};
