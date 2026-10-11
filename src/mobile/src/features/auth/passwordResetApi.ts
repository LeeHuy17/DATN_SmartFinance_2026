// TODO: thay các hàm giả lập dưới đây bằng apiFetch khi backend có endpoint quên mật khẩu.
// Giữ nguyên chữ ký hàm để các màn hình không phải sửa.

const fakeDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const RESEND_COOLDOWN_SECONDS = 60;

/** Bước 1: gửi mã xác thực tới email / số điện thoại */
export async function requestPasswordReset(_identifier: string): Promise<void> {
  await fakeDelay();
}

/** Bước 2: kiểm tra mã, trả về token dùng cho bước đặt lại mật khẩu */
export async function verifyResetCode(_identifier: string, code: string): Promise<string> {
  await fakeDelay();
  // Giả lập: mã 000000 luôn sai, để xem được trạng thái lỗi khi chưa có backend
  if (code === '000000') throw new Error('INVALID_CODE');
  return 'mock-reset-token';
}

/** Bước 3: đặt mật khẩu mới */
export async function resetPassword(_resetToken: string, _newPassword: string): Promise<void> {
  await fakeDelay();
}
