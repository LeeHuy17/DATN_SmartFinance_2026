import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CATEGORIES } from '@/features/transactions/categories';
import type { Category } from '@/features/transactions/types';
import { colors, radius, spacing } from '@/theme';

type Props = {
  categories: Category[];
  value: Category | null;
  onChange: (c: Category) => void;
};

const COLUMNS = 4;

/** Lưới chọn danh mục, 4 ô mỗi hàng */
export function CategoryGrid({ categories, value, onChange }: Props) {
  const rows: (Category | null)[][] = [];
  for (let i = 0; i < categories.length; i += COLUMNS) {
    const row: (Category | null)[] = categories.slice(i, i + COLUMNS);
    // Hàng cuối thiếu ô thì thêm ô trống để các ô giữ cùng độ rộng
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  const renderTile = (c: Category) => {
    const selected = c === value;
    const info = CATEGORIES[c];
    return (
      <Pressable
        key={c}
        style={[styles.tile, selected && styles.tileSelected]}
        onPress={() => onChange(c)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={info.label}
      >
        <Ionicons name={info.icon} size={22} color={selected ? colors.primary : colors.textMuted} />
        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
          {info.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((c, i) => (c ? renderTile(c) : <View key={`empty-${i}`} style={styles.spacer} />))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  spacer: { flex: 1 },
  tile: {
    flex: 1,
    height: 72,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
  label: { fontSize: 12, fontWeight: '500', color: colors.text },
  labelSelected: { fontWeight: '700', color: colors.primary },
});
