import { resolveIcon } from '@/features/transactions/categories';
import type { IconName } from '@/features/transactions/types';
import { apiFetch } from '@/lib/api/client';
import { parseMoney, toMoneyString } from '@/lib/money';

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

// ---------- Dữ liệu thô của server ----------

export type ApiBudget = {
  id: number;
  category: number | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount: string;
  alert_threshold: number;
  is_active: boolean;
  /** "2026-10" */
  month: string;
  /** false với tháng đã qua: hạn mức là lịch sử, chỉ xem */
  editable: boolean;
  /** Decimal dạng chuỗi; remaining âm nghĩa là đã vượt hạn mức */
  spent: string;
  remaining: string;
  /** Có thể > 100 */
  percent: number;
  status: BudgetStatus;
};

/** Phần tử của budget_alerts trong response tạo / sửa giao dịch chi */
export type ApiBudgetAlert = {
  budget: number;
  category: number | null;
  category_name: string;
  amount: string;
  spent: string;
  percent: number;
  status: Exclude<BudgetStatus, 'ok'>;
};

// ---------- Kiểu hiển thị (số tiền là số nguyên đồng) ----------

export type Budget = {
  id: string;
  /** null = ngân sách tổng cho mọi khoản chi */
  categoryId: string | null;
  name: string;
  icon: IconName;
  color: string;
  amount: number;
  alertThreshold: number;
  isActive: boolean;
  month: string;
  /** false với tháng đã qua: hạn mức là lịch sử, chỉ xem */
  editable: boolean;
  spent: number;
  /** Âm nghĩa là đã vượt hạn mức */
  remaining: number;
  percent: number;
  status: BudgetStatus;
};

export type BudgetAlert = {
  budgetId: string;
  categoryId: string | null;
  name: string;
  amount: number;
  spent: number;
  percent: number;
  status: Exclude<BudgetStatus, 'ok'>;
};

export type BudgetInput = {
  categoryId: string | null;
  amount: number;
  alertThreshold: number;
  isActive: boolean;
};

const toBudget = (b: ApiBudget): Budget => ({
  id: String(b.id),
  categoryId: b.category === null ? null : String(b.category),
  name: b.category_name,
  icon: resolveIcon(b.category_icon),
  color: b.category_color,
  amount: parseMoney(b.amount),
  alertThreshold: b.alert_threshold,
  isActive: b.is_active,
  month: b.month,
  editable: b.editable,
  spent: parseMoney(b.spent),
  remaining: parseMoney(b.remaining),
  percent: b.percent,
  status: b.status,
});

export const toBudgetAlert = (a: ApiBudgetAlert): BudgetAlert => ({
  budgetId: String(a.budget),
  categoryId: a.category === null ? null : String(a.category),
  name: a.category_name,
  amount: parseMoney(a.amount),
  spent: parseMoney(a.spent),
  percent: a.percent,
  status: a.status,
});

// JSON.stringify bỏ trường undefined nên dùng chung cho tạo mới và sửa một phần.
// category: null là ngân sách tổng, nên phải phân biệt null với "không gửi"
const toBody = (input: Partial<BudgetInput>) =>
  JSON.stringify({
    category: input.categoryId === undefined ? undefined : input.categoryId && Number(input.categoryId),
    amount: input.amount === undefined ? undefined : toMoneyString(input.amount),
    alert_threshold: input.alertThreshold,
    is_active: input.isActive,
  });

const monthQuery = (month?: string) => (month ? `?month=${month}` : '');

/** Ngân sách kèm số đã chi của tháng `month` ("YYYY-MM", lib/date.ts → toMonthKey); mặc định tháng này */
export async function listBudgets(month?: string): Promise<Budget[]> {
  return (await apiFetch<ApiBudget[]>(`/budgets/${monthQuery(month)}`)).map(toBudget);
}

/** Ngân sách đang bật đã chạm ngưỡng cảnh báo hoặc vượt mức, nặng nhất lên đầu */
export async function listBudgetAlerts(month?: string): Promise<Budget[]> {
  return (await apiFetch<ApiBudget[]>(`/budgets/alerts/${monthQuery(month)}`)).map(toBudget);
}

/**
 * Hạn mức áp dụng từ tháng hiện tại trở đi; tháng đã qua giữ nguyên. Đặt lại ngân sách đã ngừng
 * thì server dùng tiếp ngân sách cũ (giữ lịch sử).
 * Lỗi 400 (vd. "Danh mục này đã có ngân sách.") đọc bằng getFieldErrors(e).category
 */
export async function createBudget(input: BudgetInput): Promise<Budget> {
  return toBudget(await apiFetch<ApiBudget>('/budgets/', { method: 'POST', body: toBody(input) }));
}

/** Sửa hạn mức của tháng hiện tại (không đổi được danh mục, không sửa được tháng đã qua) */
export async function updateBudget(id: string, input: Partial<Omit<BudgetInput, 'categoryId'>>): Promise<Budget> {
  return toBudget(await apiFetch<ApiBudget>(`/budgets/${id}/`, { method: 'PATCH', body: toBody(input) }));
}

/** Ngừng theo dõi từ tháng này; các tháng trước vẫn giữ hạn mức. Chưa có lịch sử thì server xóa hẳn */
export async function deleteBudget(id: string): Promise<void> {
  await apiFetch(`/budgets/${id}/`, { method: 'DELETE' });
}
