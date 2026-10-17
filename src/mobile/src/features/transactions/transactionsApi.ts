import * as categoriesApi from '@/features/categories/categoriesApi';
import { withBudgetAlert } from '@/features/notifications/budgetAlerts';
import * as walletsApi from '@/features/wallets/walletsApi';
import { ApiError } from '@/lib/api/client';
import * as store from './localStore';
import type { Category, CategoryKind, Transaction, TransactionInput, Wallet } from './types';

// Giao dịch: TODO thay bằng apiFetch khi backend có endpoint giao dịch (nhánh feature/transactions).
// Ví và danh mục đã lấy từ server (walletsApi, categoriesApi).

// ---------- Giao dịch ----------

/** Toàn bộ giao dịch, mới nhất trước (lọc và tìm kiếm làm ở phía app) */
export async function listTransactions(): Promise<Transaction[]> {
  return store.getAll();
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  return store.getById(id) ?? null;
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  return withBudgetAlert(input.categoryId, () => store.add(input));
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  const t = await withBudgetAlert(input.categoryId, () => store.update(id, input));
  if (!t) throw new Error('NOT_FOUND');
  return t;
}

export async function deleteTransaction(id: string): Promise<void> {
  store.remove(id);
}

// ---------- Ví ----------

/** Các ví đang dùng (không gồm ví đã lưu trữ), dùng cho ô chọn ví khi nhập giao dịch */
export const listWallets = (): Promise<Wallet[]> => walletsApi.list();

// ---------- Danh mục ----------

export type CategoryWithCount = Category & { transactionCount: number };

const withCount = (c: Category): CategoryWithCount => ({
  ...c,
  transactionCount: store.countByCategory(c.id),
});

export async function listCategories(kind?: CategoryKind): Promise<CategoryWithCount[]> {
  return (await categoriesApi.list(kind)).map(withCount);
}

/** null nếu không có (đã xóa, hoặc không phải danh mục của mình) */
export async function getCategory(id: string): Promise<CategoryWithCount | null> {
  try {
    return withCount(await categoriesApi.get(id));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
