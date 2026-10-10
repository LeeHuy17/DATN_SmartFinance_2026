import type { IconName, WalletType } from '@/features/transactions/types';
import { colors } from '@/theme';

export const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank', label: 'Ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
];

export const walletTypeLabel = (t: WalletType) => WALLET_TYPES.find((x) => x.value === t)?.label ?? '';

/** Biểu tượng và màu ô vuông của ví trong danh sách */
export const WALLET_ICON: Record<WalletType, { icon: IconName; bg: string; fg: string }> = {
  cash: { icon: 'wallet-outline', bg: colors.primarySoft, fg: colors.primary },
  bank: { icon: 'wallet-outline', bg: colors.primarySoft, fg: colors.primary },
  ewallet: { icon: 'wallet-outline', bg: colors.warmSoft, fg: colors.warm },
};
