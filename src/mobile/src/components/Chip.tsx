import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, spacing, useColors } from '@/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * solid: chọn thì nền xanh chữ trắng (lọc nhanh trên màn hình)
   * soft: chọn thì nền xanh nhạt, viền xanh, có dấu tick (trong bảng Bộ lọc)
   */
  variant?: 'solid' | 'soft';
  /** Hiện dấu tick khi chọn (chỉ với soft) */
  showCheck?: boolean;
};

export function Chip({ label, selected, onPress, icon, variant = 'soft', showCheck = true }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const solid = variant === 'solid';
  const fg = selected ? (solid ? colors.onPrimary : colors.primary) : colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && (solid ? styles.solidSelected : styles.softSelected),
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {!solid && selected && showCheck && <Ionicons name="checkmark" size={14} color={fg} />}
      {icon && <Ionicons name={icon} size={14} color={selected ? fg : colors.textMuted} />}
      <Text style={[styles.label, { color: fg }, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.md - 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  solidSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  softSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  label: { fontSize: 14, fontWeight: '500' },
  labelSelected: { fontWeight: '700' },
}));
