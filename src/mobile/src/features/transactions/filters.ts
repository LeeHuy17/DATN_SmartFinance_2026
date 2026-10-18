import { addDays, toYmd } from '@/lib/date';
import type { TransactionFilters as ApiTransactionFilters } from './transactionQuery';
import type { Transaction } from './types';

export type TypeFilter = 'all' | 'expense' | 'income';
export type TimeFilter = 'all' | 'today' | '7d' | 'month' | 'custom';

export type TransactionFilters = {
  type: TypeFilter;
  time: TimeFilter;
  /** Dùng khi time = 'custom', dạng dd/mm/yyyy (để trống = không giới hạn) */
  from: string;
  to: string;
  /** id danh mục */
  categories: string[];
  walletIds: string[];
};

export const DEFAULT_FILTERS: TransactionFilters = {
  type: 'all',
  time: 'all',
  from: '',
  to: '',
  categories: [],
  walletIds: [],
};

export const TIME_LABELS: Record<Exclude<TimeFilter, 'all'>, string> = {
  today: 'Hôm nay',
  '7d': '7 ngày',
  month: 'Tháng này',
  custom: 'Tùy chọn',
};

/** Số lựa chọn đang bật trong bảng Bộ lọc (hiện trên nút "Áp dụng (n)") */
export function countActive(f: TransactionFilters) {
  return (
    (f.time !== 'all' ? 1 : 0) +
    (f.type !== 'all' ? 1 : 0) +
    f.categories.length +
    f.walletIds.length
  );
}

/** Bộ lọc nâng cao (ngoài loại thu/chi) có đang bật không — để tô nút lọc */
export const hasAdvancedFilters = (f: TransactionFilters) =>
  f.time !== 'all' || f.categories.length > 0 || f.walletIds.length > 0;

/** "dd/mm/yyyy" → Date, sai định dạng thì null */
export function parseDayInput(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) ? d : null;
}

/** Khoảng ngày [từ, đến] (giờ máy) của bộ lọc thời gian; null = không giới hạn */
function timeRange(f: TransactionFilters, now = new Date()): [Date | null, Date | null] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (f.time) {
    case 'today':
      return [today, null];
    case '7d':
      return [addDays(today, -6), null];
    case 'month':
      return [new Date(now.getFullYear(), now.getMonth(), 1), null];
    case 'custom':
      return [parseDayInput(f.from), parseDayInput(f.to)];
    default:
      return [null, null];
  }
}

/** Bỏ dấu tiếng Việt để "ca phe" tìm được "Cà phê" */
export const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** Bộ lọc trên màn hình + từ khóa → tham số của /transactions/ (server lọc, app chỉ hiển thị) */
export function toApiFilters(f: TransactionFilters, query: string): ApiTransactionFilters {
  const [from, to] = timeRange(f);
  return {
    kind: f.type === 'all' ? undefined : f.type,
    date_from: from ? toYmd(from) : undefined,
    date_to: to ? toYmd(to) : undefined,
    category: f.categories.join(',') || undefined,
    wallet: f.walletIds.join(',') || undefined,
    search: query.trim() || undefined,
  };
}

export const sumAmount = (list: Transaction[]) => list.reduce((s, t) => s + t.amount, 0);

export type DayGroup = { key: string; date: Date; items: Transaction[]; total: number };

/** Gom theo ngày, giữ thứ tự mới nhất trước */
export function groupByDay(list: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const t of list) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), items: [], total: 0 };
      groups.push(g);
    }
    g.items.push(t);
    g.total += t.amount;
  }
  return groups;
}
