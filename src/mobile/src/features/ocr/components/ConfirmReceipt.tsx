import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/BottomSheet';
import { Chip } from '@/components/Chip';
import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { findPossibleDuplicate } from '@/features/ocr/duplicates';
import type { OcrFields } from '@/features/ocr/ocrApi';
import { groupThousands } from '@/features/transactions/components/AmountInput';
import { CategoryGrid } from '@/features/transactions/components/CategoryGrid';
import { parseDayInput } from '@/features/transactions/filters';
import {
  createTransaction,
  listAllTransactions,
  listCategories,
  listWallets,
} from '@/features/transactions/transactionsApi';
import type { Category, Transaction, Wallet } from '@/features/transactions/types';
import { getFieldErrors } from '@/lib/api/client';
import { addDays, toYmd } from '@/lib/date';
import { formatDayMonth, formatFullDate, formatVnd, maskDayInput } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

type Props = {
  uri?: string;
  fields: OcrFields & { total: number };
  onRetake: () => void;
  onCancel: () => void;
  onSaved: () => void;
};

type Editing = 'merchant' | 'date' | 'amount' | null;

/** UI-03: xem lại kết quả AI đọc từ hóa đơn, sửa nếu cần; chỉ lưu khi bấm Xác nhận */
export function ConfirmReceipt({ uri, fields, onRetake, onCancel, onSaved }: Props) {
  const [merchant, setMerchant] = useState(fields.merchant ?? '');
  const [day, setDay] = useState(formatFullDate(fields.date ?? new Date()));
  const [amount, setAmount] = useState(fields.total);
  const [categoryId, setCategoryId] = useState<string | null>(fields.categoryId ?? null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [categorySheet, setCategorySheet] = useState(false);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existing, setExisting] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listWallets(), listCategories('expense')])
      .then(([ws, cs]) => {
        setWallets(ws);
        setWalletId((w) => w ?? ws[0]?.id ?? null);
        setCategories(cs.filter((c) => !c.hidden || c.id === fields.categoryId));
      })
      .catch(() => setError('Không tải được ví và danh mục. Vui lòng thử lại.'));
    // Khoản chi 90 ngày gần đây để cảnh báo hóa đơn trùng; lỗi thì chỉ mất cảnh báo, vẫn lưu được
    listAllTransactions({ kind: 'expense', date_from: toYmd(addDays(new Date(), -90)) })
      .then(setExisting)
      .catch(() => undefined);
  }, [fields.categoryId]);

  const date = parseDayInput(day);
  const category = categories.find((c) => c.id === categoryId) ?? null;
  const wallet = wallets.find((w) => w.id === walletId) ?? null;

  // Cảnh báo trùng tính lại theo dữ liệu đang sửa
  const duplicate = useMemo(
    () => (date ? findPossibleDuplicate(existing, { merchant, total: amount, date }) : null),
    [existing, merchant, amount, date?.getTime()],
  );

  const handleConfirm = async () => {
    setEditing(null);
    if (amount <= 0) return setError('Tổng tiền phải lớn hơn 0.');
    if (!date) return setError('Ngày giao dịch chưa đúng dạng dd/mm/yyyy.');
    if (date.getTime() > Date.now()) return setError('Ngày giao dịch không được ở tương lai.');
    if (!category) return setError('Chọn danh mục cho giao dịch.');
    if (!walletId) return setError('Chọn ví thanh toán.');

    setError(null);
    setSaving(true);
    try {
      // Tên cửa hàng lưu làm ghi chú: hiện thành tên giao dịch và dùng để dò hóa đơn trùng
      await createTransaction({
        categoryId: category.id,
        walletId,
        amount,
        date: toYmd(date),
        note: merchant.trim(),
        source: 'ocr',
      });
      onSaved();
    } catch (e) {
      const f = getFieldErrors(e);
      setError(f.wallet ?? f.category ?? f.amount ?? f.date ?? f.form ?? 'Không lưu được giao dịch. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {duplicate && (
          <View style={styles.duplicate} accessibilityRole="alert">
            <Ionicons name="warning-outline" size={16} color={colors.warm} style={styles.bannerIcon} />
            <Text style={styles.duplicateText}>
              <Text style={styles.bold}>Có thể trùng hóa đơn. </Text>
              Một giao dịch {duplicate.title} ngày {formatDayMonth(duplicate.date)} với cùng số tiền đã được ghi nhận.
            </Text>
          </View>
        )}

        <View style={styles.intro}>
          {uri ? (
            <Image source={{ uri }} style={styles.thumb} resizeMode="cover" accessibilityLabel="Ảnh hóa đơn" />
          ) : (
            <View style={styles.thumb} />
          )}
          <View style={styles.flex}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Chờ xác nhận</Text>
            </View>
            <Text style={styles.introText}>
              Kiểm tra kỹ thông tin do AI đọc từ ảnh. Giao dịch chỉ được lưu sau khi bạn bấm Xác nhận.
            </Text>
            <Pressable onPress={onRetake} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Chụp lại</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <EditableRow
            label="Tên cửa hàng"
            editing={editing === 'merchant'}
            onEdit={() => setEditing('merchant')}
            display={merchant || 'Chưa có tên'}
            muted={!merchant}
          >
            <InlineInput value={merchant} onChangeText={setMerchant} onDone={() => setEditing(null)} maxLength={60} />
          </EditableRow>

          <EditableRow
            label="Ngày giao dịch"
            editing={editing === 'date'}
            onEdit={() => setEditing('date')}
            display={day}
          >
            <InlineInput
              value={day}
              onChangeText={(t) => setDay(maskDayInput(t))}
              onDone={() => setEditing(null)}
              keyboardType="number-pad"
              placeholder="dd/mm/yyyy"
              maxLength={10}
            />
          </EditableRow>

          <EditableRow
            label="Tổng tiền"
            editing={editing === 'amount'}
            onEdit={() => setEditing('amount')}
            display={formatVnd(amount)}
          >
            <InlineInput
              value={amount > 0 ? groupThousands(String(amount)) : ''}
              onChangeText={(t) => {
                const digits = t.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
                setAmount(digits ? Number(digits) : 0);
              }}
              onDone={() => setEditing(null)}
              keyboardType="number-pad"
              placeholder="0"
              suffix="đ"
            />
          </EditableRow>

          <EditableRow
            label="Danh mục (AI gợi ý)"
            editing={false}
            onEdit={() => {
              setEditing(null);
              setCategorySheet(true);
            }}
            display={category?.name ?? 'Chưa chọn'}
            muted={!category}
            last
          />
        </View>

        <Text style={styles.section}>Ví thanh toán</Text>
        <View style={styles.chips}>
          {wallets.map((w) => (
            <Chip key={w.id} label={w.name} selected={w.id === walletId} showCheck={false} onPress={() => setWalletId(w.id)} />
          ))}
        </View>
        {wallet && (
          <Text style={[styles.balance, wallet.balance - amount < 0 && styles.balanceNegative]}>
            Số dư sau giao dịch: {formatVnd(wallet.balance)} →{' '}
            {wallet.balance - amount < 0 ? `-${formatVnd(amount - wallet.balance)} (vượt số dư ví)` : formatVnd(wallet.balance - amount)}
          </Text>
        )}

        {error && <FieldError message={error} />}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancel} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Hủy bỏ</Text>
        </Pressable>
        <PrimaryButton title="Xác nhận" onPress={handleConfirm} loading={saving} style={styles.confirm} />
      </View>

      <BottomSheet visible={categorySheet} title="Chọn danh mục" onClose={() => setCategorySheet(false)}>
        <View style={styles.sheetBody}>
          <CategoryGrid
            categories={categories}
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id);
              setCategorySheet(false);
            }}
          />
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

/** Một dòng thông tin: nhãn + giá trị, cây bút để sửa; khi đang sửa thì hiện ô nhập (children) */
function EditableRow({
  label,
  display,
  editing,
  onEdit,
  muted,
  last,
  children,
}: {
  label: string;
  display: string;
  editing: boolean;
  onEdit: () => void;
  muted?: boolean;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        {editing ? children : <Text style={[styles.rowValue, muted && styles.rowMuted]}>{display}</Text>}
      </View>
      {!editing && (
        <Pressable onPress={onEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Sửa ${label.toLowerCase()}`}>
          <Ionicons name="pencil-outline" size={20} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

function InlineInput({
  onDone,
  suffix,
  ...props
}: ComponentProps<typeof TextInput> & { onDone: () => void; suffix?: string }) {
  return (
    <View style={styles.inlineBox}>
      <TextInput
        {...props}
        style={styles.inlineInput}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onDone}
        onBlur={onDone}
        placeholderTextColor={colors.textMuted}
      />
      {suffix && <Text style={styles.inlineSuffix}>{suffix}</Text>}
    </View>
  );
}

const webNoOutline = Platform.select({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
  default: {},
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  bold: { fontWeight: '700' },
  duplicate: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md - 2,
    borderWidth: 1,
    borderColor: '#E3B55A',
    borderRadius: radius.lg,
    backgroundColor: colors.warmSoft,
  },
  bannerIcon: { marginTop: 2 },
  duplicateText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.warm },
  intro: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  thumb: { width: 96, height: 132, borderRadius: radius.md, backgroundColor: colors.disabled },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.warmSoft,
  },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.warm },
  introText: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  link: { marginTop: spacing.sm, fontSize: 14, fontWeight: '700', color: colors.primary },
  card: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md - 2 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { fontSize: 12, color: colors.textMuted },
  rowValue: { marginTop: 2, fontSize: 17, fontWeight: '700', color: colors.text },
  rowMuted: { color: colors.textMuted, fontWeight: '500' },
  inlineBox: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  inlineInput: { flex: 1, minWidth: 0, paddingVertical: 4, fontSize: 17, fontWeight: '700', color: colors.text, ...webNoOutline },
  inlineSuffix: { fontSize: 15, color: colors.textMuted },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  balance: { marginTop: spacing.sm + 2, fontSize: 13, color: colors.textMuted },
  balanceNegative: { color: colors.danger, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: spacing.md - 4, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  cancel: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '700', color: colors.text },
  confirm: { flex: 2 },
  sheetBody: { marginTop: spacing.md },
});
