import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/BottomSheet';
import { Chip } from '@/components/Chip';
import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { AmountInput } from '@/features/transactions/components/AmountInput';
import type { Wallet, WalletType } from '@/features/transactions/types';
import * as walletsApi from '@/features/wallets/walletsApi';
import { WALLET_TYPES } from '@/features/wallets/walletTypes';
import { getFieldErrors } from '@/lib/api/client';
import { colors, spacing } from '@/theme';

// react-native-web tô núm công tắc theo activeThumbColor (prop riêng của web), thiếu thì ra màu xanh ngọc
const webSwitchProps = Platform.OS === 'web' ? { activeThumbColor: colors.onPrimary } : {};

type Props = {
  visible: boolean;
  /** Có ví thì là sửa, không có là thêm mới */
  wallet?: Wallet | null;
  onClose: () => void;
  /** Gọi sau khi thêm, sửa hoặc lưu trữ thành công */
  onSaved: () => void;
};

type Errors = { name?: string; initialBalance?: string; form?: string };

/** Bảng thêm / sửa ví: tên (không trùng), loại ví, số dư ban đầu, có tính vào tổng tài sản không */
export function WalletSheet({ visible, wallet, onClose, onSaved }: Props) {
  const editing = !!wallet;
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [initialBalance, setInitialBalance] = useState(0);
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Mỗi lần mở bảng thì nạp lại dữ liệu của ví đang sửa (hoặc để trống khi thêm mới)
  useEffect(() => {
    if (!visible) return;
    setName(wallet?.name ?? '');
    setType(wallet?.type ?? 'cash');
    setInitialBalance(wallet?.initialBalance ?? 0);
    setIncludeInTotal(wallet?.includeInTotal ?? true);
    setErrors({});
  }, [visible, wallet]);

  const showServerErrors = (e: unknown, fallback: string) => {
    const f = getFieldErrors(e);
    setErrors({
      name: f.name,
      initialBalance: f.initial_balance,
      form: f.form ?? (f.name || f.initial_balance ? undefined : fallback),
    });
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: 'Nhập tên ví.' });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const input = { name: trimmed, type, initialBalance, includeInTotal };
      if (wallet) await walletsApi.update(wallet.id, input);
      else await walletsApi.create({ ...input, isArchived: false });
      onSaved();
    } catch (e) {
      showServerErrors(e, editing ? 'Không lưu được ví. Vui lòng thử lại.' : 'Không thêm được ví. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!wallet) return;
    setArchiving(true);
    setErrors({});
    try {
      await walletsApi.setArchived(wallet.id, !wallet.isArchived);
      onSaved();
    } catch (e) {
      showServerErrors(e, 'Không cập nhật được ví. Vui lòng thử lại.');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={editing ? 'Sửa ví' : 'Thêm ví'}
      onClose={onClose}
      footer={
        <PrimaryButton
          title={editing ? 'Lưu thay đổi' : 'Thêm ví'}
          onPress={handleSave}
          loading={saving}
          disabled={archiving}
          style={styles.flex}
        />
      }
    >
      <TextField
        label="Tên ví"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        error={errors.name}
        placeholder="Ví dụ: Techcombank"
        maxLength={60}
      />

      <Text style={styles.section}>Loại ví</Text>
      <View style={styles.chips}>
        {WALLET_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={type === t.value}
            showCheck={false}
            onPress={() => setType(t.value)}
          />
        ))}
      </View>

      <View style={styles.amount}>
        <AmountInput
          label="Số dư ban đầu"
          value={initialBalance}
          onChange={(v) => {
            setInitialBalance(v);
            setErrors((e) => ({ ...e, initialBalance: undefined }));
          }}
          error={errors.initialBalance}
        />
      </View>

      <View style={styles.toggle}>
        <View style={styles.flex}>
          <Text style={styles.toggleTitle}>Tính vào tổng tài sản</Text>
          <Text style={styles.toggleText}>Tắt với ví không muốn cộng vào tổng, ví dụ sổ tiết kiệm dài hạn.</Text>
        </View>
        <Switch
          value={includeInTotal}
          onValueChange={setIncludeInTotal}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.onPrimary}
          {...webSwitchProps}
          accessibilityLabel="Tính vào tổng tài sản"
        />
      </View>

      {editing && (
        <Pressable
          style={styles.archive}
          onPress={handleArchive}
          disabled={archiving || saving}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Ionicons
            name={wallet.isArchived ? 'arrow-undo-outline' : 'archive-outline'}
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.archiveText}>
            {archiving ? 'Đang cập nhật...' : wallet.isArchived ? 'Dùng lại ví này' : 'Lưu trữ ví'}
          </Text>
        </Pressable>
      )}
      {editing && !wallet.isArchived && (
        <Text style={styles.archiveHint}>
          Ví lưu trữ được ẩn khỏi danh sách và không tính vào tổng tài sản, dữ liệu vẫn được giữ.
        </Text>
      )}

      {errors.form && <FieldError message={errors.form} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 13, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amount: { marginTop: spacing.lg },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  toggleText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  archive: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, alignSelf: 'flex-start' },
  archiveText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  archiveHint: { marginTop: spacing.xs, fontSize: 12, lineHeight: 17, color: colors.textMuted },
});
