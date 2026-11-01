import { ApiError, apiFetch } from '@/lib/api/client';

import { detectIdentifier } from './identifier';

// Khớp với CODE_LENGTH, CODE_TTL, RESEND_COOLDOWN trong backend (accounts/password_reset.py)
export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const RESEND_COOLDOWN_SECONDS = 60;

/** Backend mới gửi mã qua email, chưa hỗ trợ SMS */
export class PhoneNotSupportedError extends Error {
  constructor() {
    super('PHONE_NOT_SUPPORTED');
  }
}

/** Quá 10 phút sau khi xác thực mã, hoặc token đã được dùng */
export class ResetSessionExpiredError extends Error {
  constructor() {
    super('RESET_SESSION_EXPIRED');
  }
}

/** Mật khẩu mới bị server từ chối; message là lý do server trả về */
export class WeakNewPasswordError extends Error {}

/** Bước 1: gửi mã xác thực tới email */
export async function requestPasswordReset(identifier: string): Promise<void> {
  if (detectIdentifier(identifier) === 'phone') throw new PhoneNotSupportedError();
  await apiFetch('/auth/password-reset/request/', {
    method: 'POST',
    body: JSON.stringify({ email: identifier }),
  }, { auth: false });
}

/** Bước 2: kiểm tra mã, trả về token dùng cho bước đặt lại mật khẩu */
export async function verifyResetCode(identifier: string, code: string): Promise<string> {
  const { reset_token } = await apiFetch<{ reset_token: string }>('/auth/password-reset/verify/', {
    method: 'POST',
    body: JSON.stringify({ email: identifier, code }),
  }, { auth: false });
  return reset_token;
}

type ConfirmErrors = { reset_token?: string[]; new_password?: string[] };

/** Bước 3: đặt mật khẩu mới */
export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  try {
    await apiFetch('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
    }, { auth: false });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      const errors = (e.data ?? {}) as ConfirmErrors;
      if (errors.reset_token) throw new ResetSessionExpiredError();
      if (errors.new_password) throw new WeakNewPasswordError(errors.new_password.join(' '));
    }
    throw e;
  }
}
