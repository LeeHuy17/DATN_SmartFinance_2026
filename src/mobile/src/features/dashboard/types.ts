import type { Budget } from '@/features/budgets/budgetsApi';
import type { Transaction, Wallet } from '@/features/transactions/types';

export type DashboardData = {
  displayName: string;
  avatarUri: string | null;
  unreadNotifications: number;
  /** Ngân sách tháng này đang chạm ngưỡng hoặc đã vượt, nặng nhất trước */
  budgetAlerts: Budget[];
  /** Tổng tài sản từ /wallets/summary/ (chỉ ví đang dùng và có tính vào tổng) */
  totalBalance: number;
  /** Số ví được cộng vào tổng tài sản */
  walletCount: number;
  month: number;
  monthIncome: number;
  monthExpense: number;
  /** Các ví đang dùng */
  wallets: Wallet[];
  /** 3–5 giao dịch gần nhất */
  recentTransactions: Transaction[];
};
