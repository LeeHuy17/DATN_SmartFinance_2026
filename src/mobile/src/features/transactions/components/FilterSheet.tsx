import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { CATEGORIES, EXPENSE_CATEGORIES } from '@/features/transactions/categories';
import {
  DEFAULT_FILTERS,
  TIME_LABELS,
  countActive,
  parseDayInput,
  type TimeFilter,
  type TransactionFilters,
  type TypeFilter,
} from '@/features/transactions/filters';
import type { Wallet } from '@/features/transactions/types';
import { colors, radius, spacing } from '@/theme';

type Props = {
  visible: boolean;
  value: TransactionFilters;
  wallets: Wallet[];
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
};

const TIME_OPTIONS: Exclude<TimeFilter, 'all'>[] = ['today', '7d', 'month', 'custom'];
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
];

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/** Bảng Bộ lọc trượt từ dưới lên; chỉnh trên bản nháp, bấm "Áp dụng" mới có hiệu lực */
export function FilterSheet({ visible, value, wallets, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [wasVisible, setWasVisible] = useState(visible);
  // Mỗi lần mở lại thì bắt đầu từ bộ lọc đang áp dụng
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }

  const set = (patch: Partial<TransactionFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const customInvalid =
    draft.time === 'custom' &&
    ((draft.from !== '' && !parseDayInput(draft.from)) || (draft.to !== '' && !parseDayInput(draft.to)));
  const count = countActive(draft);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Đóng bộ lọc" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Bộ lọc</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.section}>Thời gian</Text>
            <View style={styles.chips}>
              {TIME_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  label={TIME_LABELS[t]}
                  icon={t === 'custom' ? 'calendar-outline' : undefined}
                  selected={draft.time === t}
                  // Bấm lại lựa chọn đang chọn thì bỏ chọn (về "mọi thời gian")
                  onPress={() => set({ time: draft.time === t ? 'all' : t })}
                />
              ))}
            </View>
            {draft.time === 'custom' && (
              <>
                <View style={styles.range}>
                  <DayInput label="Từ ngày" value={draft.from} onChange={(from) => set({ from })} />
                  <DayInput label="Đến ngày" value={draft.to} onChange={(to) => set({ to })} />
                </View>
                {customInvalid && <Text style={styles.invalid}>Nhập ngày theo dạng dd/mm/yyyy.</Text>}
              </>
            )}

            <Text style={styles.section}>Loại</Text>
            <View style={styles.chips}>
              {TYPE_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={draft.type === o.value}
                  onPress={() => set({ type: o.value })}
                />
              ))}
            </View>

            <Text style={styles.section}>Danh mục</Text>
            <View style={styles.chips}>
              {EXPENSE_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={CATEGORIES[c].label}
                  icon={CATEGORIES[c].icon}
                  selected={draft.categories.includes(c)}
                  onPress={() => set({ categories: toggle(draft.categories, c) })}
                />
              ))}
            </View>

            <Text style={styles.section}>Ví</Text>
            <View style={styles.chips}>
              {wallets.map((w) => (
                <Chip
                  key={w.id}
                  label={w.name}
                  selected={draft.walletIds.includes(w.id)}
                  onPress={() => set({ walletIds: toggle(draft.walletIds, w.id) })}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, styles.reset]}
              onPress={() => setDraft(DEFAULT_FILTERS)}
              accessibilityRole="button"
            >
              <Text style={styles.resetText}>Đặt lại</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.apply, customInvalid && styles.applyDisabled]}
              onPress={() => onApply(draft)}
              disabled={customInvalid}
              accessibilityRole="button"
            >
              <Text style={styles.applyText}>Áp dụng{count > 0 ? ` (${count})` : ''}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DayInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.flex}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="dd/mm/yyyy"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.md - 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { paddingHorizontal: spacing.lg - 4, paddingBottom: spacing.sm },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  range: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.md - 4 },
  inputLabel: { marginBottom: spacing.xs, fontSize: 12, color: colors.textMuted },
  input: {
    height: 42,
    paddingHorizontal: spacing.md - 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 14,
    color: colors.text,
  },
  invalid: { marginTop: spacing.xs, fontSize: 12, color: colors.danger },
  footer: {
    flexDirection: 'row',
    gap: spacing.md - 4,
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.md - 4,
  },
  button: { height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  reset: { flex: 1, borderWidth: 1, borderColor: colors.border },
  resetText: { fontSize: 15, fontWeight: '700', color: colors.text },
  apply: { flex: 2, backgroundColor: colors.primary },
  applyDisabled: { opacity: 0.5 },
  applyText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
});
