import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

type Option<T extends string> = {
  value: T;
  label: string;
  /** Màu chữ / nền khi được chọn (mặc định: chữ xanh, nền trắng) */
  selectedColor?: string;
  selectedBackground?: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Công tắc nhiều lựa chọn dạng viên thuốc (vd: Chi tiêu / Thu nhập) */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[
              styles.segment,
              selected && styles.segmentSelected,
              selected && o.selectedBackground && { backgroundColor: o.selectedBackground },
            ]}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.label,
                selected && styles.labelSelected,
                selected && o.selectedColor && { color: o.selectedColor },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md + 2,
    backgroundColor: colors.disabled,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.background,
    boxShadow: '0 1px 3px rgba(19, 34, 28, 0.12)',
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  labelSelected: { fontWeight: '700', color: colors.primary },
});
