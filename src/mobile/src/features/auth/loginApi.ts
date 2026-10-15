import { ApiError, apiFetch } from '@/lib/api/client';
import { setRefreshToken } from '@/lib/storage';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('INVALID_CREDENTIALS');
  }
}

type TokenPair = { access: string; refresh: string };

/** Đăng nhập, lưu refresh token và trả về access token */
export async function login(email: string, password: string): Promise<string> {
  try {
    const { access, refresh } = await apiFetch<TokenPair>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, { auth: false });
    await setRefreshToken(refresh);
    return access;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw new InvalidCredentialsError();
    throw e;
  }
}

/** Đưa refresh token vào blacklist trên server; lỗi mạng thì bỏ qua vì token ở máy vẫn bị xoá */
export async function logout(refresh: string): Promise<void> {
  await apiFetch('/auth/logout/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  }).catch(() => undefined);
}
