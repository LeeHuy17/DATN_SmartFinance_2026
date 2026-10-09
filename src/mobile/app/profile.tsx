import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/features/auth/AuthProvider';
import { initials } from '@/features/dashboard/components/DashboardHeader';
import { confirm } from '@/lib/confirm';
import { colors, radius, spacing } from '@/theme';

// TODO: lấy từ API hồ sơ người dùng khi backend sẵn sàng
const PROFILE = { fullName: 'Nguyễn Văn An', email: 'an.nguyen@example.com' };

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có muốn đăng xuất không?',
      confirmText: 'Đăng xuất',
      destructive: true,
    });
    // Điều hướng gốc (Stack.Protected) tự chuyển về màn hình đăng nhập
    if (ok) await signOut();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Hồ sơ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(PROFILE.fullName)}</Text>
          </View>
          <Text style={styles.name}>{PROFILE.fullName}</Text>
          <Text style={styles.email}>{PROFILE.email}</Text>
        </View>

        <View style={styles.card}>
          <Row icon="person-outline" label="Thông tin cá nhân" />
          <Row icon="lock-closed-outline" label="Đổi mật khẩu" />
          <Row icon="notifications-outline" label="Cài đặt thông báo" last />
        </View>

        <Pressable style={styles.signOut} onPress={handleSignOut} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/** Mục cài đặt — TODO: gắn màn hình tương ứng khi đã có */
function Row({ icon, label, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  headerSpacer: { width: 26 },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  identity: { alignItems: 'center', marginTop: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.onPrimary },
  name: { marginTop: spacing.md - 4, fontSize: 20, fontWeight: '700', color: colors.text },
  email: { marginTop: 2, fontSize: 14, color: colors.textMuted },
  card: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 15 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text },
  signOut: {
    marginTop: spacing.lg,
    height: 52,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: colors.danger },
});
