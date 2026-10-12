import { forwardRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FieldError } from '@/components/FieldError';
import { colors, radius, spacing } from '@/theme';

type Props = TextInputProps & {
  label: string;
  /** Thông báo lỗi: viền đỏ và dòng lỗi bên dưới ô nhập */
  error?: string | null;
  /** Dòng gợi ý màu xám, ẩn khi đang có lỗi */
  hint?: string;
  /** Hiện nút con mắt để ẩn/hiện mật khẩu (dùng cùng secureTextEntry) */
  passwordToggle?: boolean;
  /** Nội dung nhỏ bên phải nhãn (vd. "Đã sửa") */
  labelAccessory?: ReactNode;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, passwordToggle, labelAccessory, secureTextEntry, style, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelAccessory}
      </View>
      <View>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            focused && styles.inputFocused,
            !!error && styles.inputError,
            passwordToggle && styles.inputWithToggle,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {passwordToggle && (
          <Pressable
            style={styles.toggle}
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <FieldError message={error} />
      ) : (
        hint && <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
});

// Trên web, bỏ vòng focus mặc định của trình duyệt để chỉ thấy màu viền theo thiết kế.
// Kiểu của RN không có 'none' (chỉ dành cho native) nên phải ép kiểu.
const webNoOutline = Platform.select({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
  default: {},
});

const styles = StyleSheet.create({
  field: { marginTop: spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    fontSize: 15,
    color: colors.text,
    ...webNoOutline,
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  inputError: { borderColor: colors.danger, borderWidth: 1.5 },
  inputWithToggle: { paddingRight: 48 },
  toggle: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
