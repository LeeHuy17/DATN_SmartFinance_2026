import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Budget, BudgetStatus } from '@/features/budgets/budgetsApi';
import { CategoryIcon } from '@/features/transactions/components/CategoryIcon';
import { formatVnd } from '@/lib/format';
import { makeStyles, radius, spacing, useColors, type Colors } from '@/theme';

type Props = {
  /** Tháng đang xem (ngày 1 của tháng, giờ máy) */
  month: Date;
  /** null = đang tải */
  budgets: Budget[] | null;
  error?: boolean;
  onRetry?: () => void;
  /** Có thì hiện nút chuyển tháng; không cho xem tháng sau tháng hiện tại */
  onChangeMonth?: (delta: -1 | 1) => void;
  /** Có thì hiện nút "Thêm" và cho chạm vào ngân sách để sửa, chỉ ở tháng hiện tại (tháng cũ là lịch sử) */
  onAdd?: () => void;
  onEdit?: (b: Budget) => void;
};

/** Màu và nhãn theo trạng thái server trả (warning từ ngưỡng cảnh báo, exceeded khi vượt hạn mức) */
const levels = (
  colors: Colors,
): Record<BudgetStatus, { color: string; icon: keyof typeof Ionicons.glyphMap | null; label: string | null }> => ({
  ok: { color: colors.primary, icon: null, label: null },
  warning: { color: colors.expense, icon: 'warning-outline', label: 'Sắp hết' },
  exceeded: { color: colors.danger, icon: 'alert-circle', label: 'Đã vượt' },
});

/** remaining âm nghĩa là đã vượt: hiện "Vượt 32.000đ" thay vì số âm */
const remainingText = (b: Budget) =>
  b.remaining < 0 ? `Vượt ${formatVnd(b.remaining)}` : `Còn ${formatVnd(b.remaining)}`;

export function BudgetCard({ month, budgets, error, onRetry, onChangeMonth, onAdd, onEdit }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const now = new Date();
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const title = isCurrentMonth
    ? `Ngân sách tháng ${month.getMonth() + 1}`
    : `Ngân sách ${month.getMonth() + 1}/${month.getFullYear()}`;

  const renderBody = () => {
    if (error) {
      return (
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
          <Text style={styles.empty}>
            Không tải được ngân sách. <Text style={styles.link}>Thử lại</Text>
          </Text>
        </Pressable>
      );
    }
    if (!budgets) return <ActivityIndicator style={styles.loading} color={colors.primary} />;
    if (budgets.length === 0) {
      return (
        <Text style={styles.empty}>
          {isCurrentMonth
            ? 'Chưa đặt ngân sách nào. Đặt hạn mức cho danh mục chi nhiều hoặc cho tổng chi tiêu để được cảnh báo sớm.'
            : 'Tháng này không có ngân sách nào.'}
        </Text>
      );
    }
    return budgets.map((b) => {
      const editHandler = b.editable ? onEdit : undefined;
      const l = b.isActive ? levels(colors)[b.status] : { color: colors.textMuted, icon: null, label: 'Đang tắt' };
      const percent = Math.round(b.percent);
      return (
        <Pressable
          key={b.id}
          style={({ pressed }) => [styles.row, pressed && editHandler && styles.pressed]}
          onPress={editHandler && (() => editHandler(b))}
          disabled={!editHandler}
          accessibilityRole={editHandler ? 'button' : undefined}
          accessibilityLabel={`${b.name}: đã chi ${formatVnd(b.spent)} trên ${formatVnd(b.amount)}, ${percent}%${l.label ? `, ${l.label}` : ''}`}
        >
          <View style={styles.rowHeader}>
            <CategoryIcon icon={b.icon} color={b.color} size={28} dimmed={!b.isActive} />
            <Text style={[styles.name, !b.isActive && styles.muted]} numberOfLines={1}>
              {b.name}
            </Text>
            {l.label && (
              <View style={styles.status}>
                {l.icon && <Ionicons name={l.icon} size={13} color={l.color} />}
                <Text style={[styles.statusText, { color: l.color }]}>{l.label}</Text>
              </View>
            )}
            {/* Số thật (vd. 132%), còn thanh tiến độ dừng ở 100% */}
            <Text style={[styles.percent, b.status === 'exceeded' && b.isActive && { color: colors.danger }]}>
              {percent}%
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(b.percent, 100)}%`, backgroundColor: l.color }]} />
          </View>
          <View style={styles.amountsRow}>
            <Text style={styles.amounts}>
              {formatVnd(b.spent)} / {formatVnd(b.amount)}
            </Text>
            <Text style={[styles.amounts, b.remaining < 0 && b.isActive && styles.over]}>{remainingText(b)}</Text>
          </View>
        </Pressable>
      );
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {onChangeMonth && (
          <Pressable onPress={() => onChangeMonth(-1)} hitSlop={10} accessibilityLabel="Tháng trước">
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
        {onChangeMonth && (
          <Pressable
            onPress={() => onChangeMonth(1)}
            disabled={isCurrentMonth}
            hitSlop={10}
            style={isCurrentMonth && styles.hidden}
            accessibilityLabel="Tháng sau"
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        )}
        <View style={styles.flex} />
        {onAdd && isCurrentMonth && (
          <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>+ Thêm</Text>
          </Pressable>
        )}
      </View>
      {!isCurrentMonth && budgets && budgets.length > 0 && (
        <Text style={styles.empty}>Hạn mức của tháng đã qua được giữ làm lịch sử, chỉ xem.</Text>
      )}
      {renderBody()}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  hidden: { opacity: 0 },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  loading: { marginVertical: spacing.md },
  empty: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  row: { marginTop: spacing.md - 2 },
  pressed: { opacity: 0.6 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted },
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
  amountsRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  amounts: { fontSize: 13, color: colors.textMuted },
  over: { fontWeight: '700', color: colors.danger },
}));
