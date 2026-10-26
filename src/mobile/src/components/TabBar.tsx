import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, spacing, useColors } from '@/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = keyof typeof Ionicons.glyphMap;

// Theo thiết kế: icon dạng viền cho mọi tab, tab đang chọn chỉ đổi sang màu xanh
const ICONS: Record<string, IconName> = {
  index: 'home-outline',
  reports: 'stats-chart-outline',
  scan: 'scan',
  advice: 'sparkles-outline',
  wallets: 'wallet-outline',
};

/** Tab nổi ở giữa thanh tab: mở màn quét hóa đơn toàn màn hình thay vì chuyển tab */
const CENTER_TAB = 'scan';

export function TabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const icon = ICONS[route.name] ?? 'ellipse-outline';

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        if (route.name === CENTER_TAB) {
          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={() => router.push('/receipt/scan')}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <View style={styles.centerButton}>
                <Ionicons name={icon} size={28} color={colors.onPrimary} />
              </View>
              {/* Chữ xám như tab thường: nút tròn xanh đã đủ nổi bật, tránh hai nhãn xanh đứng cạnh nhau */}
              <Text style={styles.label}>{label}</Text>
            </Pressable>
          );
        }

        const color = focused ? colors.primary : colors.textMuted;
        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
          >
            <Ionicons name={icon} size={24} color={color} />
            <Text style={[styles.label, { color }, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const CENTER_SIZE = 56;

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  label: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  labelActive: { fontWeight: '700', color: colors.primary },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    // Nhô lên trên mép thanh tab
    marginTop: -CENTER_SIZE / 2 - spacing.sm,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(15, 107, 79, 0.3)',
  },
}));
