import {
  clearRefreshToken,
  clearToken,
  getRefreshToken,
  getToken,
  setRefreshToken,
  setToken,
} from '../storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(`API error ${status}`);
  }
}

/**
 * Lỗi 400 của DRF dạng { name: ["Bạn đã có ví với tên này."] } → { name: "Bạn đã có ví với tên này." }.
 * non_field_errors và detail gom vào khóa "form". Lỗi khác 400 trả về {}.
 */
export function getFieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || e.status !== 400 || !e.data || typeof e.data !== 'object') return {};
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(e.data as Record<string, unknown>)) {
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === 'string') {
      errors[key === 'non_field_errors' || key === 'detail' ? 'form' : key] = message;
    }
  }
  return errors;
}

// AuthProvider đăng ký hàm này để biết khi phiên đăng nhập hết hạn hẳn (refresh cũng hỏng)
let onSessionExpired: (() => void) | null = null;
export const setOnSessionExpired = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

async function request(path: string, init: RequestInit, token: string | null) {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

// Nhiều request cùng nhận 401 thì chỉ gọi refresh một lần
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  const res = await request('/auth/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  }, null);
  if (!res.ok) return null;
  // Backend bật ROTATE_REFRESH_TOKENS nên mỗi lần refresh trả về cả refresh token mới
  const data: { access: string; refresh?: string } = await res.json();
  await setToken(data.access);
  if (data.refresh) await setRefreshToken(data.refresh);
  return data.access;
}

type ApiOptions = {
  /** false cho các API không cần đăng nhập (đăng ký, đăng nhập) để không gửi kèm token cũ */
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  { auth = true }: ApiOptions = {},
): Promise<T> {
  const token = auth ? await getToken() : null;
  let res = await request(path, init, token);

  if (res.status === 401 && token) {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    const newToken = await refreshing;
    if (newToken) {
      res = await request(path, init, newToken);
    } else {
      await Promise.all([clearToken(), clearRefreshToken()]);
      onSessionExpired?.();
    }
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
