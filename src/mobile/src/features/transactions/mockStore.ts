// Dữ liệu giả lập dùng chung cho Tổng quan, Lịch sử giao dịch, Ví và Danh mục; sống trong bộ nhớ
// (mất khi tải lại app). TODO: bỏ file này khi backend có API ví, danh mục và giao dịch.
import { normalizeText } from './filters';
import type {
  Category,
  CategoryKind,
  Transaction,
  TransactionInput,
  Wallet,
  WalletType,
} from './types';

export class DuplicateNameError extends Error {
  constructor() {
    super('DUPLICATE_NAME');
  }
}

export class CategoryInUseError extends Error {
  constructor() {
    super('CATEGORY_IN_USE');
  }
}

/** So tên không phân biệt hoa thường, dấu và khoảng trắng thừa */
const sameName = (a: string, b: string) =>
  normalizeText(a).replace(/\s+/g, ' ') === normalizeText(b).replace(/\s+/g, ' ');

// ---------- Ví ----------

let wallets: Wallet[] = [
  { id: 'w1', name: 'Tiền mặt', type: 'cash', balance: 2_450_000 },
  { id: 'w2', name: 'Vietcombank', type: 'bank', balance: 12_800_000 },
  { id: 'w3', name: 'MoMo', type: 'ewallet', balance: 640_000 },
];

export const getWallets = () => wallets.map((w) => ({ ...w }));

export const addWallet = (input: { name: string; type: WalletType; balance: number }): Wallet => {
  if (wallets.some((w) => sameName(w.name, input.name))) throw new DuplicateNameError();
  const w: Wallet = { ...input, name: input.name.trim(), id: `w${Date.now()}` };
  wallets = [...wallets, w];
  return w;
};

// ---------- Danh mục ----------

let categories: Category[] = [
  { id: 'c-food', name: 'Ăn uống', kind: 'expense', color: '#E08A1E', icon: 'cafe-outline', hidden: false },
  { id: 'c-transport', name: 'Di chuyển', kind: 'expense', color: '#2F6FB5', icon: 'car-outline', hidden: false },
  { id: 'c-shopping', name: 'Mua sắm', kind: 'expense', color: '#0F6B4F', icon: 'cart-outline', hidden: false },
  { id: 'c-fun', name: 'Giải trí', kind: 'expense', color: '#7C5CB5', icon: 'film-outline', hidden: false },
  { id: 'c-bill', name: 'Hóa đơn', kind: 'expense', color: '#1F8A85', icon: 'flash-outline', hidden: false },
  { id: 'c-health', name: 'Y tế', kind: 'expense', color: '#C8436B', icon: 'heart-outline', hidden: false },
  { id: 'c-edu', name: 'Giáo dục', kind: 'expense', color: '#8A6A3D', icon: 'book-outline', hidden: true },
  { id: 'c-other-exp', name: 'Khác', kind: 'expense', color: '#5E6A65', icon: 'pricetag-outline', hidden: false },
  { id: 'c-salary', name: 'Lương', kind: 'income', color: '#0F6B4F', icon: 'wallet-outline', hidden: false },
  { id: 'c-bonus', name: 'Thưởng', kind: 'income', color: '#E08A1E', icon: 'gift-outline', hidden: false },
  { id: 'c-other-inc', name: 'Khác', kind: 'income', color: '#5E6A65', icon: 'pricetag-outline', hidden: false },
];

export const getCategories = (kind?: CategoryKind) =>
  categories.filter((c) => !kind || c.kind === kind).map((c) => ({ ...c }));

export const getCategory = (id: string) => categories.find((c) => c.id === id);

export type CategoryInput = Omit<Category, 'id'>;

const assertUniqueCategoryName = (input: CategoryInput, exceptId?: string) => {
  const clash = categories.some(
    (c) => c.id !== exceptId && c.kind === input.kind && sameName(c.name, input.name),
  );
  if (clash) throw new DuplicateNameError();
};

export const addCategory = (input: CategoryInput): Category => {
  assertUniqueCategoryName(input);
  const c: Category = { ...input, name: input.name.trim(), id: `c${Date.now()}` };
  categories = [...categories, c];
  return c;
};

export const updateCategory = (id: string, input: CategoryInput): Category => {
  assertUniqueCategoryName(input, id);
  const c: Category = { ...input, name: input.name.trim(), id };
  categories = categories.map((x) => (x.id === id ? c : x));
  return c;
};

export const removeCategory = (id: string) => {
  if (countByCategory(id) > 0) throw new CategoryInUseError();
  categories = categories.filter((c) => c.id !== id);
};

// ---------- Giao dịch ----------

type StoredTransaction = TransactionInput & { id: string };

/** Mốc thời gian cách hôm nay `days` ngày, lúc hh:mm */
const at = (days: number, hh: number, mm: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

const lastMonth = (day: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, day, 9, 0).toISOString();
};

let transactions: StoredTransaction[] = [
  {
    id: 't1',
    title: 'Highlands Coffee',
    categoryId: 'c-food',
    walletId: 'w1',
    amount: -65_000,
    date: at(0, 8, 35),
    note: 'Cà phê với nhóm',
    source: 'ocr',
  },
  { id: 't2', title: 'Grab', categoryId: 'c-transport', walletId: 'w3', amount: -48_000, date: at(0, 7, 50), source: 'manual' },
  {
    id: 't3',
    title: 'Co.opmart Đà Nẵng',
    categoryId: 'c-shopping',
    walletId: 'w2',
    amount: -312_500,
    date: at(1, 18, 20),
    note: 'Đi chợ cuối tuần',
    source: 'ocr',
  },
  { id: 't4', title: 'Cà phê Cộng', categoryId: 'c-food', walletId: 'w1', amount: -42_000, date: at(1, 9, 5), source: 'manual' },
  { id: 't5', title: 'Tiền điện tháng 9', categoryId: 'c-bill', walletId: 'w2', amount: -520_000, date: at(2, 10, 0), source: 'ocr' },
  {
    id: 't6',
    title: 'CGV Vincom',
    categoryId: 'c-fun',
    walletId: 'w3',
    amount: -180_000,
    date: at(2, 20, 15),
    note: 'Xem phim tối thứ bảy',
    source: 'manual',
  },
  {
    id: 't9',
    title: 'Thưởng dự án',
    categoryId: 'c-bonus',
    walletId: 'w2',
    amount: 2_000_000,
    date: at(3, 17, 30),
    note: 'Thưởng hoàn thành dự án quý 3',
    source: 'manual',
  },
  { id: 't7', title: 'Bánh mì Phượng', categoryId: 'c-food', walletId: 'w1', amount: -35_000, date: at(4, 7, 15), source: 'manual' },
  { id: 't8', title: 'Lương tháng 9', categoryId: 'c-salary', walletId: 'w2', amount: 15_000_000, date: lastMonth(5), source: 'manual' },
  // Danh mục "Giáo dục" đang ẩn nhưng vẫn có giao dịch cũ
  { id: 't10', title: 'Học phí tiếng Anh', categoryId: 'c-edu', walletId: 'w2', amount: -1_200_000, date: lastMonth(10), source: 'manual' },
  { id: 't11', title: 'Sách lập trình', categoryId: 'c-edu', walletId: 'w3', amount: -250_000, date: lastMonth(18), source: 'ocr' },
];

export const countByCategory = (categoryId: string) =>
  transactions.filter((t) => t.categoryId === categoryId).length;

/** Gắn tên ví và thông tin danh mục hiện tại vào giao dịch để hiển thị */
const hydrate = (t: StoredTransaction): Transaction => {
  const { categoryId, ...rest } = t;
  const c = getCategory(categoryId);
  return {
    ...rest,
    walletName: wallets.find((w) => w.id === t.walletId)?.name ?? '',
    category: c
      ? { id: c.id, name: c.name, color: c.color, icon: c.icon }
      : { id: categoryId, name: 'Không rõ', color: '#5E6A65', icon: 'help-outline' },
  };
};

/** Cộng (hoặc trừ, khi sign = -1) số tiền giao dịch vào số dư ví */
const applyToWallet = (t: Pick<StoredTransaction, 'walletId' | 'amount'>, sign: 1 | -1) => {
  wallets = wallets.map((w) => (w.id === t.walletId ? { ...w, balance: w.balance + sign * t.amount } : w));
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
  applyToWallet(t, 1);
  return hydrate(t);
};

export const update = (id: string, input: TransactionInput): Transaction | undefined => {
  const old = findStored(id);
  if (!old) return undefined;
  const t: StoredTransaction = { ...input, id };
  // Hoàn lại số dư theo giao dịch cũ rồi áp số mới (có thể đã đổi ví hoặc số tiền)
  applyToWallet(old, -1);
  applyToWallet(t, 1);
  transactions = transactions.map((x) => (x.id === id ? t : x));
  return hydrate(t);
};

export const remove = (id: string) => {
  const old = findStored(id);
  if (old) applyToWallet(old, -1);
  transactions = transactions.filter((t) => t.id !== id);
};
