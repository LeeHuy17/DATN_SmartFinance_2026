// Hồ sơ người dùng lấy từ /auth/me/; ảnh đại diện tải lên /auth/me/avatar/.
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { ApiError, apiFetch, getFieldErrors } from '@/lib/api/client';
import { setRefreshToken, setToken } from '@/lib/storage';

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
  /** URL ảnh đại diện từ server (không lưu lâu dài vì phụ thuộc host đang dùng); null thì hiện chữ viết tắt */
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
  avatar_url: string | null;
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

const toProfile = (u: ApiUser): Profile => ({
  fullName: u.full_name,
  email: u.email,
  phone: u.phone,
  birthDate: u.birth_date,
  gender: u.gender || null,
  avatarUri: u.avatar_url,
});

const save = (u: ApiUser) => {
  cached = toProfile(u);
  return { ...cached };
};

/** Bản đã tải gần nhất (đọc ngay, không chờ) để vẽ màn hình lần đầu không bị nháy */
export const getProfileNow = (): Profile => ({ ...(cached ?? EMPTY) });

export async function getProfile(): Promise<Profile> {
  return save(await apiFetch<ApiUser>('/auth/me/'));
}

/** Câu báo lỗi khi tải/xóa ảnh đại diện thất bại */
export function avatarErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 429) return 'Bạn tải ảnh quá nhiều lần, hãy thử lại sau.';
  const field = getFieldErrors(e).avatar;
  if (field) return field;
  if (e instanceof ApiError) return 'Không lưu được ảnh. Vui lòng thử lại.';
  console.warn('Tải ảnh đại diện thất bại', e);
  return 'Không tải được ảnh lên. Vui lòng kiểm tra kết nối rồi thử lại.';
}

async function uploadAvatar(uri: string): Promise<ApiUser> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    form.append('avatar', await (await fetch(uri)).blob(), 'avatar.jpg');
  } else {
    // fetch của Expo không nhận kiểu { uri, name, type } của React Native; File (expo-file-system) là Blob nên gửi được
    form.append('avatar', new File(uri) as unknown as Blob, 'avatar.jpg');
  }
  return apiFetch<ApiUser>('/auth/me/avatar/', { method: 'POST', body: form }, { timeoutMs: 60000 });
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
  let user = hasFields
    ? await apiFetch<ApiUser>('/auth/me/', { method: 'PATCH', body: JSON.stringify(body) })
    : await apiFetch<ApiUser>('/auth/me/');
  // Chỉ gọi server khi ảnh thật sự đổi (form luôn gửi kèm avatarUri hiện tại)
  if (avatarUri !== undefined && avatarUri !== user.avatar_url) {
    if (avatarUri) {
      user = await uploadAvatar(avatarUri);
    } else {
      await apiFetch<null>('/auth/me/avatar/', { method: 'DELETE' });
      user = { ...user, avatar_url: null };
    }
  }
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
  // Thông báo bảo mật trong Hộp thư do server tạo (mọi thiết bị của tài khoản đều thấy)
}

/** Xóa hồ sơ đã tải khi đăng xuất */
export const clearProfile = () => {
  cached = null;
};
