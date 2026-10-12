import type { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';
import type { NotificationType } from './notificationsStore';

/** Biểu tượng và màu ô vuông theo loại thông báo */
export const NOTIFICATION_LOOK: Record<
  NotificationType,
  { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }
> = {
  budget: { icon: 'warning-outline', bg: colors.warmSoft, fg: colors.warm },
  ocr: { icon: 'scan-outline', bg: colors.primarySoft, fg: colors.primary },
  advice: { icon: 'sparkles-outline', bg: colors.primarySoft, fg: colors.primary },
  reminder: { icon: 'wallet-outline', bg: colors.surfaceMuted, fg: colors.textMuted },
  security: { icon: 'shield-checkmark-outline', bg: colors.surfaceMuted, fg: colors.textMuted },
};
