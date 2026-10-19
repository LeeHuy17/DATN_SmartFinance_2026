// Ngày giao dịch ở server là DateField (YYYY-MM-DD, không có giờ). Luôn đọc / ghi theo giờ máy:
// toISOString() đổi sang UTC nên giao dịch nhập lúc 0h–7h sáng ở Việt Nam sẽ bị lùi một ngày.

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date (giờ máy) → "2026-10-03" */
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** "2026-10-03" → Date lúc 0h ngày đó theo giờ máy (new Date("2026-10-03") lại hiểu là 0h UTC) */
export function fromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date (giờ máy) → "2026-10", dùng cho ?month= của ngân sách */
export const toMonthKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

/** Ngày 1 của tháng cách `months` tháng (âm là lùi về trước) */
export const addMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, 1);

/** Cộng / trừ số ngày theo lịch (không lệch khi qua đổi giờ mùa hè) */
export const addDays = (d: Date, days: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
