import { unreadCount } from '@/features/notifications/notificationsStore';
import { getProfile, shortName } from '@/features/profile/profileStore';
import * as store from '@/features/transactions/localStore';
import * as walletsApi from '@/features/wallets/walletsApi';
import type { DashboardData } from './types';

/** Số giao dịch gần nhất hiển thị ở Tổng quan */
export const RECENT_LIMIT = 5;

export async function getDashboard(): Promise<DashboardData> {
  const [profile, wallets, summary] = await Promise.all([
    getProfile(),
    walletsApi.list(),
    walletsApi.getSummary(),
  ]);

  // Thu / chi tháng này: tính từ giao dịch đã nhập (TODO: lấy từ server khi có API giao dịch)
  const all = store.getAll();
  const now = new Date();
  const thisMonth = all.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  return {
    displayName: shortName(profile.fullName, profile.email),
    avatarUri: profile.avatarUri,
    unreadNotifications: unreadCount(),
    totalBalance: summary.totalBalance,
    walletCount: summary.walletCount,
    month: now.getMonth() + 1,
    monthIncome: thisMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    monthExpense: thisMonth.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0),
    wallets,
    recentTransactions: all.slice(0, RECENT_LIMIT),
  };
}
