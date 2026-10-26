import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';

const TRACK_WIDTH = 60;
const TRACK_HEIGHT = 32;
const THUMB = 26;
const PAD = (TRACK_HEIGHT - THUMB) / 2;

// Màu riêng của công tắc (bầu trời ngày / đêm), không đổi theo theme để luôn nhận ra được
const LIGHT_TRACK = '#FFE3A1';
const DARK_TRACK = '#26324D';
const SUN = '#E8930C';
const MOON = '#F2D27A';
const DARK_THUMB = '#3B4A6B';

/** Nút gạt sáng / tối: núm trượt trái (mặt trời) ↔ phải (mặt trăng) */
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    // Màu nền không chạy được bằng native driver, nên cả công tắc chạy trên JS (chỉ một view nhỏ)
    Animated.timing(progress, { toValue: isDark ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [isDark, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK_WIDTH - THUMB - PAD * 2] });
  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: [LIGHT_TRACK, DARK_TRACK] });
  const thumbColor = progress.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', DARK_THUMB] });
  const sunOpacity = progress.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const moonOpacity = progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Pressable
      onPress={toggleTheme}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel="Giao diện tối"
      accessibilityState={{ checked: isDark }}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { backgroundColor: thumbColor, transform: [{ translateX }] }]}>
          <Animated.View style={[styles.icon, { opacity: sunOpacity }]}>
            <Ionicons name="sunny" size={16} color={SUN} />
          </Animated.View>
          <Animated.View style={[styles.icon, { opacity: moonOpacity }]}>
            <Ionicons name="moon" size={14} color={MOON} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: PAD,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
  },
  icon: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
