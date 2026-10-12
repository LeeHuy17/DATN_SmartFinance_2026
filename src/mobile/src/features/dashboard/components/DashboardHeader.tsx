import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/features/profile/components/Avatar';
import { colors, spacing } from '@/theme';

function greeting(hour = new Date().getHours()) {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 13) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

type Props = {
  displayName: string;
  avatarUri?: string | null;
  unreadNotifications: number;
  onPressProfile?: () => void;
  onPressNotifications?: () => void;
};

/** Trái: avatar + lời chào (chạm để mở Hồ sơ). Phải: chuông thông báo */
export function DashboardHeader({
  displayName,
  avatarUri,
  unreadNotifications,
  onPressProfile,
  onPressNotifications,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.profile}
        onPress={onPressProfile}
        accessibilityRole="button"
        accessibilityLabel={`Hồ sơ của ${displayName}`}
      >
        <Avatar name={displayName} uri={avatarUri} size={SIZE} />
        <View style={styles.texts}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={styles.bell}
        onPress={onPressNotifications}
        accessibilityRole="button"
        accessibilityLabel={`Thông báo, ${unreadNotifications} chưa đọc`}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
        {unreadNotifications > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const SIZE = 44;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  texts: { flex: 1 },
  greeting: { fontSize: 13, color: colors.textMuted },
  name: { fontSize: 19, fontWeight: '700', color: colors.text },
  bell: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.onPrimary },
});
