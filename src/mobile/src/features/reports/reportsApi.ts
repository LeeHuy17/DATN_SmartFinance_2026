import { apiFetch } from '@/lib/api/client';
import { toMonthKey, toYmd } from '@/lib/date';
import { parseMoney } from '@/lib/money';
import {
  categorySlices,
  monthBuckets,
  periodRange,
  weekBuckets,
  yearBuckets,
  type Period,
  type Report,
  type ReportKind,
} from './aggregate';

// ---------- Dữ liệu thô của server (/api/reports/...) ----------
// Số tiền là Decimal dạng chuỗi ("65000.50"); phần trăm là số, chỉ để hiển thị.

export type CategoryStat = {
  category: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: string;
  count: number;
  percent: number;
};

export type Overview = {
  month: string;
  income: string;
  expense: string;
  net: string;
  previous_month: string;
  previous: { income: string; expense: string; net: string };
  /** null khi tháng trước bằng 0 (không chia được): app hiện "—" */
  income_change_percent: number | null;
  expense_change_percent: number | null;
  top_expense_categories: CategoryStat[];
};

export type MonthlyReport = {
  year: number;
  total_income: string;
  total_expense: string;
  net: string;
  /** Đủ 12 tháng, tháng không có giao dịch là "0.00" */
  months: { month: string; income: string; expense: string; net: string }[];
};

export type CategoryReport = { kind: ReportKind; total: string; items: CategoryStat[]; from: string; to: string };

export type DailyReport = { month: string; days: { date: string; income: string; expense: string }[] };

const q = (p: Record<string, string | number | undefined>) =>
  Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

/** month: "YYYY-MM" ghép từ giờ máy (lib/date.ts → toMonthKey); mặc định tháng này. wallet: lọc theo một ví */
export const getOverview = (month?: string, wallet?: number) =>
  apiFetch<Overview>(`/reports/overview/?${q({ month, wallet })}`);

export const getMonthlyReport = (year?: number, wallet?: number) =>
  apiFetch<MonthlyReport>(`/reports/monthly/?${q({ year, wallet })}`);

/** Theo tháng (month) hoặc khoảng ngày date_from–date_to (YYYY-MM-DD, tính cả hai đầu); kind mặc định expense */
export const getCategoryReport = (p: {
  month?: string;
  date_from?: string;
  date_to?: string;
  kind?: ReportKind;
  wallet?: number;
}) => apiFetch<CategoryReport>(`/reports/by-category/?${q(p)}`);

export const getDailyReport = (month?: string, wallet?: number) =>
  apiFetch<DailyReport>(`/reports/daily/?${q({ month, wallet })}`);

// ---------- Ghép số liệu cho màn Báo cáo ----------

const toCategoryTotals = (r: CategoryReport) =>
  r.items.map((i) => ({
    id: String(i.category),
    name: i.category_name,
    color: i.category_color,
    amount: parseMoney(i.total),
  }));

/**
 * Báo cáo của kỳ cách kỳ hiện tại `offset` kỳ (0 = kỳ này, -1 = kỳ trước); `kind` là loại của
 * biểu đồ tròn. Mọi con số do server tổng hợp, app chỉ gom thành cột và phần biểu đồ.
 */
export async function getReport(period: Period, offset = 0, kind: ReportKind = 'expense'): Promise<Report> {
  const { from, to } = periodRange(period, offset);
  const base = { period, from, to, isCurrent: offset === 0, kind };

  if (period === 'month') {
    const month = toMonthKey(from);
    const [overview, categories, daily] = await Promise.all([
      getOverview(month),
      getCategoryReport({ month, kind }),
      getDailyReport(month),
    ]);
    return {
      ...base,
      totalIncome: parseMoney(overview.income),
      totalExpense: parseMoney(overview.expense),
      slices: categorySlices(toCategoryTotals(categories)),
      buckets: monthBuckets(from, daily.days.map((d) => parseMoney(d.expense))),
      change: {
        previousMonth: overview.previous_month,
        income: overview.income_change_percent,
        expense: overview.expense_change_percent,
      },
    };
  }

  if (period === 'year') {
    const year = from.getFullYear();
    const [monthly, categories] = await Promise.all([
      getMonthlyReport(year),
      getCategoryReport({ date_from: toYmd(from), date_to: toYmd(to), kind }),
    ]);
    return {
      ...base,
      totalIncome: parseMoney(monthly.total_income),
      totalExpense: parseMoney(monthly.total_expense),
      slices: categorySlices(toCategoryTotals(categories)),
      buckets: yearBuckets(year, monthly.months.map((m) => parseMoney(m.expense))),
      change: null,
    };
  }

  // Tuần: tổng thu / chi lấy từ by-category của cả hai loại; tuần có thể vắt qua hai tháng
  const range = { date_from: toYmd(from), date_to: toYmd(to) };
  const months = [...new Set([toMonthKey(from), toMonthKey(to)])];
  const [expense, income, ...dailies] = await Promise.all([
    getCategoryReport({ ...range, kind: 'expense' }),
    getCategoryReport({ ...range, kind: 'income' }),
    ...months.map((m) => getDailyReport(m)),
  ]);
  const expenseByDay = new Map(dailies.flatMap((d) => d.days.map((x) => [x.date, parseMoney(x.expense)] as const)));
  return {
    ...base,
    totalIncome: parseMoney(income.total),
    totalExpense: parseMoney(expense.total),
    slices: categorySlices(toCategoryTotals(kind === 'expense' ? expense : income)),
    buckets: weekBuckets(from, expenseByDay),
    change: null,
  };
}
