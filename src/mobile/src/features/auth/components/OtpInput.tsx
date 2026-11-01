import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, TextInputInstance } from 'react-native';

import { makeStyles, radius, spacing } from '@/theme';

type Props = {
  value: string;
  onChange: (value: string) => void;
  length: number;
  error?: boolean;
  autoFocus?: boolean;
};

/**
 * Ô nhập mã OTP dạng từng ô số. Bên dưới là một TextInput ẩn duy nhất,
 * nên dán mã hoặc tự điền mã từ SMS vẫn hoạt động.
 */
export function OtpInput({ value, onChange, length, error = false, autoFocus }: Props) {
  const styles = useStyles();
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const activeIndex = focused ? Math.min(value.length, length - 1) : -1;

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }, (_, i) => {
        const digit = value[i] ?? '';
        return (
          <View
            key={i}
            style={[
              styles.cell,
              !!digit && styles.cellFilled,
              i === activeIndex && !error && styles.cellActive,
              error && styles.cellError,
            ]}
          >
            <Text style={styles.digit}>{digit}</Text>
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`Mã xác thực gồm ${length} chữ số`}
      />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cell: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: { borderColor: colors.primary, borderWidth: 1.5 },
  cellActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    boxShadow: `0 0 0 3px ${colors.primarySoft}`,
  },
  cellError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
    backgroundColor: colors.dangerSoft,
  },
  digit: { fontSize: 24, fontWeight: '700', color: colors.text },
  // Phủ lên các ô nhưng trong suốt, để chạm vào đâu cũng mở bàn phím
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    color: 'transparent',
  },
}));
