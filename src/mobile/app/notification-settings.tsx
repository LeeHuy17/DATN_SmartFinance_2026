import { useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ScreenHeader';
import { NOTIFICATION_LOOK } from '@/features/notifications/notificationLook';
import {
  getNotificationSettings,
  setNotificationSetting,
  type ConfigurableType,
} from '@/features/notifications/notificationsStore';
import { colors, radius, spacing } from '@/theme';

const OPTIONS: { type: ConfigurableType; title: string; text: string }[] = [
  { type: 'budget', title: 'Cảnh báo ngân sách', text: 'Khi chi tiêu chạm 80% hoặc vượt hạn mức tháng.' },
  { type: 'ocr', title: 'Kết quả quét hóa đơn', text: 'Khi hóa đơn đã đọc xong và chờ bạn xác nhận.' },
  { type: 'advice', title: 'Lời khuyên AI', text: 'Khi trợ lý AI có nhận xét mới về chi tiêu.' },
  { type: 'reminder', title: 'Nhắc ghi chép', text: 'Nhắc vào buổi tối nếu hôm đó chưa ghi giao dịch.' },
];

// react-native-web tô núm công tắc theo activeThumbColor (prop riêng của web)
const webSwitchProps = Platform.OS === 'web' ? { activeThumbColor: colors.onPrimary } : {};

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState(getNotificationSettings());

  const toggle = (type: ConfigurableType, value: boolean) => {
    setNotificationSetting(type, value);
    setSettings(getNotificationSettings());
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Cài đặt thông báo" />
      <View style={styles.content}>
        <View style={styles.card}>
          {OPTIONS.map((o, i) => {
            const look = NOTIFICATION_LOOK[o.type];
            return (
              <View key={o.type} style={[styles.row, i < OPTIONS.length - 1 && styles.divider]}>
                <View style={[styles.icon, { backgroundColor: look.bg }]}>
                  <Ionicons name={look.icon} size={18} color={look.fg} />
                </View>
                <View style={styles.texts}>
                  <Text style={styles.title}>{o.title}</Text>
                  <Text style={styles.text}>{o.text}</Text>
                </View>
                <Switch
                  value={settings[o.type]}
                  onValueChange={(v) => toggle(o.type, v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                  {...webSwitchProps}
                  accessibilityLabel={o.title}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={styles.noteText}>
            Thông báo bảo mật (đổi mật khẩu, đăng nhập lạ) luôn được gửi để bảo vệ tài khoản.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  card: { paddingHorizontal: spacing.md - 2, borderRadius: radius.lg, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  text: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
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
