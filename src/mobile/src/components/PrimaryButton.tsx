import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, useColors } from '@/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, loading = false, disabled = false, style }: Props) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        !disabled && (pressed || loading) && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { backgroundColor: colors.disabled },
  pressed: { opacity: 0.85 },
  text: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
  textDisabled: { color: colors.textMuted },
}));
