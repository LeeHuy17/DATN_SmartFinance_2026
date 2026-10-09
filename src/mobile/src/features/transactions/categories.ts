import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';
import type { Category } from './types';

type CategoryInfo = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
};

export const CATEGORIES: Record<Category, CategoryInfo> = {
  food: { label: 'Ăn uống', icon: 'cafe-outline', bg: colors.warmSoft, fg: colors.warm },
  transport: { label: 'Di chuyển', icon: 'car-outline', bg: colors.infoSoft, fg: colors.walletBank },
  shopping: { label: 'Mua sắm', icon: 'cart-outline', bg: colors.primarySoft, fg: colors.primary },
  entertainment: { label: 'Giải trí', icon: 'film-outline', bg: colors.disabled, fg: colors.textMuted },
  bill: { label: 'Hóa đơn', icon: 'flash-outline', bg: colors.warmSoft, fg: colors.warm },
  income: { label: 'Thu nhập', icon: 'arrow-down', bg: colors.primarySoft, fg: colors.primary },
};

/** Danh mục chi tiêu, dùng cho bộ lọc */
export const EXPENSE_CATEGORIES: Category[] = ['food', 'transport', 'shopping', 'entertainment', 'bill'];
