import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { categoryTint } from '@/features/transactions/categories';
import type { IconName } from '@/features/transactions/types';
import { radius, useTheme } from '@/theme';

type Props = { icon: IconName; color: string; size?: number; dimmed?: boolean };

/** Ô vuông bo góc nền nhạt + biểu tượng theo màu danh mục */
export function CategoryIcon({ icon, color, size = 40, dimmed }: Props) {
  const tint = categoryTint(color, useTheme().isDark);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size >= 56 ? radius.lg + 4 : radius.md,
          backgroundColor: tint.bg,
        },
        dimmed && styles.dimmed,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={tint.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.5 },
});
