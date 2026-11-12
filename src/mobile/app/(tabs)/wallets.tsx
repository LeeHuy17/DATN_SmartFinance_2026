import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { listCategories, type CategoryWithCount } from '@/features/transactions/transactionsApi';
import type { Wallet } from '@/features/transactions/types';
import { WalletSheet } from '@/features/wallets/components/WalletSheet';
import * as walletsApi from '@/features/wallets/walletsApi';
import { walletIcon, walletTypeLabel } from '@/features/wallets/walletTypes';
import { formatBalance } from '@/lib/format';
import { makeStyles, radius, spacing, useColors } from '@/theme';

export default function WalletsScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[] | null>(null);
  const [summary, setSummary] = useState<walletsApi.WalletSummary | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [error, setError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // undefined: bảng đóng; null: thêm ví mới; Wallet: sửa ví đó
  const [editing, setEditing] = useState<Wallet | null | undefined>(undefined);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [ws, sm, cs] = await Promise.all([
        walletsApi.list({ includeArchived: true }),
        walletsApi.getSummary(),
        listCategories('expense'),
      ]);
      setWallets(ws);
      setSummary(sm);
      setCategories(cs);
    } catch {
      setError(true);
    }
  }, []);

  // Tải lại khi quay về tab (vd: vừa sửa danh mục)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const active = wallets?.filter((w) => !w.isArchived) ?? [];
  const archived = wallets?.filter((w) => w.isArchived) ?? [];

  const renderWallet = (w: Wallet, i: number, list: Wallet[]) => {
    const look = walletIcon(colors)[w.type];
    const meta = [walletTypeLabel(w.type), !w.includeInTotal && !w.isArchived && 'Không tính vào tổng']
      .filter(Boolean)
      .join(' · ');
    return (
      <Pressable
        key={w.id}
        style={({ pressed }) => [
          styles.walletRow,
          i < list.length - 1 && styles.divider,
          pressed && styles.pressed,
        ]}
        onPress={() => setEditing(w)}
        accessibilityRole="button"
        accessibilityLabel={`Sửa ví ${w.name}, số dư ${formatBalance(w.balance)}`}
      >
        <View style={[styles.walletIcon, { backgroundColor: look.bg }, w.isArchived && styles.dimmed]}>
          <Ionicons name={look.icon} size={20} color={look.fg} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.walletName, w.isArchived && styles.mutedText]} numberOfLines={1}>
            {w.name}
          </Text>
          <Text style={styles.muted}>{meta}</Text>
        </View>
        <Text style={[styles.balance, w.isArchived && styles.mutedText]}>{formatBalance(w.balance)}</Text>
        {!w.isArchived && (
          <Pressable
            style={styles.transferButton}
            onPress={() => router.push({
              pathname: '/transaction/add',
              params: { mode: 'transfer', fromWalletId: w.id },
            })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Chuyển tiền từ ví ${w.name}`}
          >
            <Ionicons name="swap-horizontal" size={18} color={colors.walletBank} />
          </Pressable>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.border} />
      </Pressable>
    );
  };

  const renderWallets = () => {
    if (error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Không tải được danh sách ví. Kiểm tra kết nối mạng rồi thử lại.</Text>
          <PrimaryButton title="Thử lại" onPress={load} style={styles.retry} />
        </View>
      );
    }
    if (!wallets || !summary) return <ActivityIndicator style={styles.loading} color={colors.primary} />;

    return (
      <>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tổng tài sản ({summary.walletCount} ví)</Text>
          <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatBalance(summary.totalBalance)}
          </Text>
          <Pressable
            style={styles.totalTransfer}
            onPress={() => router.push({ pathname: '/transaction/add', params: { mode: 'transfer' } })}
            accessibilityRole="button"
          >
            <Ionicons name="swap-horizontal" size={17} color={colors.onPrimary} />
            <Text style={styles.totalTransferText}>Chuyển tiền</Text>
          </Pressable>
        </View>

        {active.length === 0 ? (
          <Text style={styles.empty}>Chưa có ví nào. Bấm nút + để thêm ví đầu tiên.</Text>
        ) : (
          <View style={styles.card}>{active.map(renderWallet)}</View>
        )}

        {archived.length > 0 && (
          <>
            <Pressable
              style={styles.archivedToggle}
              onPress={() => setShowArchived((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: showArchived }}
            >
              <Text style={styles.archivedTitle}>Ví đã lưu trữ ({archived.length})</Text>
              <Ionicons name={showArchived ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </Pressable>
            {showArchived && <View style={styles.card}>{archived.map(renderWallet)}</View>}
          </>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Ví và danh mục</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setEditing(null)}
            accessibilityRole="button"
            accessibilityLabel="Thêm ví"
          >
            <Ionicons name="add" size={26} color={colors.onPrimary} />
          </Pressable>
        </View>

        {renderWallets()}

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
            Tên ví không được trùng trong cùng một tài khoản. Ví và số dư là mô phỏng, không kết nối ngân
            hàng thật.
          </Text>
        </View>
      </ScrollView>

      <WalletSheet
        visible={editing !== undefined}
        wallet={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          load();
        }}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
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
  totalCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  totalLabel: { fontSize: 13, color: colors.onPrimary, opacity: 0.85 },
  totalValue: { marginTop: spacing.xs, fontSize: 26, fontWeight: '800', color: colors.onPrimary },
  totalTransfer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  totalTransferText: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },
  empty: { marginTop: spacing.md, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  errorBox: { marginTop: spacing.md, alignItems: 'center' },
  errorText: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  retry: { marginTop: spacing.md, alignSelf: 'stretch' },
  card: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 14 },
  pressed: { opacity: 0.6 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.5 },
  walletName: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  mutedText: { color: colors.textMuted },
  balance: { fontSize: 15, fontWeight: '800', color: colors.text },
  transferButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoSoft,
  },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  archivedTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
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
}));
