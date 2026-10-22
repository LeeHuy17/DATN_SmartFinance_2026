import { listBudgetAlerts } from '@/features/budgets/budgetsApi';
import { getSettings, getUnreadCount } from '@/features/notifications/notificationsApi';
import { getProfile, shortName } from '@/features/profile/profileStore';
import { getTransactionSummary, listTransactions } from '@/features/transactions/transactionsApi';
import * as walletsApi from '@/features/wallets/walletsApi';
import { toYmd } from '@/lib/date';
import type { DashboardData } from './types';

/** Số giao dịch gần nhất hiển thị ở Tổng quan */
export const RECENT_LIMIT = 5;

export async function getDashboard(): Promise<DashboardData> {
  const now = new Date();
  const [profile, wallets, summary, recent, month, budgetAlerts, unread] = await Promise.all([
    getProfile(),
    walletsApi.list(),
    walletsApi.getSummary(),
    listTransactions({ page_size: RECENT_LIMIT }),
    getTransactionSummary({ date_from: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)) }),
    // Lỗi ngân sách không làm hỏng cả trang chủ, chỉ ẩn thẻ cảnh báo
    listBudgetAlerts().catch(() => []),
    getUnreadCount().catch(() => 0),
    // Nạp sẵn cài đặt thông báo để banner biết người dùng đã tắt loại nào
    getSettings().catch(() => null),
  ]);

  return {
    displayName: shortName(profile.fullName, profile.email),
    avatarUri: profile.avatarUri,
    // Chuông: số thông báo chưa đọc trong Hộp thư (cảnh báo ngân sách cũng được lưu vào đó)
    unreadNotifications: unread,
    budgetAlerts,
    totalBalance: summary.totalBalance,
    walletCount: summary.walletCount,
    month: now.getMonth() + 1,
    monthIncome: month.income,
    monthExpense: month.expense,
    wallets,
    recentTransactions: recent.items,
  };
}
