import { toBudgetAlert, type ApiBudgetAlert } from '@/features/budgets/budgetsApi';
import * as categoriesApi from '@/features/categories/categoriesApi';
import { notifyBudgetAlerts } from '@/features/notifications/budgetAlerts';
import * as walletsApi from '@/features/wallets/walletsApi';
import { ApiError, apiFetch } from '@/lib/api/client';
import { fromYmd } from '@/lib/date';
import { parseMoney, toMoneyString } from '@/lib/money';
import { resolveIcon } from './categories';
import { qs, type TransactionFilters } from './transactionQuery';
import type { CategoryKind, Transaction, TransactionInput, TransactionSource, Wallet } from './types';

export {
  getTransactionSummary,
  type TransactionFilters,
  type TransactionSummary,
} from './transactionQuery';

// ---------- Dữ liệu thô của server ----------

export type ApiTransaction = {
  id: number;
  wallet: number;
  wallet_name: string;
  category: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  kind: CategoryKind;
  /** Decimal dạng chuỗi, luôn dương */
  amount: string;
  note: string;
  source: TransactionSource;
  /** YYYY-MM-DD */
  date: string;
  created_at: string;
  updated_at: string;
  /** Chỉ có khi tạo / sửa giao dịch chi: các ngân sách vừa chạm ngưỡng hoặc vượt mức */
  budget_alerts?: ApiBudgetAlert[];
};

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// ---------- Quy đổi sang kiểu hiển thị ----------

const toTransaction = (t: ApiTransaction): Transaction => {
  const amount = parseMoney(t.amount);
  return {
    id: String(t.id),
    title: t.note || t.category_name,
    note: t.note || undefined,
    category: {
      id: String(t.category),
      name: t.category_name,
      color: t.category_color,
      icon: resolveIcon(t.category_icon),
    },
    walletId: String(t.wallet),
    walletName: t.wallet_name,
    amount: t.kind === 'expense' ? -amount : amount,
    date: fromYmd(t.date).toISOString(),
    source: t.source,
    budgetAlerts: t.budget_alerts?.map(toBudgetAlert),
  };
};

const toBody = (input: Partial<TransactionInput>) =>
  JSON.stringify({
    wallet: input.walletId === undefined ? undefined : Number(input.walletId),
    category: input.categoryId === undefined ? undefined : Number(input.categoryId),
    amount: input.amount === undefined ? undefined : toMoneyString(input.amount),
    note: input.note,
    date: input.date,
    source: input.source,
  });

// ---------- Giao dịch ----------

export type TransactionPage = {
  items: Transaction[];
  /** Tổng số giao dịch khớp bộ lọc (mọi trang) */
  count: number;
  hasMore: boolean;
};

/**
 * Một trang giao dịch, mới nhất trước. Cuộn vô hạn thì tăng `page`; dừng khi hasMore = false.
 * Gọi theo số trang, không gọi thẳng URL `next` vì host trong đó phụ thuộc địa chỉ server nhìn thấy.
 */
export async function listTransactions(filters: TransactionFilters = {}): Promise<TransactionPage> {
  const data = await apiFetch<Page<ApiTransaction>>(`/transactions/?${qs(filters)}`);
  return { items: data.results.map(toTransaction), count: data.count, hasMore: data.next !== null };
}

/** Mọi giao dịch khớp bộ lọc (gom nhiều trang), dùng cho báo cáo / tư vấn tính ở app */
export async function listAllTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const MAX_PAGES = 50;
  const all: Transaction[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, hasMore } = await listTransactions({ ...filters, page, page_size: 100 });
    all.push(...items);
    if (!hasMore) break;
  }
  return all;
}

/** null nếu không có (đã xóa, hoặc không phải giao dịch của mình) */
export async function getTransaction(id: string): Promise<Transaction | null> {
  try {
    return toTransaction(await apiFetch<ApiTransaction>(`/transactions/${id}/`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** Hiện ngay cảnh báo ngân sách server trả kèm (budget_alerts), không cần gọi thêm API */
const withAlerts = (t: Transaction) => {
  notifyBudgetAlerts(t.budgetAlerts);
  return t;
};

/** Lỗi 400 (ví đã lưu trữ, danh mục đang ẩn...) đọc bằng getFieldErrors(e) */
export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const data = await apiFetch<ApiTransaction>('/transactions/', { method: 'POST', body: toBody(input) });
  return withAlerts(toTransaction(data));
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>): Promise<Transaction> {
  const data = await apiFetch<ApiTransaction>(`/transactions/${id}/`, {
    method: 'PATCH',
    body: toBody(input),
  });
  return withAlerts(toTransaction(data));
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiFetch(`/transactions/${id}/`, { method: 'DELETE' });
}

// ---------- Ví và danh mục (cho ô chọn khi nhập giao dịch) ----------

/** Các ví đang dùng (không gồm ví đã lưu trữ) */
export const listWallets = (): Promise<Wallet[]> => walletsApi.list();

export type CategoryWithCount = categoriesApi.CategoryWithCount;

export const listCategories = (kind?: CategoryKind) => categoriesApi.list(kind);

/** null nếu không có (đã xóa, hoặc không phải danh mục của mình) */
export async function getCategory(id: string): Promise<CategoryWithCount | null> {
  try {
    return await categoriesApi.get(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
