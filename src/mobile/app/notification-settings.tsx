import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ScreenHeader';
import { showToast } from '@/components/Toast';
import { getSettings, getUnreadCount, updateSettings } from '@/features/notifications/notificationsApi';
import type { NotificationSettings } from '@/features/notifications/notificationsStore';
import { makeStyles, radius, spacing, useColors } from '@/theme';

type Option = {
  key: keyof NotificationSettings;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  /** Chưa có trên bản này: hiện công tắc nhưng không cho bật / tắt */
  unavailable?: boolean;
};

// Thông báo đẩy cần bản cài đặt riêng của app (development / production build), Expo Go không nhận được
const PUSH: Option = {
  key: 'push',
  icon: 'notifications-outline',
  title: 'Thông báo đẩy',
  text: 'Chưa hỗ trợ trên bản này. Thông báo vẫn hiện bằng banner khi đang mở app và trong Hộp thư.',
  unavailable: true,
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
  {
    key: 'budget',
    icon: 'warning-outline',
    title: 'Cảnh báo ngân sách',
    text: 'Khi chi tiêu chạm ngưỡng cảnh báo và khi vượt hạn mức (mỗi mốc báo một lần mỗi tháng)',
  },
  { key: 'reminder', icon: 'wallet-outline', title: 'Nhắc ghi chép hằng ngày', text: 'Nhắc sau 20:00 nếu hôm đó chưa ghi giao dịch nào' },
  { key: 'email', icon: 'mail-outline', title: 'Bản tin qua email', text: 'Tổng kết thu chi tháng trước, gửi sáng ngày 1 tới email đăng nhập' },
  { key: 'ocr', icon: 'scan-outline', title: 'Kết quả quét hóa đơn', text: 'Khi hóa đơn đọc xong, chờ bạn xác nhận · Sắp có' },
  { key: 'advice', icon: 'sparkles-outline', title: 'Lời khuyên từ trợ lý AI', text: 'Nhận xét mới về thói quen chi tiêu · Sắp có' },
];


export default function NotificationSettingsScreen() {
  const styles = useStyles();
  const colors = useColors();
  // react-native-web tô núm công tắc theo activeThumbColor (prop riêng của web)
  const webSwitchProps = Platform.OS === 'web' ? { activeThumbColor: colors.onPrimary } : {};
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [error, setError] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    setError(false);
    getSettings()
      .then(setSettings)
      .catch(() => setError(true));
    getUnreadCount()
      .then(setUnread)
      .catch(() => undefined);
  }, []);

  useFocusEffect(load);

  // Đổi ngay trên màn hình, lưu lên server; lỗi thì trả lại như cũ
  const toggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    try {
      setSettings(await updateSettings({ [key]: value }));
    } catch {
      setSettings(previous);
      showToast('Không lưu được cài đặt. Vui lòng thử lại.', 'alert-circle');
    }
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Thông báo" fallbackHref="/profile" />
        {error ? (
          <Pressable style={styles.errorBox} onPress={load} accessibilityRole="button">
            <Text style={styles.text}>Không tải được cài đặt thông báo.</Text>
            <Text style={styles.retry}>Thử lại</Text>
          </Pressable>
        ) : (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        )}
      </SafeAreaView>
    );
  }

  const renderRows = (options: Option[]) =>
    options.map((o, i) => (
      <View key={o.key} style={[styles.row, i < options.length - 1 && styles.divider, o.unavailable && styles.dimmed]}>
        <View style={styles.icon}>
          <Ionicons name={o.icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{o.title}</Text>
          <Text style={styles.text}>{o.text}</Text>
        </View>
        <Switch
          value={o.unavailable ? false : settings[o.key]}
          onValueChange={(v) => toggle(o.key, v)}
          disabled={o.unavailable}
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

        <Text style={styles.sectionTitle}>TRONG ỨNG DỤNG</Text>
        <View style={styles.card}>{renderRows(IN_APP)}</View>

        <Text style={styles.sectionTitle}>LOẠI THÔNG BÁO</Text>
        <View style={styles.card}>{renderRows(TYPES)}</View>

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
            Thông báo bảo mật (đổi hoặc đặt lại mật khẩu) luôn được gửi để bảo vệ tài khoản.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  loading: { marginTop: spacing.xl },
  errorBox: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.xs },
  retry: { fontSize: 14, fontWeight: '700', color: colors.primary },
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
}));
