// Dựng dữ liệu biểu đồ từ số liệu server đã tổng hợp (reportsApi.ts). Không cộng dồn giao dịch ở app.
import { toYmd } from '@/lib/date';

export type Period = 'week' | 'month' | 'year';
export type ReportKind = 'expense' | 'income';

/** Màu cho phần gộp "Khác" — xám nhạt, tách biệt với màu xám của bảng màu danh mục */
export const OTHER_COLOR = '#A3ACA8';
/** Số danh mục được vẽ riêng; phần còn lại gộp vào "Khác" */
const TOP_CATEGORIES = 3;

export type CategorySlice = {
  key: string;
  name: string;
  color: string;
  amount: number;
  /** Phần trăm đã làm tròn, tổng các phần đúng 100 */
  percent: number;
};

export type Bucket = { label: string; amount: number; current: boolean };

/** Thay đổi so với tháng trước (chỉ kỳ tháng); null khi tháng trước bằng 0 thì app hiện "—" */
export type Change = { previousMonth: string; income: number | null; expense: number | null };

export type Report = {
  period: Period;
  from: Date;
  /** Ngày cuối kỳ (0h) */
  to: Date;
  /** Kỳ đang xem là kỳ hiện tại (không cho xem kỳ sau) */
  isCurrent: boolean;
  totalIncome: number;
  totalExpense: number;
  /** Biểu đồ tròn theo danh mục của `kind` */
  kind: ReportKind;
  slices: CategorySlice[];
  /** Cột của biểu đồ chi tiêu: ngày (kỳ tuần), tuần (kỳ tháng), tháng (kỳ năm) */
  buckets: Bucket[];
  change: Change | null;
};

/** Danh mục kèm tổng tiền (số nguyên đồng), từ /reports/by-category/ */
export type CategoryTotal = { id: string; name: string; color: string; amount: number };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Khoảng thời gian của kỳ cách kỳ hiện tại `offset` kỳ (0 = kỳ này, -1 = kỳ trước).
 * Tuần bắt đầu từ thứ Hai. `to` là ngày cuối kỳ lúc 0h.
 */
export function periodRange(period: Period, offset = 0, now = new Date()): { from: Date; to: Date } {
  if (period === 'week') {
    const today = startOfDay(now);
    const mondayOffset = (today.getDay() + 6) % 7;
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset + offset * 7);
    return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6) };
  }
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { from, to: new Date(from.getFullYear(), from.getMonth() + 1, 0) };
  }
  const year = now.getFullYear() + offset;
  return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
}

/** Làm tròn phần trăm theo phần dư lớn nhất để tổng luôn là 100 */
function roundPercents(amounts: number[]): number[] {
  const total = amounts.reduce((s, a) => s + a, 0);
  if (total === 0) return amounts.map(() => 0);
  const raw = amounts.map((a) => (a / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((s, f) => s + f, 0);
  raw
    .map((r, i) => ({ i, rest: r - floors[i] }))
    .sort((a, b) => b.rest - a.rest)
    .forEach(({ i }) => {
      if (left > 0) {
        floors[i] += 1;
        left -= 1;
      }
    });
  return floors;
}

/** Danh mục (server đã sắp giảm dần) → các phần của biểu đồ tròn: top 3, còn lại gộp "Khác" */
export function categorySlices(items: CategoryTotal[]): CategorySlice[] {
  let otherAmount = 0;
  const named: CategoryTotal[] = [];
  for (const c of items) {
    // Danh mục tên "Khác" của người dùng gộp luôn vào phần "Khác"
    if (c.name.trim().toLowerCase() === 'khác') otherAmount += c.amount;
    else named.push(c);
  }
  // Còn đúng một danh mục dư thì vẽ riêng luôn, không cần gộp
  const keepCount = named.length === TOP_CATEGORIES + 1 && otherAmount === 0 ? named.length : TOP_CATEGORIES;
  otherAmount += named.slice(keepCount).reduce((s, c) => s + c.amount, 0);

  const slices = named.slice(0, keepCount).map((c) => ({ key: c.id, name: c.name, color: c.color, amount: c.amount }));
  if (otherAmount > 0) slices.push({ key: 'other', name: 'Khác', color: OTHER_COLOR, amount: otherAmount });
  const percents = roundPercents(slices.map((s) => s.amount));
  return slices.map((s, i) => ({ ...s, percent: percents[i] }));
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** Kỳ tuần: 7 cột theo ngày; `expenseByDay` là "YYYY-MM-DD" → số đã chi */
export function weekBuckets(from: Date, expenseByDay: Map<string, number>, now = new Date()): Bucket[] {
  return WEEKDAYS.map((label, i) => {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return { label, amount: expenseByDay.get(toYmd(day)) ?? 0, current: sameDay(day, now) };
  });
}

/** Kỳ tháng: Tuần 1 là ngày 1–7, Tuần 2: 8–14, Tuần 3: 15–21, Tuần 4: 22 đến hết tháng */
export function monthBuckets(from: Date, dailyExpense: number[], now = new Date()): Bucket[] {
  const isThisMonth = from.getFullYear() === now.getFullYear() && from.getMonth() === now.getMonth();
  const ranges = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 31],
  ];
  return ranges.map(([a, b], i) => ({
    label: `Tuần ${i + 1}`,
    amount: dailyExpense.slice(a - 1, b).reduce((s, x) => s + x, 0),
    current: isThisMonth && now.getDate() >= a && now.getDate() <= b,
  }));
}

/** Kỳ năm: 12 cột theo tháng */
export function yearBuckets(year: number, monthlyExpense: number[], now = new Date()): Bucket[] {
  return monthlyExpense.map((amount, m) => ({
    label: `T${m + 1}`,
    amount,
    current: year === now.getFullYear() && m === now.getMonth(),
  }));
}
