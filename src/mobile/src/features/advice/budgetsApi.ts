import * as store from '@/features/transactions/localStore';
import { listAllTransactions } from '@/features/transactions/transactionsApi';
import type { Transaction } from '@/features/transactions/types';
import { addDays, toYmd } from '@/lib/date';
import { buildSummary, type BudgetUsage } from './summary';

// Ngân sách lưu tạm trên máy (localStore). TODO: thay bằng apiFetch khi backend có endpoint ngân sách.

/**
 * Giao dịch đủ cho buildSummary: từ đầu tháng, và 14 ngày gần nhất (so sánh 7 ngày này với
 * 7 ngày trước) có thể lùi sang tháng trước.
 */
export function listSummaryTransactions(now = new Date()): Promise<Transaction[]> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const twoWeeksAgo = addDays(now, -13);
  const from = twoWeeksAgo < monthStart ? twoWeeksAgo : monthStart;
  return listAllTransactions({ date_from: toYmd(from), date_to: toYmd(now) });
}

/** Ngân sách tháng hiện tại kèm số đã chi; tính ở app nên vẫn có khi AI ngoại tuyến */
export async function listBudgetUsage(): Promise<BudgetUsage[]> {
  const usage = buildSummary(await listSummaryTransactions(), store.getBudgets()).budgets;
  // Tên lấy từ danh mục (kể cả danh mục chưa có giao dịch nào)
  return usage.map((b) => ({ ...b, name: store.getCategory(b.categoryId)?.name ?? b.name }));
}

export async function getBudgetLimits(): Promise<Record<string, number>> {
  return store.getBudgets();
}

/** Lưu toàn bộ hạn mức; danh mục có hạn mức 0 sẽ bị bỏ ngân sách */
export async function saveBudgetLimits(limits: Record<string, number>): Promise<void> {
  store.setBudgets(limits);
}
