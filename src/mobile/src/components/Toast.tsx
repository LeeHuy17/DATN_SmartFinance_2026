import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '@/theme';

/** Thông báo nhỏ tự ẩn sau chừng này ms */
const VISIBLE_MS = 2500;

type ToastMessage = { id: number; text: string; icon: keyof typeof Ionicons.glyphMap };
type Listener = (t: ToastMessage) => void;
const listeners = new Set<Listener>();

/**
 * Hiện thông báo nhỏ ở cuối màn hình rồi tự biến mất.
 * Gọi được từ bất kỳ đâu, kể cả ngay trước khi rời màn hình (ToastHost nằm ở layout gốc).
 */
export function showToast(text: string, icon: ToastMessage['icon'] = 'checkmark-circle') {
  const t = { id: Date.now(), text, icon };
  listeners.forEach((fn) => fn(t));
}

/** Đặt một lần ở layout gốc */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const native = Platform.OS !== 'web';

  useEffect(() => {
    const listener: Listener = (t) => {
      setCurrent(t);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: native }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: native }).start(() =>
          setCurrent(null),
        );
      }, VISIBLE_MS);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // Đăng ký một lần (opacity và native không đổi trong suốt vòng đời)
  }, []);

  if (!current) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          bottom: Math.max(insets.bottom, spacing.md) + 72,
          opacity,
          transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons name={current.icon} size={20} color={colors.primarySoft} />
      <Text style={styles.text}>{current.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.text,
    boxShadow: '0 6px 18px rgba(19, 34, 28, 0.25)',
    zIndex: 200,
  },
  text: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.onPrimary },
});
