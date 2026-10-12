import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ScreenHeader';
import {
  getNotificationSettings,
  setNotificationSetting,
  unreadCount,
  type NotificationSettings,
} from '@/features/notifications/notificationsStore';
import { colors, radius, spacing } from '@/theme';

type Option = { key: keyof NotificationSettings; icon: keyof typeof Ionicons.glyphMap; title: string; text: string };

const PUSH: Option = {
  key: 'push',
  icon: 'notifications-outline',
  title: 'Cho phép thông báo đẩy',
  text: 'Nhận thông báo ngay cả khi không mở ứng dụng',
};
const IN_APP: Option[] = [
  {
    key: 'banner',
    icon: 'file-tray-outline',
    title: 'Banner trong ứng dụng',
    text: 'Thanh nhỏ trượt từ đỉnh màn hình khi đang mở app',
  },
];
const TYPES: Option[] = [
  { key: 'budget', icon: 'warning-outline', title: 'Cảnh báo vượt ngân sách', text: 'Khi chi tiêu đạt 80% và 100% ngân sách' },
  { key: 'ocr', icon: 'scan-outline', title: 'Kết quả quét hóa đơn', text: 'Khi hóa đơn đọc xong, chờ bạn xác nhận' },
  { key: 'reminder', icon: 'wallet-outline', title: 'Nhắc ghi chép hằng ngày', text: 'Nhắc lúc 20:00 nếu chưa có giao dịch' },
  { key: 'advice', icon: 'sparkles-outline', title: 'Lời khuyên từ trợ lý AI', text: 'Nhận xét mới về thói quen chi tiêu' },
  { key: 'email', icon: 'mail-outline', title: 'Bản tin qua email', text: 'Tổng kết chi tiêu hằng tháng' },
];

// react-native-web tô núm công tắc theo activeThumbColor (prop riêng của web)
const webSwitchProps = Platform.OS === 'web' ? { activeThumbColor: colors.onPrimary } : {};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState(getNotificationSettings);
  const [unread, setUnread] = useState(unreadCount);

  useFocusEffect(useCallback(() => setUnread(unreadCount()), []));

  const toggle = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSetting(key, value);
    setSettings(getNotificationSettings());
  };

  const renderRows = (options: Option[], dimmed = false) =>
    options.map((o, i) => (
      <View key={o.key} style={[styles.row, i < options.length - 1 && styles.divider, dimmed && styles.dimmed]}>
        <View style={styles.icon}>
          <Ionicons name={o.icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{o.title}</Text>
          <Text style={styles.text}>{o.text}</Text>
        </View>
        <Switch
          value={settings[o.key]}
          onValueChange={(v) => toggle(o.key, v)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.onPrimary}
          {...webSwitchProps}
          accessibilityLabel={o.title}
        />
      </View>
    ));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Thông báo" fallbackHref="/profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>{renderRows([PUSH])}</View>

        {!settings.push && (
          <View style={styles.warning} accessibilityRole="alert">
            <Ionicons name="warning-outline" size={16} color={colors.warm} />
            <Text style={styles.warningText}>
              Thông báo đẩy đang tắt. Bạn vẫn nhận banner khi đang mở ứng dụng và xem được trong Hộp thư.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>TRONG ỨNG DỤNG</Text>
        <View style={styles.card}>{renderRows(IN_APP)}</View>

        <Text style={styles.sectionTitle}>LOẠI THÔNG BÁO</Text>
        {/* Thông báo đẩy tắt: các loại chỉ còn hiện trong app nên làm mờ để gợi ý */}
        <View style={styles.card}>{renderRows(TYPES, !settings.push)}</View>

        <Pressable
          style={({ pressed }) => [styles.card, styles.inbox, pressed && styles.pressed]}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel={`Mở Hộp thư, ${unread} chưa đọc`}
        >
          <View style={styles.icon}>
            <Ionicons name="file-tray-full-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.inboxText}>Mở Hộp thư</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={styles.noteText}>
            Thông báo bảo mật (đổi mật khẩu, đăng nhập lạ) luôn được gửi để bảo vệ tài khoản.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  card: { paddingHorizontal: spacing.md - 4, borderRadius: radius.lg, backgroundColor: colors.background },
  sectionTitle: {
    marginTop: spacing.md + 4,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.textMuted,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dimmed: { opacity: 0.55 },
  pressed: { opacity: 0.6 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  text: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  warning: {
    marginTop: spacing.md - 4,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md - 4,
    borderRadius: radius.md,
    backgroundColor: colors.warmSoft,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.warm },
  inbox: { marginTop: spacing.md + 4, flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 12 },
  inboxText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.onPrimary },
  note: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md - 2,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.primary },
});
