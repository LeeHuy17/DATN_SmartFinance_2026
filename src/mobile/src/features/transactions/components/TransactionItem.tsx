import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { categoryTint } from '@/features/transactions/categories';
import type { Transaction } from '@/features/transactions/types';
import { formatDayMonth, formatRelativeDay, formatSignedVnd } from '@/lib/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type Props = {
  item: Transaction;
  onPress?: (item: Transaction) => void;
  /**
   * Ngày ở dòng phụ: relative ("Hôm nay"), date ("03/10"), none (danh sách đã nhóm theo ngày).
   * Server chỉ lưu ngày, không có giờ.
   */
  when?: 'relative' | 'date' | 'none';
  divider?: boolean;
};

export function TransactionItem({ item, onPress, when = 'relative', divider }: Props) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const { category } = item;
  const income = item.amount > 0;
  const whenText =
    when === 'none' ? null : when === 'date' ? formatDayMonth(item.date) : formatRelativeDay(item.date);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
      onPress={onPress && (() => onPress(item))}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formatSignedVnd(item.amount)}`}
    >
      <View style={[styles.icon, { backgroundColor: categoryTint(category.color, isDark).bg }]}>
        <Ionicons name={category.icon} size={20} color={categoryTint(category.color, isDark).fg} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.meta}>
          {[category.name, item.walletName, whenText].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <Text style={[styles.amount, { color: income ? colors.primary : colors.expense }]}>
        {formatSignedVnd(item.amount)}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
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
}));
