// Ngân sách lưu tạm trong bộ nhớ (mất khi tải lại app) cho đến khi backend có API ngân sách.
// Giữ thêm bản sao danh mục từ server để hiện tên danh mục cho ngân sách.
// Giao dịch, ví, danh mục đã lấy từ server (transactionsApi, walletsApi, categoriesApi).
import type { Category } from './types';

// ---------- Bản sao danh mục từ server ----------

const categoryCache = new Map<string, Category>();

export const cacheCategories = (list: Category[]) => list.forEach((c) => categoryCache.set(c.id, c));
export const forgetCategory = (id: string) => categoryCache.delete(id);
export const getCategory = (id: string) => categoryCache.get(id);

// ---------- Ngân sách (theo danh mục chi tiêu, áp dụng cho mỗi tháng) ----------

/** categoryId → hạn mức mỗi tháng (đồng) */
let budgets: Record<string, number> = {};

export const getBudgets = () => ({ ...budgets });

/** Ghi đè toàn bộ ngân sách; hạn mức 0 = bỏ ngân sách của danh mục đó */
export const setBudgets = (next: Record<string, number>) => {
  budgets = Object.fromEntries(Object.entries(next).filter(([, v]) => v > 0));
};

/** Xóa dữ liệu của tài khoản hiện tại khi đăng xuất, để tài khoản sau không thấy */
export const resetLocalData = () => {
  categoryCache.clear();
  budgets = {};
};
