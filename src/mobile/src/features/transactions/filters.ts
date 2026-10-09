import { CATEGORIES } from './categories';
import type { Category, Transaction } from './types';

export type TypeFilter = 'all' | 'expense' | 'income';
export type TimeFilter = 'all' | 'today' | '7d' | 'month' | 'custom';

export type TransactionFilters = {
  type: TypeFilter;
  time: TimeFilter;
  /** Dùng khi time = 'custom', dạng dd/mm/yyyy (để trống = không giới hạn) */
  from: string;
  to: string;
  categories: Category[];
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

function timeRange(f: TransactionFilters, now = new Date()): [Date | null, Date | null] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (f.time) {
    case 'today':
      return [startOfToday, null];
    case '7d':
      return [new Date(startOfToday.getTime() - 6 * 86_400_000), null];
    case 'month':
      return [new Date(now.getFullYear(), now.getMonth(), 1), null];
    case 'custom': {
      const to = parseDayInput(f.to);
      // Hết ngày "đến"
      return [parseDayInput(f.from), to && new Date(to.getTime() + 86_400_000 - 1)];
    }
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

/** Tìm theo tên, ghi chú, danh mục hoặc số tiền */
function matchesQuery(t: Transaction, query: string) {
  const q = normalizeText(query);
  if (!q) return true;
  const haystack = normalizeText(
    [t.title, t.note ?? '', CATEGORIES[t.category].label, t.walletName].join(' '),
  );
  if (haystack.includes(q)) return true;
  // "65000", "65.000" hay "65k" đều khớp -65.000đ
  const digits = query.replace(/k$/i, '000').replace(/\D/g, '');
  return digits.length >= 2 && String(Math.abs(t.amount)).includes(digits);
}

export function applyFilters(list: Transaction[], f: TransactionFilters, query: string) {
  const [from, to] = timeRange(f);
  return list.filter((t) => {
    if (f.type === 'expense' && t.amount >= 0) return false;
    if (f.type === 'income' && t.amount < 0) return false;
    const d = new Date(t.date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (f.categories.length && !f.categories.includes(t.category)) return false;
    if (f.walletIds.length && !f.walletIds.includes(t.walletId)) return false;
    return matchesQuery(t, query);
  });
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
