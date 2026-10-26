import { Image, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

/** "Nguyễn Văn An" / "Văn An" → "VA" */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  name: string;
  uri?: string | null;
  size: number;
  /** solid: nền xanh đậm chữ trắng (Tổng quan); soft: nền xanh nhạt chữ xanh (Hồ sơ) */
  variant?: 'solid' | 'soft';
};

/** Ảnh đại diện; chưa có ảnh thì hiện chữ viết tắt của tên */
export function Avatar({ name, uri, size, variant = 'solid' }: Props) {
  const colors = useColors();
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={box} accessibilityIgnoresInvertColors />;

  const soft = variant === 'soft';
  return (
    <View style={[styles.box, box, { backgroundColor: soft ? colors.primarySoft : colors.primary }]}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: soft ? colors.primary : colors.onPrimary }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
