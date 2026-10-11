export type PasswordRule = { label: string; passed: boolean };

/** Danh sách điều kiện mật khẩu mới, hiển thị dạng checklist ở bước đặt lại mật khẩu */
export function checkPasswordRules(password: string, confirm: string): PasswordRule[] {
  return [
    { label: 'Tối thiểu 8 ký tự', passed: password.length >= 8 },
    { label: 'Có ít nhất 1 chữ hoa', passed: /[A-Z]/.test(password) },
    { label: 'Có ít nhất 1 chữ số', passed: /\d/.test(password) },
    {
      label: 'Có ít nhất 1 ký tự đặc biệt (ví dụ @, #, !)',
      passed: /[^A-Za-z0-9\s]/.test(password),
    },
    { label: 'Hai mật khẩu trùng khớp', passed: password.length > 0 && password === confirm },
  ];
}
