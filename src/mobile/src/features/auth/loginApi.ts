// TODO: thay hàm giả lập bằng apiFetch khi backend có endpoint đăng nhập.
// Giữ nguyên chữ ký hàm để màn hình đăng nhập không phải sửa.

export class InvalidCredentialsError extends Error {
  constructor() {
    super('INVALID_CREDENTIALS');
  }
}

const fakeDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

/** Đăng nhập, trả về access token */
export async function login(email: string, password: string): Promise<string> {
  await fakeDelay();
  // Giả lập: mọi email/mật khẩu đều đăng nhập được, trừ mật khẩu "sai" để xem trạng thái lỗi
  if (password === 'sai') throw new InvalidCredentialsError();
  return `mock-token-${email}`;
}
