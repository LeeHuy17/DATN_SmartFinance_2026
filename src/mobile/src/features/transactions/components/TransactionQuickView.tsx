import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { categoryTint } from '@/features/transactions/categories';
import type { Transaction } from '@/features/transactions/types';
import { formatFullDate, formatSignedVnd, formatVnd } from '@/lib/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type Props = {
  /** null = đóng */
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (t: Transaction) => void;
  /** Trả về khi đã xóa xong (đã hỏi xác nhận ở bên ngoài) */
  onDelete: (t: Transaction) => Promise<void>;
};

/** Khung xem nhanh một giao dịch, kèm nút Sửa / Xóa */
export function TransactionQuickView({ transaction, onClose, onEdit, onDelete }: Props) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const [deleting, setDeleting] = useState(false);
  // Giữ nội dung trong lúc khung đang đóng (animation fade) để không bị trống
  const [shown, setShown] = useState<Transaction | null>(null);
  if (transaction && transaction !== shown) setShown(transaction);
  const t = transaction ?? shown;
  const transfer = t?.kind === 'transfer';

  const handleDelete = async () => {
    if (!t) return;
    setDeleting(true);
    try {
      await onDelete(t);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={!!transaction} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Đóng">
        {t && (
          // Chạm bên trong khung không đóng khung
          <Pressable style={styles.card} onPress={() => {}} accessibilityViewIsModal>
            <View style={styles.top}>
              <View style={[styles.icon, { backgroundColor: categoryTint(t.category.color, isDark).bg }]}>
                <Ionicons name={t.category.icon} size={22} color={categoryTint(t.category.color, isDark).fg} />
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.category}>{transfer ? 'Chuyển khoản' : t.category.name}</Text>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={[styles.amount, { color: transfer ? colors.textMuted : t.amount > 0 ? colors.primary : colors.expense }]}>
              {transfer && !t.transferDirection ? formatVnd(t.amount) : formatSignedVnd(t.amount)}
            </Text>

            <View style={styles.rows}>
              {transfer ? (
                <>
                  <Row label="Từ ví" value={t.walletName} />
                  <Row label="Đến ví" value={t.toWalletName ?? '—'} />
                  {(t.fee ?? 0) > 0 && <Row label="Phí chuyển" value={formatVnd(t.fee ?? 0)} />}
                </>
              ) : (
                <Row label="Ví" value={t.walletName} />
              )}
              <Row label="Ngày" value={formatFullDate(t.date)} />
              <Row label="Ghi chú" value={t.note || '—'} />
              {!transfer && <View style={[styles.row, styles.rowLast]}>
                <Text style={styles.rowLabel}>Nguồn</Text>
                <View style={styles.sourceBadge}>
                  <Ionicons
                    name={t.source === 'ocr' ? 'scan-outline' : 'create-outline'}
                    size={13}
                    color={colors.primary}
                  />
                  <Text style={styles.sourceText}>
                    {t.source === 'ocr' ? 'Quét hóa đơn' : 'Nhập tay'}
                  </Text>
                </View>
              </View>}
            </View>

            {t.receiptImageUrl && (
              <Image
                source={{ uri: t.receiptImageUrl }}
                style={styles.receipt}
                resizeMode="cover"
                accessibilityLabel="Ảnh hóa đơn"
              />
            )}

            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.editButton]}
                onPress={() => onEdit(t)}
                accessibilityRole="button"
              >
                <Text style={styles.editText}>Sửa</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.deleteButton]}
                onPress={handleDelete}
                disabled={deleting}
                accessibilityRole="button"
              >
                {deleting ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    <Text style={styles.deleteText}>Xóa</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  receipt: { marginTop: spacing.md, height: 140, borderRadius: radius.md, backgroundColor: colors.disabled },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: { marginTop: spacing.md - 4, fontSize: 13, color: colors.textMuted },
  title: { marginTop: 2, fontSize: 18, fontWeight: '700', color: colors.text },
  amount: { marginTop: spacing.xs, fontSize: 30, fontWeight: '800' },
  rows: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  sourceText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.md },
  button: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: { borderWidth: 1, borderColor: colors.border },
  editText: { fontSize: 15, fontWeight: '700', color: colors.text },
  deleteButton: { backgroundColor: colors.dangerSoft },
  deleteText: { fontSize: 15, fontWeight: '700', color: colors.danger },
}));
