import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Chip } from '@/components/Chip';
import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { AmountInput } from '@/features/transactions/components/AmountInput';
import { DuplicateNameError, createWallet } from '@/features/transactions/transactionsApi';
import type { WalletType } from '@/features/transactions/types';
import { WALLET_TYPES } from '@/features/wallets/walletTypes';
import { colors, spacing } from '@/theme';

type Props = { visible: boolean; onClose: () => void; onCreated: () => void };

/** Bảng thêm ví: tên (không trùng), loại ví, số dư ban đầu */
export function AddWalletSheet({ visible, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [balance, setBalance] = useState(0);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setType('cash');
    setBalance(0);
    setNameError(null);
    setFormError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Nhập tên ví.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createWallet({ name: trimmed, type, balance });
      reset();
      onCreated();
    } catch (e) {
      if (e instanceof DuplicateNameError) setNameError(`Đã có ví tên "${trimmed}".`);
      else setFormError('Không thêm được ví. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Thêm ví"
      onClose={close}
      footer={
        <PrimaryButton title="Thêm ví" onPress={handleSave} loading={saving} style={styles.flex} />
      }
    >
      <TextField
        label="Tên ví"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setNameError(null);
        }}
        error={nameError}
        placeholder="Ví dụ: Techcombank"
        maxLength={30}
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
        <AmountInput label="Số dư ban đầu" value={balance} onChange={setBalance} />
      </View>

      {formError && <FieldError message={formError} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 13, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amount: { marginTop: spacing.lg },
});
