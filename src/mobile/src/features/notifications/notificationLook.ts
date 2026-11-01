import type { Ionicons } from '@expo/vector-icons';

import type { Colors } from '@/theme';
import type { AppNotification, NotificationType } from './notificationsStore';

/** Biểu tượng và màu ô vuông theo loại thông báo */
const notificationLooks = (
  colors: Colors,
): Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> => ({
  budget: { icon: 'warning-outline', bg: colors.warmSoft, fg: colors.warm },
  ocr: { icon: 'scan-outline', bg: colors.primarySoft, fg: colors.primary },
  advice: { icon: 'sparkles-outline', bg: colors.primarySoft, fg: colors.primary },
  reminder: { icon: 'wallet-outline', bg: colors.surfaceMuted, fg: colors.textMuted },
  security: { icon: 'shield-checkmark-outline', bg: colors.surfaceMuted, fg: colors.textMuted },
});

/** Look của một thông báo: tone danger (vd. đã vượt ngân sách) tô đỏ, còn lại theo loại */
export const lookOf = (n: Pick<AppNotification, 'type' | 'tone'>, colors: Colors) =>
  n.tone === 'danger'
    ? ({ icon: 'alert-circle-outline', bg: colors.dangerSoft, fg: colors.danger } as const)
    : notificationLooks(colors)[n.type];
