import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Budget } from '@/features/budgets/budgetsApi';
import { formatVnd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

/** Tối đa chừng này dòng, còn lại gom vào "và n ngân sách khác" */
const MAX_ROWS = 3;

type Props = { alerts: Budget[]; onPress: () => void };

/** Thẻ trên Tổng quan: các ngân sách tháng này đã chạm ngưỡng cảnh báo hoặc đã vượt (từ /budgets/alerts/) */
export function BudgetAlertCard({ alerts, onPress }: Props) {
  if (alerts.length === 0) return null;
  const anyExceeded = alerts.some((a) => a.status === 'exceeded');
  const tone = anyExceeded
    ? { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const }
    : { bg: colors.warmSoft, fg: colors.warm, icon: 'warning-outline' as const };
  const rest = alerts.length - MAX_ROWS;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: tone.bg }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${alerts.length} ngân sách cần chú ý. Chạm để xem`}
    >
      <View style={styles.header}>
        <Ionicons name={tone.icon} size={18} color={tone.fg} />
        <Text style={[styles.title, { color: tone.fg }]}>
          {anyExceeded ? 'Có ngân sách đã vượt' : 'Ngân sách sắp hết'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={tone.fg} />
      </View>
      {alerts.slice(0, MAX_ROWS).map((a) => {
        const exceeded = a.status === 'exceeded';
        return (
          <Text key={a.id} style={styles.row} numberOfLines={1}>
            <Text style={styles.name}>{a.name}</Text>
            {exceeded
              ? ` · vượt ${formatVnd(a.remaining)} (${Math.round(a.percent)}%)`
              : ` · đã dùng ${Math.round(a.percent)}%, còn ${formatVnd(a.remaining)}`}
          </Text>
        );
      })}
      {rest > 0 && <Text style={styles.row}>và {rest} ngân sách khác</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, padding: spacing.md - 2, borderRadius: radius.lg, gap: 4 },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  title: { flex: 1, fontSize: 14, fontWeight: '700' },
  row: { fontSize: 13, lineHeight: 19, color: colors.text },
  name: { fontWeight: '700' },
});
