import * as store from '@/features/transactions/localStore';
import { buildSummary, type BudgetUsage } from './summary';

// Ngân sách lưu tạm trên máy (localStore). TODO: thay bằng apiFetch khi backend có endpoint ngân sách.

/** Ngân sách tháng hiện tại kèm số đã chi; tính ở app nên vẫn có khi AI ngoại tuyến */
export async function listBudgetUsage(): Promise<BudgetUsage[]> {
  const usage = buildSummary(store.getAll(), store.getBudgets()).budgets;
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
