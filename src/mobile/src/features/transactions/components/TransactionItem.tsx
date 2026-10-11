import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { softColor } from '@/features/transactions/categories';
import type { Transaction } from '@/features/transactions/types';
import { formatDayMonth, formatRelativeDay, formatSignedVnd, formatTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

type Props = {
  item: Transaction;
  onPress?: (item: Transaction) => void;
  /**
   * Thời điểm ở dòng phụ: relative ("Hôm nay"), time ("08:35" — khi đã nhóm theo ngày),
   * date ("03/10" — kết quả tìm kiếm)
   */
  when?: 'relative' | 'time' | 'date';
  divider?: boolean;
};

export function TransactionItem({ item, onPress, when = 'relative', divider }: Props) {
  const { category } = item;
  const income = item.amount > 0;
  const whenText =
    when === 'time'
      ? formatTime(item.date)
      : when === 'date'
        ? formatDayMonth(item.date)
        : formatRelativeDay(item.date);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
      onPress={onPress && (() => onPress(item))}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formatSignedVnd(item.amount)}`}
    >
      <View style={[styles.icon, { backgroundColor: softColor(category.color) }]}>
        <Ionicons name={category.icon} size={20} color={category.color} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.meta}>
          {category.name} · {item.walletName} · {whenText}
        </Text>
      </View>

      <Text style={[styles.amount, { color: income ? colors.primary : colors.expense }]}>
        {formatSignedVnd(item.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingVertical: 14,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  amount: { fontSize: 15, fontWeight: '700' },
});
