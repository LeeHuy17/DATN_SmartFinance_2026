import type { Transaction } from '@/features/transactions/types';

export type Period = 'week' | 'month' | 'year';

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

export type Report = {
  period: Period;
  from: Date;
  /** Hết ngày cuối kỳ */
  to: Date;
  totalIncome: number;
  totalExpense: number;
  slices: CategorySlice[];
  /** Cột của biểu đồ chi tiêu: ngày (kỳ tuần), tuần (kỳ tháng), tháng (kỳ năm) */
  buckets: Bucket[];
};

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Khoảng thời gian của kỳ chứa `now`; tuần bắt đầu từ thứ Hai */
export function periodRange(period: Period, now = new Date()): { from: Date; to: Date } {
  if (period === 'week') {
    const today = startOfDay(now);
    const mondayOffset = (today.getDay() + 6) % 7;
    const from = new Date(today.getTime() - mondayOffset * DAY);
    return { from, to: new Date(from.getTime() + 7 * DAY - 1) };
  }
  if (period === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, -1),
    };
  }
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, -1),
  };
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

function categorySlices(expenses: Transaction[]): CategorySlice[] {
  const byCategory = new Map<string, { name: string; color: string; amount: number }>();
  let otherAmount = 0;
  for (const t of expenses) {
    // Danh mục tên "Khác" của người dùng gộp luôn vào phần "Khác"
    if (t.category.name.trim().toLowerCase() === 'khác') {
      otherAmount += -t.amount;
      continue;
    }
    const entry = byCategory.get(t.category.id) ?? { name: t.category.name, color: t.category.color, amount: 0 };
    entry.amount += -t.amount;
    byCategory.set(t.category.id, entry);
  }

  const sorted = [...byCategory.entries()].sort((a, b) => b[1].amount - a[1].amount);
  // Còn đúng một danh mục dư thì vẽ riêng luôn, không cần gộp
  const keepCount = sorted.length === TOP_CATEGORIES + 1 && otherAmount === 0 ? sorted.length : TOP_CATEGORIES;
  const top = sorted.slice(0, keepCount);
  otherAmount += sorted.slice(keepCount).reduce((s, [, v]) => s + v.amount, 0);

  const items = top.map(([key, v]) => ({ key, ...v }));
  if (otherAmount > 0) items.push({ key: 'other', name: 'Khác', color: OTHER_COLOR, amount: otherAmount });
  const percents = roundPercents(items.map((i) => i.amount));
  return items.map((it, i) => ({ ...it, percent: percents[i] }));
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function buckets(period: Period, from: Date, expenses: Transaction[], now: Date): Bucket[] {
  const sumWhere = (pred: (d: Date) => boolean) =>
    expenses.filter((t) => pred(new Date(t.date))).reduce((s, t) => s - t.amount, 0);

  if (period === 'week') {
    return WEEKDAYS.map((label, i) => {
      const dayStart = new Date(from.getTime() + i * DAY);
      const dayEnd = new Date(dayStart.getTime() + DAY);
      return {
        label,
        amount: sumWhere((d) => d >= dayStart && d < dayEnd),
        current: startOfDay(now).getTime() === dayStart.getTime(),
      };
    });
  }

  if (period === 'month') {
    // Tuần 1: ngày 1–7, Tuần 2: 8–14, Tuần 3: 15–21, Tuần 4: 22 đến hết tháng
    const ranges = [
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 31],
    ];
    return ranges.map(([a, b], i) => ({
      label: `Tuần ${i + 1}`,
      amount: sumWhere((d) => d.getDate() >= a && d.getDate() <= b),
      current: now.getDate() >= a && now.getDate() <= b,
    }));
  }

  return Array.from({ length: 12 }, (_, m) => ({
    label: `T${m + 1}`,
    amount: sumWhere((d) => d.getMonth() === m),
    current: now.getMonth() === m,
  }));
}

/** Tính báo cáo của kỳ hiện tại từ danh sách giao dịch */
export function buildReport(all: Transaction[], period: Period, now = new Date()): Report {
  const { from, to } = periodRange(period, now);
  const inPeriod = all.filter((t) => {
    const d = new Date(t.date);
    return d >= from && d <= to;
  });
  const expenses = inPeriod.filter((t) => t.amount < 0);

  return {
    period,
    from,
    to,
    totalIncome: inPeriod.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    totalExpense: expenses.reduce((s, t) => s - t.amount, 0),
    slices: categorySlices(expenses),
    buckets: buckets(period, from, expenses, now),
  };
}
