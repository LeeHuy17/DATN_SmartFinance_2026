import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';

import { FieldError } from '@/components/FieldError';
import { colors, spacing } from '@/theme';

/** Tối đa 12 chữ số (dưới 1.000 tỷ) */
const MAX_DIGITS = 12;

/** "85000" → "85.000" */
export const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

type Props = {
  /** Số tiền (đồng), 0 = chưa nhập */
  value: number;
  onChange: (value: number) => void;
  error?: string | null;
  autoFocus?: boolean;
};

/** Ô nhập số tiền cỡ lớn, tự thêm dấu chấm phân cách hàng nghìn khi gõ */
export const AmountInput = forwardRef<TextInput, Props>(function AmountInput(
  { value, onChange, error, autoFocus },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text style={styles.label}>Số tiền</Text>
      <View style={[styles.row, focused && styles.rowFocused, !!error && styles.rowError]}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value > 0 ? groupThousands(String(value)) : ''}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
            onChange(digits ? Number(digits) : 0);
          }}
          placeholder="0"
          placeholderTextColor={colors.border}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="Số tiền"
        />
        <Text style={styles.currency}>đ</Text>
      </View>
      {error && <FieldError message={error} />}
    </View>
  );
});

// Bỏ vòng focus mặc định của trình duyệt (web)
const webNoOutline = Platform.select({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
  default: {},
});

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  rowFocused: { borderBottomColor: colors.primary },
  rowError: { borderBottomColor: colors.danger },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.xs,
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    ...webNoOutline,
  },
  currency: { marginBottom: spacing.sm, fontSize: 20, fontWeight: '600', color: colors.textMuted },
});
