// Giao dịch và ngân sách do người dùng nhập, lưu tạm trong bộ nhớ (mất khi tải lại app) cho đến khi
// backend có API giao dịch. Ví và danh mục lấy từ server; ở đây chỉ giữ bản sao gần nhất để gắn
// tên ví / danh mục vào giao dịch khi hiển thị.
import type { Category, Transaction, TransactionInput, Wallet } from './types';

// ---------- Bản sao ví và danh mục từ server ----------

const categoryCache = new Map<string, Category>();
const walletCache = new Map<string, Wallet>();

export const cacheCategories = (list: Category[]) => list.forEach((c) => categoryCache.set(c.id, c));
export const forgetCategory = (id: string) => categoryCache.delete(id);
export const getCategory = (id: string) => categoryCache.get(id);

export const cacheWallets = (list: Wallet[]) => list.forEach((w) => walletCache.set(w.id, w));

// ---------- Ngân sách (theo danh mục chi tiêu, áp dụng cho mỗi tháng) ----------

/** categoryId → hạn mức mỗi tháng (đồng) */
let budgets: Record<string, number> = {};

export const getBudgets = () => ({ ...budgets });

/** Ghi đè toàn bộ ngân sách; hạn mức 0 = bỏ ngân sách của danh mục đó */
export const setBudgets = (next: Record<string, number>) => {
  budgets = Object.fromEntries(Object.entries(next).filter(([, v]) => v > 0));
};

// ---------- Giao dịch ----------

type StoredTransaction = TransactionInput & { id: string };

let transactions: StoredTransaction[] = [];

export const countByCategory = (categoryId: string) =>
  transactions.filter((t) => t.categoryId === categoryId).length;

/** Gắn tên ví và thông tin danh mục hiện tại vào giao dịch để hiển thị */
const hydrate = (t: StoredTransaction): Transaction => {
  const { categoryId, ...rest } = t;
  const c = getCategory(categoryId);
  return {
    ...rest,
    walletName: walletCache.get(t.walletId)?.name ?? '',
    category: c
      ? { id: c.id, name: c.name, color: c.color, icon: c.icon }
      : { id: categoryId, name: 'Không rõ', color: '#5E6A65', icon: 'help-outline' },
  };
};

/** Mới nhất trước */
export const getAll = () =>
  [...transactions].sort((a, b) => b.date.localeCompare(a.date)).map(hydrate);

const findStored = (id: string) => transactions.find((t) => t.id === id);

export const getById = (id: string) => {
  const t = findStored(id);
  return t && hydrate(t);
};

export const add = (input: TransactionInput): Transaction => {
  const t: StoredTransaction = { ...input, id: `t${Date.now()}` };
  transactions = [...transactions, t];
  return hydrate(t);
};

export const update = (id: string, input: TransactionInput): Transaction | undefined => {
  if (!findStored(id)) return undefined;
  const t: StoredTransaction = { ...input, id };
  transactions = transactions.map((x) => (x.id === id ? t : x));
  return hydrate(t);
};

export const remove = (id: string) => {
  transactions = transactions.filter((t) => t.id !== id);
};

/** Xóa dữ liệu của tài khoản hiện tại khi đăng xuất, để tài khoản sau không thấy */
export const resetLocalData = () => {
  categoryCache.clear();
  walletCache.clear();
  budgets = {};
  transactions = [];
};
