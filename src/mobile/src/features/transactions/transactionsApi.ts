import { withBudgetAlert } from '@/features/notifications/budgetAlerts';
import * as store from './mockStore';
import type { Category, CategoryKind, Transaction, TransactionInput, Wallet, WalletType } from './types';

// TODO: thay các hàm giả lập bằng apiFetch khi backend có endpoint ví, danh mục, giao dịch.
// Giữ nguyên chữ ký hàm để các màn hình không phải sửa.

export { CategoryInUseError, DuplicateNameError } from './mockStore';
export type { CategoryInput } from './mockStore';

const fakeDelay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Giao dịch ----------

/** Toàn bộ giao dịch, mới nhất trước (lọc và tìm kiếm làm ở phía app) */
export async function listTransactions(): Promise<Transaction[]> {
  await fakeDelay();
  return store.getAll();
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  await fakeDelay(200);
  return store.getById(id) ?? null;
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  await fakeDelay();
  return withBudgetAlert(input.categoryId, () => store.add(input));
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  await fakeDelay();
  const t = await withBudgetAlert(input.categoryId, () => store.update(id, input));
  if (!t) throw new Error('NOT_FOUND');
  return t;
}

export async function deleteTransaction(id: string): Promise<void> {
  await fakeDelay();
  store.remove(id);
}

// ---------- Ví ----------

export async function listWallets(): Promise<Wallet[]> {
  return store.getWallets();
}

/** Ném DuplicateNameError nếu trùng tên ví */
export async function createWallet(input: { name: string; type: WalletType; balance: number }): Promise<Wallet> {
  await fakeDelay();
  return store.addWallet(input);
}

// ---------- Danh mục ----------

export type CategoryWithCount = Category & { transactionCount: number };

export async function listCategories(kind?: CategoryKind): Promise<CategoryWithCount[]> {
  return store.getCategories(kind).map((c) => ({ ...c, transactionCount: store.countByCategory(c.id) }));
}

export async function getCategory(id: string): Promise<CategoryWithCount | null> {
  const c = store.getCategory(id);
  return c ? { ...c, transactionCount: store.countByCategory(id) } : null;
}

/** Ném DuplicateNameError nếu trùng tên trong cùng loại (chi / thu) */
export async function createCategory(input: store.CategoryInput): Promise<Category> {
  await fakeDelay();
  return store.addCategory(input);
}

export async function updateCategory(id: string, input: store.CategoryInput): Promise<Category> {
  await fakeDelay();
  return store.updateCategory(id, input);
}

/** Ném CategoryInUseError nếu danh mục đã có giao dịch (chỉ được ẩn) */
export async function deleteCategory(id: string): Promise<void> {
  await fakeDelay();
  store.removeCategory(id);
}
