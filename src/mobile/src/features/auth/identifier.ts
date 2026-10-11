const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Số di động Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (9 số sau đầu số)
const PHONE_REGEX = /^(0|\+84)\d{9}$/;

export type IdentifierType = 'email' | 'phone';

/** Tự nhận diện người dùng nhập email hay số điện thoại; null nếu sai định dạng */
export function detectIdentifier(raw: string): IdentifierType | null {
  const value = raw.trim();
  if (EMAIL_REGEX.test(value)) return 'email';
  if (PHONE_REGEX.test(value.replace(/[\s.-]/g, ''))) return 'phone';
  return null;
}

/** Chuẩn hoá trước khi gửi lên server (bỏ khoảng trắng, dấu chấm trong số điện thoại) */
export function normalizeIdentifier(raw: string): string {
  const value = raw.trim();
  return detectIdentifier(value) === 'phone' ? value.replace(/[\s.-]/g, '') : value.toLowerCase();
}

/** Che bớt thông tin: an.nguyen@example.com → a*****@example.com, 0912345678 → 091****678 */
export function maskIdentifier(value: string): string {
  if (detectIdentifier(value) === 'email') {
    const [name, domain] = value.split('@');
    return `${name[0]}*****@${domain}`;
  }
  return `${value.slice(0, 3)}****${value.slice(-3)}`;
}
