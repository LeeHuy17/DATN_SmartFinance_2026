import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { takeOcrDraft, type OcrDraft } from '@/features/ocr/pendingReceipt';
import { KIND_OPTIONS } from '@/features/transactions/categories';
import { AmountInput } from '@/features/transactions/components/AmountInput';
import { CategoryGrid } from '@/features/transactions/components/CategoryGrid';
import { parseDayInput } from '@/features/transactions/filters';
import {
  createTransaction,
  getTransaction,
  listCategories,
  listWallets,
  updateTransaction,
} from '@/features/transactions/transactionsApi';
import type {
  Category,
  CategoryKind,
  Transaction,
  TransactionInput,
  Wallet,
} from '@/features/transactions/types';
import { getFieldErrors } from '@/lib/api/client';
import { toYmd } from '@/lib/date';
import { formatFullDate, maskDayInput } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

type Kind = CategoryKind;
type Errors = { amount?: string; category?: string; date?: string; form?: string };

export default function AddTransactionScreen() {
  const router = useRouter();
  // Có id = sửa giao dịch (mở từ nút "Sửa" trong khung xem nhanh)
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [original, setOriginal] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [kind, setKind] = useState<Kind>('expense');
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [day, setDay] = useState(formatFullDate(new Date()));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  // Dữ liệu đọc được từ hóa đơn (mở từ màn Xem trước hóa đơn)
  const [ocr, setOcr] = useState<OcrDraft | null>(null);

  useEffect(() => {
    (async () => {
      const ws = await listWallets();
      setWallets(ws);
      if (id) {
        const t = await getTransaction(id);
        if (!t) setNotFound(true);
        else {
          setOriginal(t);
          setKind(t.amount < 0 ? 'expense' : 'income');
          setAmount(Math.abs(t.amount));
          setCategoryId(t.category.id);
          setWalletId(t.walletId);
          setDay(formatFullDate(t.date));
          setNote(t.note ?? '');
        }
      } else {
        setWalletId(ws[0]?.id ?? null);
        const draft = takeOcrDraft();
        if (draft) {
          setOcr(draft);
          if (draft.total) setAmount(draft.total);
          if (draft.date) setDay(formatFullDate(draft.date));
          if (draft.categoryId) setCategoryId(draft.categoryId);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  // Tải danh mục mỗi khi quay lại màn hình (có thể vừa thêm / ẩn ở màn Quản lý danh mục)
  useFocusEffect(
    useCallback(() => {
      listCategories().then(setAllCategories);
    }, []),
  );

  // Danh mục đang hiển thị của loại đã chọn; khi sửa thì giữ cả danh mục cũ dù đã bị ẩn
  const categories = allCategories.filter(
    (c) => c.kind === kind && (!c.hidden || c.id === original?.category.id),
  );
  const category = allCategories.find((c) => c.id === categoryId) ?? null;
  const clearError = (key: keyof Errors) =>
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const changeKind = (k: Kind) => {
    setKind(k);
    // Danh mục cũ không thuộc loại mới thì bỏ chọn
    if (category && category.kind !== k) setCategoryId(null);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const validate = (): { errors: Errors; date: Date | null } => {
    const e: Errors = {};
    if (amount <= 0) e.amount = 'Nhập số tiền lớn hơn 0.';
    if (!category) e.category = 'Chọn một danh mục.';
    // Người dùng mới chưa có ví nào thì không có ví để ghi giao dịch vào
    if (!walletId) e.form = 'Chưa có ví nào. Hãy thêm ví ở tab Ví trước.';
    const date = parseDayInput(day);
    if (!date) e.date = 'Nhập ngày theo dạng dd/mm/yyyy.';
    else if (date.getTime() > Date.now()) e.date = 'Ngày giao dịch không được ở tương lai.';
    return { errors: e, date };
  };

  const handleSave = async () => {
    const { errors: e, date } = validate();
    setErrors(e);
    if (Object.keys(e).length || !date || !category || !walletId) return;

    // Loại thu / chi do server suy ra từ danh mục; số tiền luôn dương, ngày theo giờ máy.
    // Hóa đơn quét được mà không ghi chú thì lưu tên cửa hàng làm ghi chú để còn nhận ra giao dịch.
    const input: TransactionInput = {
      categoryId: category.id,
      walletId,
      amount,
      date: toYmd(date),
      note: note.trim() || ocr?.merchant?.trim() || '',
      source: original?.source ?? (ocr ? 'ocr' : 'manual'),
    };

    setSaving(true);
    try {
      if (id) await updateTransaction(id, input);
      else await createTransaction(input);
      // Tổng quan và Lịch sử tự tải lại khi quay về.
      // Đi từ luồng quét: đóng cả màn quét, về thẳng Tổng quan để thấy giao dịch vừa lưu
      if (ocr) router.dismissTo('/');
      else goBack();
    } catch (err) {
      // Lỗi 400 theo trường (vd. ví vừa bị lưu trữ, danh mục vừa bị ẩn ở máy khác)
      const f = getFieldErrors(err);
      setErrors({
        amount: f.amount,
        category: f.category,
        date: f.date,
        form: f.wallet ?? f.note ?? f.form ?? (Object.keys(f).length ? undefined : 'Không lưu được giao dịch. Vui lòng thử lại.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const title = editing ? 'Sửa giao dịch' : 'Thêm giao dịch';

  const renderForm = () => {
    if (loading) return <ActivityIndicator style={styles.loading} color={colors.primary} />;
    if (notFound) {
      return (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Không tìm thấy giao dịch. Có thể giao dịch đã bị xóa.</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {ocr && (
          <View style={styles.ocrBanner}>
            <Ionicons name="scan-outline" size={16} color={colors.primary} style={styles.ocrIcon} />
            <Text style={styles.ocrText}>
              {ocr.complete
                ? `Đã đọc từ hóa đơn${ocr.merchant ? ` ${ocr.merchant}` : ''}. Kiểm tra lại trước khi lưu.`
                : 'Đã điền phần đọc được từ hóa đơn. Hãy nhập các thông tin còn thiếu.'}
            </Text>
          </View>
        )}
        <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={changeKind} />

        <View style={styles.amount}>
          <AmountInput
            value={amount}
            onChange={(v) => {
              setAmount(v);
              clearError('amount');
            }}
            error={errors.amount}
            autoFocus={!editing}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <Pressable
            style={styles.manage}
            onPress={() => router.push({ pathname: '/categories', params: { kind } })}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.manageText}>Quản lý</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>
        <CategoryGrid
          categories={categories}
          value={categoryId}
          onChange={(c) => {
            setCategoryId(c);
            clearError('category');
          }}
        />
        {errors.category && <FieldError message={errors.category} />}

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
          {kind === 'expense' ? 'Ví thanh toán' : 'Ví nhận tiền'}
        </Text>
        <View style={styles.chips}>
          {wallets.map((w) => (
            <Chip
              key={w.id}
              label={w.name}
              selected={w.id === walletId}
              showCheck={false}
              onPress={() => setWalletId(w.id)}
            />
          ))}
        </View>

        <TextField
          label="Ngày giao dịch"
          value={day}
          onChangeText={(text) => {
            setDay(maskDayInput(text));
            clearError('date');
          }}
          error={errors.date}
          placeholder="dd/mm/yyyy"
          keyboardType="number-pad"
          maxLength={10}
        />

        <TextField
          label="Ghi chú (tuỳ chọn)"
          value={note}
          onChangeText={setNote}
          placeholder="Ví dụ: Cà phê với nhóm"
          maxLength={120}
          returnKeyType="done"
        />

        {errors.form && <FieldError message={errors.form} />}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {renderForm()}

        {!loading && !notFound && (
          <View style={styles.footer}>
            <PrimaryButton
              title={editing ? 'Lưu thay đổi' : 'Lưu giao dịch'}
              onPress={handleSave}
              loading={saving}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  headerSpacer: { width: 26 },
  loading: { marginTop: spacing.xl },
  notFound: { padding: spacing.lg },
  notFoundText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  amount: { marginTop: spacing.lg },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  sectionSpacing: { marginTop: spacing.lg, marginBottom: spacing.sm + 2 },
  manage: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  manageText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  ocrBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md - 4,
    padding: spacing.md - 4,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  ocrIcon: { marginTop: 1 },
  ocrText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.primary },
});
