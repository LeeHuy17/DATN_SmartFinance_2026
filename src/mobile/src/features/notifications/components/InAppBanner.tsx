import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { lookOf } from '@/features/notifications/notificationLook';
import { markRead } from '@/features/notifications/notificationsApi';
import { onNewNotification, type BannerMessage } from '@/features/notifications/notificationsStore';
import { makeStyles, radius, spacing, useColors } from '@/theme';

/** Banner tự ẩn sau chừng này ms */
const VISIBLE_MS = 5000;

/**
 * Banner thông báo trượt xuống từ trên cùng khi có thông báo mới trong lúc dùng app.
 * Đặt một lần ở layout gốc; chạm để mở, bấm X để đóng.
 */
export function InAppBanner() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<BannerMessage | null>(null);
  const translateY = useRef(new Animated.Value(-200)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const native = Platform.OS !== 'web';

  const hide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(translateY, { toValue: -200, duration: 220, useNativeDriver: native }).start(() => setCurrent(null));
  };

  useEffect(
    () =>
      onNewNotification((n) => {
        setCurrent(n);
        translateY.setValue(-200);
        Animated.spring(translateY, { toValue: 0, useNativeDriver: native, bounciness: 4 }).start();
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(hide, VISIBLE_MS);
      }),
    // Đăng ký một lần khi gắn banner (hide và translateY không đổi trong suốt vòng đời)
    [],
  );

  if (!current) return null;
  const look = lookOf(current, colors);

  return (
    <Animated.View
      style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
    >
      <Pressable
        style={styles.banner}
        onPress={() => {
          // Banner ứng với thông báo đã lưu thì đánh dấu đã đọc; lỗi mạng thì bỏ qua
          if (current.id) markRead(current.id).catch(() => undefined);
          hide();
          if (current.link) router.push(current.link);
        }}
        accessibilityRole="alert"
        accessibilityLabel={`${current.title}. ${current.body}`}
      >
        <View style={[styles.icon, { backgroundColor: look.bg }]}>
          <Ionicons name={look.icon} size={18} color={look.fg} />
        </View>
        <View style={styles.texts}>
          <View style={styles.topRow}>
            <Text style={styles.app}>FinBuddy</Text>
            <Text style={styles.now}>Bây giờ</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {current.body}
          </Text>
        </View>
        <Pressable onPress={hide} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng thông báo">
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: 'absolute', left: spacing.sm + 2, right: spacing.sm + 2, zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md - 4,
    padding: spacing.md - 4,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    boxShadow: `0 8px 24px rgba(${colors.shadow}, 0.18)`,
  },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  app: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  now: { fontSize: 12, color: colors.textMuted },
  title: { marginTop: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  body: { marginTop: 1, fontSize: 13, lineHeight: 18, color: colors.textMuted },
}));
