import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, useColors } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Hành động phá hủy (xóa): nút xác nhận màu đỏ */
  destructive?: boolean;
  loading?: boolean;
};

/** Hộp thoại xác nhận theo thiết kế (thay cho Alert hệ thống khi cần đúng giao diện) */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  icon = 'trash-outline',
  destructive,
  loading,
}: Props) {
  const styles = useStyles();
  const colors = useColors();
  const tint = destructive ? colors.danger : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}} accessibilityViewIsModal accessibilityRole="alert">
          <View style={[styles.icon, { backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft }]}>
            <Ionicons name={icon} size={20} color={tint} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancel]} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: tint }]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: spacing.md - 4, fontSize: 18, fontWeight: '700', color: colors.text },
  message: { marginTop: spacing.xs + 2, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.md + 4 },
  button: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.text },
  confirmText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
}));
