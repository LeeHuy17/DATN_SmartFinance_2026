import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { getNotificationSettings } from '@/features/notifications/notificationsStore';
import { Avatar } from '@/features/profile/components/Avatar';
import { AvatarSheet } from '@/features/profile/components/AvatarSheet';
import { getProfileNow, updateProfile, type Profile } from '@/features/profile/profileStore';
import { colors, radius, spacing } from '@/theme';

const APP_VERSION = 'v1.0.0';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<Profile>(getProfileNow);
  const [pushOn, setPushOn] = useState(getNotificationSettings().push);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Quay lại từ Thông tin cá nhân / Cài đặt thông báo thì cập nhật ngay
  useFocusEffect(
    useCallback(() => {
      setProfile(getProfileNow());
      setPushOn(getNotificationSettings().push);
    }, []),
  );

  const changeAvatar = async (uri: string | null) => {
    try {
      setProfile(await updateProfile({ avatarUri: uri }));
      showToast(uri ? 'Đã cập nhật ảnh đại diện' : 'Đã xóa ảnh đại diện');
    } catch {
      showToast('Không lưu được ảnh. Vui lòng thử lại.', 'alert-circle');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    // Điều hướng gốc (Stack.Protected) tự chuyển về màn hình đăng nhập
    await signOut();
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Hồ sơ</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Pressable
            onPress={() => setAvatarSheet(true)}
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh đại diện"
          >
            <Avatar name={profile.fullName} uri={profile.avatarUri} size={64} variant="soft" />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color={colors.onPrimary} />
            </View>
          </Pressable>
          <View style={styles.identityTexts}>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.contact} numberOfLines={1}>
              {profile.email}
            </Text>
            <Text style={styles.contact}>{profile.phone}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            onPress={() => router.push('/personal-info')}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Sửa thông tin cá nhân"
          >
            <Ionicons name="pencil" size={12} color={colors.primary} />
            <Text style={styles.editText}>Sửa</Text>
          </Pressable>
        </View>

        <Section title="TÀI KHOẢN">
          <Row icon="person-outline" label="Thông tin cá nhân" onPress={() => router.push('/personal-info')} />
          <Row icon="key-outline" label="Đổi mật khẩu" onPress={() => router.push('/change-password')} />
          <Row icon="wallet-outline" label="Ví và danh mục" onPress={() => router.push('/wallets')} last />
        </Section>

        <Section title="ỨNG DỤNG">
          <Row
            icon="notifications-outline"
            label="Thông báo"
            value={pushOn ? 'Bật' : 'Tắt'}
            onPress={() => router.push('/notification-settings')}
          />
          {/* Hiện chỉ hỗ trợ tiếng Việt và giao diện sáng */}
          <Row icon="globe-outline" label="Ngôn ngữ" value="Tiếng Việt" />
          <Row icon="moon-outline" label="Giao diện" value="Sáng" last />
        </Section>

        <Section title="HỖ TRỢ VÀ PHÁP LÝ">
          {/* TODO: gắn trang Trung tâm trợ giúp / Điều khoản khi có nội dung */}
          <Row icon="help-circle-outline" label="Trung tâm trợ giúp" />
          <Row icon="document-text-outline" label="Điều khoản và chính sách" />
          <Row icon="information-circle-outline" label="Giới thiệu ứng dụng" value={APP_VERSION} last />
        </Section>

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
          onPress={() => setConfirmSignOut(true)}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>

      <AvatarSheet
        visible={avatarSheet}
        hasAvatar={!!profile.avatarUri}
        onClose={() => setAvatarSheet(false)}
        onChange={changeAvatar}
      />
      <ConfirmDialog
        visible={confirmSignOut}
        icon="log-out-outline"
        title="Đăng xuất khỏi Smart Finance?"
        message="Dữ liệu của bạn vẫn được lưu an toàn. Bạn cần đăng nhập lại để tiếp tục sử dụng."
        confirmText="Đăng xuất"
        destructive
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}: ${value}` : label}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  pressed: { opacity: 0.6 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTexts: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  contact: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  editButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  editText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  section: { marginTop: spacing.md + 4 },
  sectionTitle: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.textMuted,
  },
  card: { paddingHorizontal: spacing.md - 4, borderRadius: radius.lg, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, minHeight: 52, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md - 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text },
  rowValue: { fontSize: 13, color: colors.textMuted },
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
