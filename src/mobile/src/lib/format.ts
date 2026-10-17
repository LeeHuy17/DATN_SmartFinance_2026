/** 1500000 → "1.500.000" (bỏ dấu, làm tròn đồng) */
const groupVnd = (amount: number) =>
  Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Tiền VND theo chuẩn vi-VN: 1500000 → "1.500.000 ₫". Hermes trên Android có thể thiếu dữ liệu locale
 * cho Intl.NumberFormat nên tự định dạng. Màn hình theo thiết kế dùng formatVnd ("1.500.000đ").
 */
export const formatCurrency = (amount: number) => `${amount < 0 ? '-' : ''}${groupVnd(amount)} ₫`;

export const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat('vi-VN').format(new Date(date));

/** Định dạng tiền theo thiết kế: 15890000 → "15.890.000đ" (không phụ thuộc Intl của máy) */
export const formatVnd = (amount: number) => `${groupVnd(amount)}đ`;

/** Số dư ví: giữ dấu âm (thẻ tín dụng đang nợ) → "-1.200.000đ" */
export const formatBalance = (amount: number) => `${amount < 0 ? '-' : ''}${formatVnd(amount)}`;

/** Có dấu: -65000 → "-65.000đ", 15000000 → "+15.000.000đ" */
export const formatSignedVnd = (amount: number) => `${amount < 0 ? '-' : '+'}${formatVnd(amount)}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Hôm nay", "Hôm qua", còn lại dạng dd/MM */
export function formatRelativeDay(date: Date | string, now = new Date()): string {
  const d = new Date(date);
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return formatDayMonth(d);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 08:35 */
export const formatTime = (date: Date | string) => {
  const d = new Date(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/** 03/10 */
export const formatDayMonth = (date: Date | string) => {
  const d = new Date(date);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};

/** 03/10/2026 · 08:35 */
export const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  return `${formatDayMonth(d)}/${d.getFullYear()} · ${formatTime(d)}`;
};

/** 03/10/2026 */
export const formatFullDate = (date: Date | string) => {
  const d = new Date(date);
  return `${formatDayMonth(d)}/${d.getFullYear()}`;
};

/** Tự chèn dấu "/" khi gõ ngày: "03102026" → "03/10/2026" */
export const maskDayInput = (text: string) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
};

/** Số tiền rút gọn cho biểu đồ: 2.600.000 → "2,6tr", 65.000 → "65k" */
export const formatShortVnd = (amount: number) => {
  const n = Math.abs(amount);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.', ',').replace(',0', '')}tỷ`;
  if (n >= 100_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}đ`;
};
