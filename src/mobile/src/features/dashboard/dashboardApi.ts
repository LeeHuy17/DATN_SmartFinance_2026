import * as store from '@/features/transactions/mockStore';
import type { DashboardData } from './types';

// TODO: thay hàm giả lập bằng apiFetch khi backend có endpoint tổng quan.
// Giữ nguyên chữ ký hàm để màn hình không phải sửa.

/** Số giao dịch gần nhất hiển thị ở Tổng quan */
export const RECENT_LIMIT = 5;

const fakeDelay = (ms = 1200) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDashboard(): Promise<DashboardData> {
  await fakeDelay();
  const wallets = store.getWallets();
  const all = store.getAll();

  // Thu / chi của tháng hiện tại, tính từ giao dịch
  const now = new Date();
  const thisMonth = all.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  return {
    displayName: 'Văn An',
    unreadNotifications: 3,
    totalBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
    month: now.getMonth() + 1,
    monthIncome: thisMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    monthExpense: thisMonth.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0),
    wallets,
    recentTransactions: all.slice(0, RECENT_LIMIT),
  };
}
