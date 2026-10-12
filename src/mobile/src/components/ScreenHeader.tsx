import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing } from '@/theme';

type Props = {
  title: string;
  /** Nơi quay về khi không có màn hình trước (mở thẳng đường dẫn trên web) */
  fallbackHref?: Href;
  /** Thay cách quay lại mặc định (vd. hỏi trước khi bỏ thay đổi chưa lưu) */
  onBack?: () => void;
};

/** Thanh tiêu đề: nút quay lại bên trái, tiêu đề ở giữa */
export function ScreenHeader({ title, fallbackHref = '/', onBack }: Props) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallbackHref)))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  spacer: { width: 26 },
});
