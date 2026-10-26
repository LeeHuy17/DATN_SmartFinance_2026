import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { CATEGORY_COLORS, CATEGORY_ICONS, softColor } from '@/features/transactions/categories';
import { CategoryIcon } from '@/features/transactions/components/CategoryIcon';
import * as categoriesApi from '@/features/categories/categoriesApi';
import { getCategory, type CategoryWithCount } from '@/features/transactions/transactionsApi';
import { ApiError, apiDetail, getFieldErrors } from '@/lib/api/client';
import type { CategoryKind, IconName } from '@/features/transactions/types';
import { makeStyles, radius, spacing, useColors } from '@/theme';

const ICON_COLUMNS = 6;
const MAX_NAME = 30;

/** Thêm danh mục (?kind=expense|income) hoặc sửa danh mục (?id=...) */
export default function CategoryEditScreen() {
  const styles = useStyles();
  const colors = useColors();
  // react-native-web tô núm công tắc theo activeThumbColor (prop riêng của web), thiếu thì ra màu xanh ngọc
  const webSwitchProps = Platform.OS === 'web' ? { activeThumbColor: colors.onPrimary } : {};
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: CategoryKind }>();
  const editing = !!params.id;

  const [original, setOriginal] = useState<CategoryWithCount | null>(null);
  const [loading, setLoading] = useState(editing);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<IconName>('pricetag-outline');
  const [visible, setVisible] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    getCategory(params.id)
      .then((c) => {
        if (!c) setNotFound(true);
        else {
          setOriginal(c);
          setName(c.name);
          setColor(c.color);
          setIcon(c.icon);
          setVisible(!c.hidden);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  const kind: CategoryKind = original?.kind ?? (params.kind === 'income' ? 'income' : 'expense');
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/categories'));
  const trimmed = name.trim();

  const handleSave = async () => {
    if (!trimmed) {
      setNameError('Nhập tên danh mục.');
      return;
    }
    const input = { name: trimmed, kind, color, icon, hidden: !visible };
    setSaving(true);
    setFormError(null);
    try {
      if (original) await categoriesApi.update(original.id, input);
      else await categoriesApi.create(input);
      goBack();
    } catch (e) {
      // Lỗi 400 theo trường: tên trùng hiện dưới ô Tên, lỗi khác hiện cuối form
      const errors = getFieldErrors(e);
      if (errors.name) setNameError(errors.name);
      else setFormError(errors.form ?? errors.color ?? errors.icon ?? 'Không lưu được danh mục. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!original) return;
    setDeleting(true);
    try {
      await categoriesApi.remove(original.id);
      setConfirmingDelete(false);
      goBack();
    } catch (e) {
      setConfirmingDelete(false);
      // 409: danh mục đã có giao dịch trên server, chỉ được ẩn
      setFormError(
        e instanceof ApiError && e.status === 409
          ? apiDetail(e) ?? 'Danh mục đang có giao dịch, hãy ẩn thay vì xóa.'
          : 'Không xóa được danh mục. Vui lòng thử lại.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const title = editing ? 'Sửa danh mục' : 'Thêm danh mục';

  if (loading || notFound) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={title} fallbackHref="/categories" />
        {loading ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <Text style={styles.notFound}>Không tải được danh mục. Có thể danh mục đã bị xóa hoặc mất kết nối mạng.</Text>
        )}
      </SafeAreaView>
    );
  }

  const iconRows: IconName[][] = [];
  for (let i = 0; i < CATEGORY_ICONS.length; i += ICON_COLUMNS) {
    iconRows.push(CATEGORY_ICONS.slice(i, i + ICON_COLUMNS));
  }
  const usedCount = original?.transactionCount ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title={title} fallbackHref="/categories" />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Xem trước */}
          <View style={styles.preview}>
            <CategoryIcon icon={icon} color={color} size={64} dimmed={!visible} />
            <Text style={[styles.previewName, !trimmed && styles.previewPlaceholder]} numberOfLines={1}>
              {trimmed || 'Tên danh mục'}
            </Text>
          </View>

          <TextField
            label="Tên danh mục"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameError(null);
            }}
            error={nameError}
            placeholder="Ví dụ: Thú cưng"
            maxLength={MAX_NAME}
            autoFocus={!editing}
            returnKeyType="done"
          />

          <Text style={styles.section}>Màu sắc</Text>
          <View style={styles.colors}>
            {CATEGORY_COLORS.map((c) => {
              const selected = c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorRing, selected && { borderColor: c }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Màu ${c}`}
                >
                  <View style={[styles.colorDot, { backgroundColor: c }]}>
                    {selected && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>Biểu tượng</Text>
          <View style={styles.iconGrid}>
            {iconRows.map((row, r) => (
              <View key={r} style={styles.iconRow}>
                {row.map((ic) => {
                  const selected = ic === icon;
                  return (
                    <Pressable
                      key={ic}
                      onPress={() => setIcon(ic)}
                      style={[
                        styles.iconTile,
                        selected && { borderColor: color, borderWidth: 1.5, backgroundColor: softColor(color) },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={ic}
                    >
                      <Ionicons name={ic} size={20} color={selected ? color : colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.toggleCard}>
            <View style={styles.flex}>
              <Text style={styles.toggleTitle}>Hiển thị danh mục</Text>
              <Text style={styles.toggleText}>Tắt để ẩn khỏi danh sách chọn khi thêm giao dịch.</Text>
            </View>
            <Switch
              value={visible}
              onValueChange={setVisible}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.onPrimary}
              {...webSwitchProps}
              accessibilityLabel="Hiển thị danh mục"
            />
          </View>

          {formError && <FieldError message={formError} />}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title={editing ? 'Lưu thay đổi' : 'Thêm danh mục'}
            onPress={handleSave}
            loading={saving}
            disabled={!trimmed}
          />
          {editing &&
            (usedCount === 0 ? (
              <Pressable
                style={styles.delete}
                onPress={() => setConfirmingDelete(true)}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.deleteText}>Xóa danh mục</Text>
              </Pressable>
            ) : (
              <View style={styles.locked}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                <Text style={styles.lockedText}>
                  Danh mục có {usedCount} giao dịch chỉ có thể ẩn, không thể xóa.
                </Text>
              </View>
            ))}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Xóa danh mục "${original?.name ?? ''}"?`}
        message="Danh mục chưa có giao dịch nên có thể xóa. Thao tác này không thể hoàn tác."
        confirmText="Xóa"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </SafeAreaView>
  );
}

const DOT = 30;

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  loading: { marginTop: spacing.xl },
  notFound: { padding: spacing.lg, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  preview: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  previewName: { fontSize: 15, fontWeight: '700', color: colors.text },
  previewPlaceholder: { color: colors.textMuted, fontWeight: '500' },
  section: { marginTop: spacing.md + 2, marginBottom: spacing.sm, fontSize: 13, fontWeight: '600', color: colors.text },
  colors: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  colorRing: {
    width: DOT + 8,
    height: DOT + 8,
    borderRadius: (DOT + 8) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGrid: { gap: spacing.sm },
  iconRow: { flexDirection: 'row', gap: spacing.sm },
  iconTile: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCard: {
    marginTop: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    padding: spacing.md - 2,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  toggleText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md - 4 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteText: { fontSize: 14, fontWeight: '700', color: colors.danger },
  locked: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  lockedText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
}));
