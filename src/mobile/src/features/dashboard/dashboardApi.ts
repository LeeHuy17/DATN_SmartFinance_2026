import * as store from '@/features/transactions/mockStore';
import type { DashboardData } from './types';

// TODO: thay hàm giả lập bằng apiFetch khi backend có endpoint tổng quan.
// Giữ nguyên chữ ký hàm để màn hình không phải sửa.

/** Số giao dịch gần nhất hiển thị ở Tổng quan */
export const RECENT_LIMIT = 5;

const fakeDelay = (ms = 1200) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDashboard(): Promise<DashboardData> {
  await fakeDelay();
  const wallets = store.WALLETS;

  return {
    displayName: 'Văn An',
    unreadNotifications: 3,
    totalBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
    month: new Date().getMonth() + 1,
    monthIncome: 15_000_000,
    monthExpense: 6_215_500,
    wallets,
    recentTransactions: store.getAll().slice(0, RECENT_LIMIT),
  };
}
