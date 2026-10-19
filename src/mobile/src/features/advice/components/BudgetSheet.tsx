import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/BottomSheet';
import { Chip } from '@/components/Chip';
import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  createBudget,
  deleteBudget,
  updateBudget,
  type Budget,
} from '@/features/budgets/budgetsApi';
import { AmountInput } from '@/features/transactions/components/AmountInput';
import { listCategories, type CategoryWithCount } from '@/features/transactions/transactionsApi';
import { getFieldErrors } from '@/lib/api/client';
import { confirm } from '@/lib/confirm';
import { colors, spacing } from '@/theme';

// react-native-web tô núm công tắc theo activeThumbColor (prop riêng của web), thiếu thì ra màu xanh ngọc
const webSwitchProps = Platform.OS === 'web' ? { activeThumbColor: colors.onPrimary } : {};

const THRESHOLDS = [50, 70, 80, 90, 100];
/** Giá trị đặc biệt của ô chọn: ngân sách tổng (category = null) */
const OVERALL = 'overall';

type Props = {
  visible: boolean;
  /** Có thì sửa, không có là thêm mới */
  budget?: Budget | null;
  /** Ngân sách đang có, để bỏ các danh mục đã có ngân sách khỏi ô chọn */
  existing: Budget[];
  onClose: () => void;
  /** Gọi sau khi thêm, sửa hoặc xóa thành công */
  onSaved: () => void;
};

type Errors = { category?: string; amount?: string; alertThreshold?: string; form?: string };

/**
 * Thêm / sửa một ngân sách: cho một danh mục chi, hoặc cho tổng chi tiêu.
 * Hạn mức áp dụng từ tháng hiện tại trở đi; các tháng đã qua giữ nguyên làm lịch sử.
 */
export function BudgetSheet({ visible, budget, existing, onClose, onSaved }: Props) {
  const editing = !!budget;
  const now = new Date();
  const monthLabel = `${now.getMonth() + 1}/${now.getFullYear()}`;
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [threshold, setThreshold] = useState(80);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTarget(budget ? (budget.categoryId ?? OVERALL) : null);
    setAmount(budget?.amount ?? 0);
    setThreshold(budget?.alertThreshold ?? 80);
    setActive(budget?.isActive ?? true);
    setErrors({});
    listCategories('expense')
      .then(setCategories)
      .catch(() => setErrors({ form: 'Không tải được danh mục. Vui lòng thử lại.' }));
  }, [visible, budget]);

  // Bỏ danh mục đã có ngân sách (trừ ngân sách đang sửa) và danh mục đang ẩn
  const taken = new Set(existing.filter((b) => b.id !== budget?.id).map((b) => b.categoryId ?? OVERALL));
  const options = [
    ...(taken.has(OVERALL) ? [] : [{ value: OVERALL, label: 'Tổng chi tiêu' }]),
    ...categories
      .filter((c) => !taken.has(c.id) && (!c.hidden || c.id === budget?.categoryId))
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  const showServerErrors = (e: unknown, fallback: string) => {
    const f = getFieldErrors(e);
    const known = f.category || f.amount || f.alert_threshold;
    setErrors({
      category: f.category,
      amount: f.amount,
      alertThreshold: f.alert_threshold,
      form: f.form ?? (known ? undefined : fallback),
    });
  };

  const handleSave = async () => {
    const e: Errors = {};
    if (!target) e.category = 'Chọn danh mục hoặc "Tổng chi tiêu".';
    if (amount <= 0) e.amount = 'Nhập hạn mức lớn hơn 0.';
    setErrors(e);
    if (e.category || e.amount || !target) return;

    const fields = { amount, alertThreshold: threshold, isActive: active };
    setSaving(true);
    try {
      // Không gửi danh mục khi sửa: server không cho đổi danh mục của ngân sách đã có lịch sử
      if (budget) await updateBudget(budget.id, fields);
      else await createBudget({ ...fields, categoryId: target === OVERALL ? null : target });
      onSaved();
    } catch (err) {
      showServerErrors(err, 'Không lưu được ngân sách. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!budget) return;
    const ok = await confirm({
      title: `Ngừng theo dõi "${budget.name}"?`,
      message: `Từ tháng ${monthLabel} sẽ không còn hạn mức và cảnh báo. Các tháng trước vẫn giữ hạn mức và số đã chi để xem lại.`,
      confirmText: 'Ngừng theo dõi',
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteBudget(budget.id);
      onSaved();
    } catch (err) {
      showServerErrors(err, 'Không ngừng được ngân sách. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={editing ? 'Sửa ngân sách' : 'Thêm ngân sách'}
      onClose={onClose}
      footer={
        <PrimaryButton
          title={editing ? 'Lưu thay đổi' : 'Thêm ngân sách'}
          onPress={handleSave}
          loading={saving}
          style={styles.flex}
        />
      }
    >
      <Text style={styles.section}>Áp dụng cho</Text>
      {budget ? (
        // Danh mục cố định khi sửa, để lịch sử các tháng trước không bị đổi tên
        <Text style={styles.fixed}>{budget.name}</Text>
      ) : options.length === 0 ? (
        <Text style={styles.hint}>Mọi danh mục chi đều đã có ngân sách.</Text>
      ) : (
        <View style={styles.chips}>
          {options.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              icon={o.value === OVERALL ? 'wallet-outline' : undefined}
              selected={target === o.value}
              showCheck={false}
              onPress={() => {
                setTarget(o.value);
                setErrors((x) => ({ ...x, category: undefined }));
              }}
            />
          ))}
        </View>
      )}
      {errors.category && <FieldError message={errors.category} />}

      <View style={styles.amount}>
        <AmountInput
          label={`Hạn mức từ tháng ${monthLabel}`}
          value={amount}
          onChange={(v) => {
            setAmount(v);
            setErrors((x) => ({ ...x, amount: undefined }));
          }}
          error={errors.amount}
        />
      </View>

      <Text style={styles.hint}>
        Tự áp dụng cho các tháng sau cho tới khi bạn sửa. Hạn mức các tháng trước không đổi.
      </Text>

      <Text style={styles.section}>Cảnh báo khi đã chi</Text>
      <View style={styles.chips}>
        {THRESHOLDS.map((t) => (
          <Chip
            key={t}
            label={`${t}%`}
            selected={threshold === t}
            showCheck={false}
            onPress={() => setThreshold(t)}
          />
        ))}
      </View>
      {errors.alertThreshold && <FieldError message={errors.alertThreshold} />}

      {editing && (
        <View style={styles.toggle}>
          <View style={styles.flex}>
            <Text style={styles.toggleTitle}>Theo dõi ngân sách này</Text>
            <Text style={styles.toggleText}>Tắt để tạm ngừng cảnh báo mà không mất hạn mức đã đặt.</Text>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.onPrimary}
            {...webSwitchProps}
            accessibilityLabel="Theo dõi ngân sách này"
          />
        </View>
      )}

      {editing && (
        <Pressable style={styles.delete} onPress={handleDelete} disabled={saving} hitSlop={8} accessibilityRole="button">
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteText}>Ngừng theo dõi từ tháng này</Text>
        </Pressable>
      )}

      {errors.form && <FieldError message={errors.form} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 13, fontWeight: '600', color: colors.text },
  hint: { marginTop: spacing.xs, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  fixed: { fontSize: 15, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amount: { marginTop: spacing.md },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  toggleText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  delete: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, alignSelf: 'flex-start' },
  deleteText: { fontSize: 14, fontWeight: '600', color: colors.danger },
});
