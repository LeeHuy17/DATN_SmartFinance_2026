import type { Transaction, Wallet } from '@/features/transactions/types';

export type DashboardData = {
  displayName: string;
  avatarUri: string | null;
  unreadNotifications: number;
  totalBalance: number;
  month: number;
  monthIncome: number;
  monthExpense: number;
  wallets: Wallet[];
  /** 3–5 giao dịch gần nhất */
  recentTransactions: Transaction[];
};
