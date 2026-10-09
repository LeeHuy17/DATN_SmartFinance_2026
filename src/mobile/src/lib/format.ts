export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat('vi-VN').format(new Date(date));

/** Định dạng tiền theo thiết kế: 15890000 → "15.890.000đ" (không phụ thuộc Intl của máy) */
export const formatVnd = (amount: number) =>
  `${Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

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
