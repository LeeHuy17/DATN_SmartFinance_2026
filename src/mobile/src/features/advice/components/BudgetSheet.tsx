import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getBudgetLimits, saveBudgetLimits } from '@/features/advice/budgetsApi';
import { CategoryIcon } from '@/features/transactions/components/CategoryIcon';
import { groupThousands } from '@/features/transactions/components/AmountInput';
import { listCategories, type CategoryWithCount } from '@/features/transactions/transactionsApi';
import { colors, radius, spacing } from '@/theme';

type Props = { visible: boolean; onClose: () => void; onSaved: () => void };

/** Đặt hạn mức chi mỗi tháng cho từng danh mục chi tiêu; để trống = không đặt */
export function BudgetSheet({ visible, onClose, onSaved }: Props) {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    Promise.all([listCategories('expense'), getBudgetLimits()]).then(([cs, ls]) => {
      // Danh mục đang ẩn vẫn hiện nếu đã có ngân sách, để còn sửa / bỏ được
      setCategories(cs.filter((c) => !c.hidden || ls[c.id]));
      setLimits(ls);
    });
  }, [visible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBudgetLimits(limits);
      onSaved();
    } catch {
      setError('Không lưu được ngân sách. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Ngân sách mỗi tháng"
      onClose={onClose}
      footer={<PrimaryButton title="Lưu ngân sách" onPress={handleSave} loading={saving} style={styles.flex} />}
    >
      <Text style={styles.hint}>Đặt hạn mức cho danh mục bạn muốn theo dõi. Để trống nếu không cần.</Text>
      {categories.map((c) => (
        <View key={c.id} style={styles.row}>
          <CategoryIcon icon={c.icon} color={c.color} size={36} />
          <Text style={styles.name} numberOfLines={1}>
            {c.name}
          </Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={limits[c.id] ? groupThousands(String(limits[c.id])) : ''}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
                setLimits((l) => ({ ...l, [c.id]: digits ? Number(digits) : 0 }));
              }}
              placeholder="Không đặt"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              accessibilityLabel={`Ngân sách ${c.name}`}
            />
            <Text style={styles.currency}>đ</Text>
          </View>
        </View>
      ))}
      {error && <FieldError message={error} />}
    </BottomSheet>
  );
}

const webNoOutline = Platform.select({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
  default: {},
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { marginTop: spacing.sm, marginBottom: spacing.sm, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: spacing.sm },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  inputBox: {
    width: 140,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md - 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  input: { flex: 1, minWidth: 0, height: '100%', textAlign: 'right', fontSize: 15, fontWeight: '600', color: colors.text, ...webNoOutline },
  currency: { marginLeft: 4, fontSize: 14, color: colors.textMuted },
});
