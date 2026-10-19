import type { Transaction } from '@/features/transactions/types';

/** Ngân sách trong tháng kèm số đã chi (server tính, xem budgets/budgetsApi.ts) */
export type BudgetUsage = {
  /** null = ngân sách tổng chi tiêu */
  categoryId: string | null;
  name: string;
  limit: number;
  spent: number;
};

/**
 * Dữ liệu TỔNG HỢP gửi cho AI — chỉ có số tiền theo danh mục / tuần và ngân sách.
 * Không có tên giao dịch, ghi chú, ví hay thông tin cá nhân.
 */
export type SpendingSummary = {
  month: number;
  year: number;
  /** Ngày hiện tại trong tháng và tổng số ngày, để AI ước tính tốc độ chi */
  dayOfMonth: number;
  daysInMonth: number;
  transactionCount: number;
  /** Số khoản chi trong tháng */
  expenseCount: number;
  totalIncome: number;
  totalExpense: number;
  categories: {
    name: string;
    amount: number;
    /** Chi 7 ngày gần nhất và 7 ngày trước đó, để so sánh xu hướng */
    last7Days: number;
    previous7Days: number;
  }[];
  budgets: BudgetUsage[];
};

/** Cần ít nhất chừng này khoản chi trong tháng thì mới phân tích */
export const MIN_EXPENSES_FOR_ADVICE = 5;

const DAY = 86_400_000;

export function buildSummary(
  all: Transaction[],
  budgets: BudgetUsage[],
  now = new Date(),
): SpendingSummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const inMonth = all.filter((t) => new Date(t.date) >= monthStart && new Date(t.date) <= now);
  const expenses = inMonth.filter((t) => t.amount < 0);

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const last7From = startToday - 6 * DAY;
  const prev7From = last7From - 7 * DAY;

  // Theo danh mục: lấy cả 14 ngày gần nhất (có thể vắt sang tháng trước) cho phần xu hướng
  const byCategory = new Map<string, SpendingSummary['categories'][number]>();
  for (const t of all) {
    if (t.amount >= 0) continue;
    const time = new Date(t.date).getTime();
    const entry =
      byCategory.get(t.category.id) ?? { name: t.category.name, amount: 0, last7Days: 0, previous7Days: 0 };
    if (time >= monthStart.getTime() && time <= now.getTime()) entry.amount += -t.amount;
    if (time >= last7From && time <= now.getTime()) entry.last7Days += -t.amount;
    else if (time >= prev7From && time < last7From) entry.previous7Days += -t.amount;
    byCategory.set(t.category.id, entry);
  }

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    dayOfMonth: now.getDate(),
    daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    transactionCount: inMonth.length,
    expenseCount: expenses.length,
    totalIncome: inMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    totalExpense: expenses.reduce((s, t) => s - t.amount, 0),
    categories: [...byCategory.values()].filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount),
    budgets,
  };
}
