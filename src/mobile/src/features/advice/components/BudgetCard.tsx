import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { BudgetUsage } from '@/features/advice/summary';
import { formatVnd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

/** Từ mức này trở lên thì cảnh báo "Sắp hết" */
const WARN_AT = 80;

type Props = {
  month: number;
  budgets: BudgetUsage[];
  /** Có thì hiện link "Thiết lập" */
  onSetup?: () => void;
};

function level(percent: number) {
  if (percent >= 100) return { color: colors.danger, icon: 'alert-circle' as const, label: 'Đã vượt' };
  if (percent >= WARN_AT) return { color: colors.expense, icon: 'warning-outline' as const, label: 'Sắp hết' };
  return { color: colors.primary, icon: null, label: null };
}

export function BudgetCard({ month, budgets, onSetup }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Ngân sách tháng {month}</Text>
        {onSetup && (
          <Pressable onPress={onSetup} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Thiết lập</Text>
          </Pressable>
        )}
      </View>

      {budgets.length === 0 ? (
        <Text style={styles.empty}>
          Chưa đặt ngân sách nào. Đặt hạn mức cho danh mục chi nhiều để được cảnh báo sớm.
        </Text>
      ) : (
        budgets.map((b) => {
          const percent = Math.round((b.spent / b.limit) * 100);
          const l = level(percent);
          return (
            <View
              key={b.categoryId}
              style={styles.row}
              accessibilityLabel={`${b.name}: đã chi ${formatVnd(b.spent)} trên ${formatVnd(b.limit)}, ${percent}%${l.label ? `, ${l.label}` : ''}`}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.name}>{b.name}</Text>
                {l.label && (
                  <View style={styles.status}>
                    <Ionicons name={l.icon!} size={13} color={l.color} />
                    <Text style={[styles.statusText, { color: l.color }]}>{l.label}</Text>
                  </View>
                )}
                <Text style={styles.percent}>{percent}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: l.color }]} />
              </View>
              <Text style={styles.amounts}>
                {formatVnd(b.spent)} / {formatVnd(b.limit)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  empty: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  row: { marginTop: spacing.md - 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  percent: { fontSize: 15, fontWeight: '700', color: colors.text },
  track: {
    marginTop: spacing.sm,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.disabled,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
  amounts: { marginTop: 6, fontSize: 13, color: colors.textMuted },
});
