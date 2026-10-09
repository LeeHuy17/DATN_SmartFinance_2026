// Dữ liệu giả lập dùng chung cho Tổng quan và Lịch sử giao dịch, sống trong bộ nhớ
// (mất khi tải lại app). TODO: bỏ file này khi backend có API ví và giao dịch.
import type { Transaction, Wallet } from './types';

let wallets: Wallet[] = [
  { id: 'w1', name: 'Tiền mặt', type: 'cash', balance: 2_450_000 },
  { id: 'w2', name: 'Vietcombank', type: 'bank', balance: 12_800_000 },
  { id: 'w3', name: 'MoMo', type: 'ewallet', balance: 640_000 },
];

const walletName = (id: string) => wallets.find((w) => w.id === id)?.name ?? '';

/** Mốc thời gian cách hôm nay `days` ngày, lúc hh:mm */
const at = (days: number, hh: number, mm: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

const lastMonthDay5 = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 5, 9, 0).toISOString();
};

const seed: Omit<Transaction, 'walletName'>[] = [
  {
    id: 't1',
    title: 'Highlands Coffee',
    category: 'food',
    walletId: 'w1',
    amount: -65_000,
    date: at(0, 8, 35),
    note: 'Cà phê với nhóm',
    source: 'ocr',
  },
  { id: 't2', title: 'Grab', category: 'transport', walletId: 'w3', amount: -48_000, date: at(0, 7, 50), source: 'manual' },
  {
    id: 't3',
    title: 'Co.opmart Đà Nẵng',
    category: 'shopping',
    walletId: 'w2',
    amount: -312_500,
    date: at(1, 18, 20),
    note: 'Đi chợ cuối tuần',
    source: 'ocr',
  },
  { id: 't4', title: 'Cà phê Cộng', category: 'food', walletId: 'w1', amount: -42_000, date: at(1, 9, 5), source: 'manual' },
  {
    id: 't5',
    title: 'Tiền điện tháng 9',
    category: 'bill',
    walletId: 'w2',
    amount: -520_000,
    date: at(2, 10, 0),
    source: 'ocr',
  },
  {
    id: 't6',
    title: 'CGV Vincom',
    category: 'entertainment',
    walletId: 'w3',
    amount: -180_000,
    date: at(2, 20, 15),
    note: 'Xem phim tối thứ bảy',
    source: 'manual',
  },
  {
    id: 't9',
    title: 'Thưởng dự án',
    category: 'bonus',
    walletId: 'w2',
    amount: 2_000_000,
    date: at(3, 17, 30),
    note: 'Thưởng hoàn thành dự án quý 3',
    source: 'manual',
  },
  { id: 't7', title: 'Bánh mì Phượng', category: 'food', walletId: 'w1', amount: -35_000, date: at(4, 7, 15), source: 'manual' },
  {
    id: 't8',
    title: 'Lương tháng 9',
    category: 'income',
    walletId: 'w2',
    amount: 15_000_000,
    date: lastMonthDay5(),
    source: 'manual',
  },
];

let transactions: Transaction[] = seed.map((t) => ({ ...t, walletName: walletName(t.walletId) }));

/** Cộng (hoặc trừ, khi sign = -1) số tiền giao dịch vào số dư ví */
const applyToWallet = (t: Pick<Transaction, 'walletId' | 'amount'>, sign: 1 | -1) => {
  wallets = wallets.map((w) => (w.id === t.walletId ? { ...w, balance: w.balance + sign * t.amount } : w));
};

export const getWallets = () => wallets.map((w) => ({ ...w }));

/** Mới nhất trước */
export const getAll = () => [...transactions].sort((a, b) => b.date.localeCompare(a.date));

export const getById = (id: string) => transactions.find((t) => t.id === id);

export type TransactionInput = Omit<Transaction, 'id' | 'walletName'>;

export const add = (input: TransactionInput): Transaction => {
  const t: Transaction = { ...input, id: `t${Date.now()}`, walletName: walletName(input.walletId) };
  transactions = [...transactions, t];
  applyToWallet(t, 1);
  return t;
};

export const update = (id: string, input: TransactionInput): Transaction | undefined => {
  const old = getById(id);
  if (!old) return undefined;
  const t: Transaction = { ...input, id, walletName: walletName(input.walletId) };
  // Hoàn lại số dư theo giao dịch cũ rồi áp số mới (có thể đã đổi ví hoặc số tiền)
  applyToWallet(old, -1);
  applyToWallet(t, 1);
  transactions = transactions.map((x) => (x.id === id ? t : x));
  return t;
};

export const remove = (id: string) => {
  const old = getById(id);
  if (old) applyToWallet(old, -1);
  transactions = transactions.filter((t) => t.id !== id);
};
