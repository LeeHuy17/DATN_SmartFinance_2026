import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  listCategories,
  listWallets,
  type CategoryWithCount,
} from '@/features/transactions/transactionsApi';
import type { Wallet } from '@/features/transactions/types';
import { AddWalletSheet } from '@/features/wallets/components/AddWalletSheet';
import { WALLET_ICON, walletTypeLabel } from '@/features/wallets/walletTypes';
import { formatVnd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export default function WalletsScreen() {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[] | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [ws, cs] = await Promise.all([listWallets(), listCategories('expense')]);
    setWallets(ws);
    setCategories(cs);
  }, []);

  // Tải lại khi quay về tab (vd: vừa thêm giao dịch, vừa sửa danh mục)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Ví và danh mục</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="Thêm ví"
          >
            <Ionicons name="add" size={26} color={colors.onPrimary} />
          </Pressable>
        </View>

        {!wallets ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <View style={styles.card}>
            {wallets.map((w, i) => {
              const look = WALLET_ICON[w.type];
              return (
                <View key={w.id} style={[styles.walletRow, i < wallets.length - 1 && styles.divider]}>
                  <View style={[styles.walletIcon, { backgroundColor: look.bg }]}>
                    <Ionicons name={look.icon} size={20} color={look.fg} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.walletName} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text style={styles.muted}>{walletTypeLabel(w.type)}</Text>
                  </View>
                  <Text style={styles.balance}>{formatVnd(w.balance)}</Text>
                  {/* Không cho sửa thẳng số dư: mở lịch sử giao dịch của ví để người dùng
                      tự tìm và sửa giao dịch sai, thay vì tạo giao dịch bù cho khớp */}
                  <Pressable
                    style={styles.editButton}
                    onPress={() => router.push({ pathname: '/transactions', params: { walletId: w.id } })}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem và sửa giao dịch của ví ${w.name}`}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.card, styles.categoryCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Danh mục chi tiêu</Text>
            <Pressable
              onPress={() => router.push({ pathname: '/categories', params: { kind: 'expense' } })}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Quản lý</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, c.hidden && styles.chipHidden]}
                onPress={() => router.push({ pathname: '/categories/edit', params: { id: c.id } })}
                accessibilityRole="button"
                accessibilityLabel={c.hidden ? `${c.name}, đang ẩn` : c.name}
              >
                <Text style={[styles.chipText, c.hidden && styles.chipTextHidden]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>Danh mục đã có giao dịch chỉ có thể ẩn, không thể xóa.</Text>
        </View>

        <View style={styles.info}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            Tên ví không được trùng trong cùng một tài khoản. Số dư là mô phỏng.
          </Text>
        </View>
      </ScrollView>

      <AddWalletSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onCreated={() => {
          setAdding(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { marginTop: spacing.xl },
  card: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletName: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  balance: { fontSize: 15, fontWeight: '800', color: colors.text },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { fontSize: 12, fontWeight: '700', color: colors.primary },
  categoryCard: { paddingVertical: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md - 4 },
  chip: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  chipHidden: { backgroundColor: colors.disabled },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  chipTextHidden: { color: colors.textMuted, textDecorationLine: 'line-through' },
  note: { marginTop: spacing.md - 4, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  info: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md - 2,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.primary },
});
