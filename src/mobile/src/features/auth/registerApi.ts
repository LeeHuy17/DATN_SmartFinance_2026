import { ApiError, apiFetch } from '@/lib/api/client';

export type RegisterPayload = { fullName: string; email: string; password: string };

export class EmailTakenError extends Error {
  constructor() {
    super('EMAIL_TAKEN');
  }
}

/** Mật khẩu bị server từ chối (quá phổ biến, giống email...); message là lý do server trả về */
export class WeakPasswordError extends Error {}

type RegisterErrors = { email?: string[]; password?: string[] };

export async function registerAccount({ fullName, email, password }: RegisterPayload): Promise<void> {
  try {
    await apiFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    }, { auth: false });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      const errors = (e.data ?? {}) as RegisterErrors;
      if (errors.email) throw new EmailTakenError();
      if (errors.password) throw new WeakPasswordError(errors.password.join(' '));
    }
    throw e;
  }
}
