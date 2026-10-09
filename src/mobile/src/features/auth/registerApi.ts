// TODO: thay hàm giả lập bằng apiFetch khi backend có endpoint đăng ký.
// Giữ nguyên chữ ký hàm để màn hình đăng ký không phải sửa.

export type RegisterPayload = { fullName: string; email: string; password: string };

export class EmailTakenError extends Error {
  constructor() {
    super('EMAIL_TAKEN');
  }
}

const fakeDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export async function registerAccount({ email }: RegisterPayload): Promise<void> {
  await fakeDelay();
  // Giả lập: email này coi như đã có tài khoản, để xem được lỗi trùng email khi chưa có backend
  if (email === 'trung@example.com') throw new EmailTakenError();
}
