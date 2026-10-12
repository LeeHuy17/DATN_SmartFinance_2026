import * as store from '@/features/transactions/mockStore';
import { buildSummary, type BudgetUsage } from './summary';

// TODO: thay bằng apiFetch khi backend có endpoint ngân sách.

const fakeDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ngân sách tháng hiện tại kèm số đã chi; tính ở app nên vẫn có khi AI ngoại tuyến */
export async function listBudgetUsage(): Promise<BudgetUsage[]> {
  await fakeDelay();
  const usage = buildSummary(store.getAll(), store.getBudgets()).budgets;
  // Tên lấy từ danh mục (kể cả danh mục chưa có giao dịch nào)
  return usage.map((b) => ({ ...b, name: store.getCategory(b.categoryId)?.name ?? b.name }));
}

export async function getBudgetLimits(): Promise<Record<string, number>> {
  return store.getBudgets();
}

/** Lưu toàn bộ hạn mức; danh mục có hạn mức 0 sẽ bị bỏ ngân sách */
export async function saveBudgetLimits(limits: Record<string, number>): Promise<void> {
  await fakeDelay();
  store.setBudgets(limits);
}
