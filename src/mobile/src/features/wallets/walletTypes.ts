import type { IconName, WalletType } from '@/features/transactions/types';
import type { Colors } from '@/theme';

/** Khớp Wallet.Kind ở backend (wallets/models.py) */
export const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank', label: 'Ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
  { value: 'credit', label: 'Thẻ tín dụng' },
  { value: 'savings', label: 'Tiết kiệm' },
];

export const walletTypeLabel = (t: WalletType) => WALLET_TYPES.find((x) => x.value === t)?.label ?? '';

/** Biểu tượng và màu ô vuông của ví trong danh sách */
export const walletIcon = (colors: Colors): Record<WalletType, { icon: IconName; bg: string; fg: string }> => ({
  cash: { icon: 'wallet-outline', bg: colors.primarySoft, fg: colors.primary },
  bank: { icon: 'business-outline', bg: colors.infoSoft, fg: colors.walletBank },
  ewallet: { icon: 'phone-portrait-outline', bg: colors.warmSoft, fg: colors.warm },
  credit: { icon: 'card-outline', bg: colors.dangerSoft, fg: colors.danger },
  savings: { icon: 'trending-up-outline', bg: colors.primarySoft, fg: colors.primary },
});
