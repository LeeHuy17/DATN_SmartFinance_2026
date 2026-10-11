import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { FilterSheet } from '@/features/transactions/components/FilterSheet';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import {
  DEFAULT_FILTERS,
  TIME_LABELS,
  applyFilters,
  groupByDay,
  hasAdvancedFilters,
  sumAmount,
  type TransactionFilters,
  type TypeFilter,
} from '@/features/transactions/filters';
import { listCategories, listTransactions, listWallets } from '@/features/transactions/transactionsApi';
import type { Category, Transaction, Wallet } from '@/features/transactions/types';
import { useTransactionQuickView } from '@/features/transactions/useTransactionQuickView';
import { formatDayMonth, formatRelativeDay, formatVnd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
];

/** Tổng có dấu: -113.000đ / +15.000.000đ */
const formatTotal = (n: number) => (n === 0 ? '0đ' : `${n < 0 ? '-' : '+'}${formatVnd(n)}`);

/** "HÔM NAY · 03/10", "HÔM QUA · 02/10", "01/10" */
function dayLabel(date: Date) {
  const relative = formatRelativeDay(date);
  const dm = formatDayMonth(date);
  return relative === dm ? dm : `${relative.toUpperCase()} · ${dm}`;
}

export default function TransactionHistoryScreen() {
  const router = useRouter();
  // Mở từ nút cây bút ở tab Ví: lọc sẵn theo ví để người dùng truy vết và sửa giao dịch sai
  const params = useLocalSearchParams<{ walletId?: string }>();
  const [all, setAll] = useState<Transaction[] | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    params.walletId ? { ...DEFAULT_FILTERS, walletIds: [params.walletId] } : DEFAULT_FILTERS,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    const [list, ws, cs] = await Promise.all([listTransactions(), listWallets(), listCategories('expense')]);
    setAll(list);
    setWallets(ws);
    setCategories(cs);
  }, []);

  // Tải lại mỗi khi quay về màn hình (vd: sau khi sửa giao dịch)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const quickView = useTransactionQuickView(load);

  const filtered = useMemo(
    () => (all ? applyFilters(all, filters, query) : []),
    [all, filters, query],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const searching = query.trim().length > 0;
  const advancedActive = hasAdvancedFilters(filters);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const renderList = () => {
    if (!all) return <ActivityIndicator style={styles.loading} color={colors.primary} />;

    if (filtered.length === 0) {
      return (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Không có giao dịch phù hợp</Text>
          <Text style={styles.emptyText}>Thử từ khóa khác hoặc bỏ bớt bộ lọc.</Text>
          {(searching || advancedActive || filters.type !== 'all') && (
            <Pressable
              onPress={() => {
                setQuery('');
                setFilters(DEFAULT_FILTERS);
              }}
              hitSlop={8}
            >
              <Text style={styles.link}>Xóa tìm kiếm và bộ lọc</Text>
            </Pressable>
          )}
        </View>
      );
    }

    if (searching) {
      return (
        <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.resultCount}>
            {filtered.length} kết quả cho “{query.trim()}”
          </Text>
          <Group title="KẾT QUẢ" total={sumAmount(filtered)}>
            {filtered.map((t, i) => (
              <TransactionItem
                key={t.id}
                item={t}
                when="date"
                divider={i < filtered.length - 1}
                onPress={quickView.open}
              />
            ))}
          </Group>
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: g }) => (
          <Group title={dayLabel(g.date)} total={g.total}>
            {g.items.map((t, i) => (
              <TransactionItem
                key={t.id}
                item={t}
                when="time"
                divider={i < g.items.length - 1}
                onPress={quickView.open}
              />
            ))}
          </Group>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quay lại">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.search, searching && styles.searchActive]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo tên, ghi chú, số tiền"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searching && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Xóa từ khóa">
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.filterButton, advancedActive && styles.filterButtonActive]}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc"
        >
          <Ionicons name="options-outline" size={20} color={advancedActive ? colors.primary : colors.text} />
          {advancedActive && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {TYPE_CHIPS.map((c) => (
            <Chip
              key={c.value}
              variant="solid"
              label={c.label}
              selected={filters.type === c.value}
              onPress={() => setFilters((f) => ({ ...f, type: c.value }))}
            />
          ))}
          <Chip
            variant="solid"
            icon="calendar-outline"
            label={filters.time === 'all' ? 'Thời gian' : TIME_LABELS[filters.time]}
            selected={filters.time !== 'all'}
            onPress={() => setSheetOpen(true)}
          />
        </ScrollView>
      </View>

      {filters.walletIds.length > 0 && (
        <View style={styles.walletBanner}>
          <Ionicons name="wallet-outline" size={16} color={colors.primary} />
          <Text style={styles.walletBannerText} numberOfLines={2}>
            Giao dịch của ví{' '}
            <Text style={styles.walletBannerStrong}>
              {wallets
                .filter((w) => filters.walletIds.includes(w.id))
                .map((w) => w.name)
                .join(', ')}
            </Text>
            . Chạm một giao dịch để sửa nếu số dư chưa khớp.
          </Text>
          <Pressable
            onPress={() => setFilters((f) => ({ ...f, walletIds: [] }))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Bỏ lọc theo ví"
          >
            <Ionicons name="close" size={18} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {renderList()}

      <FilterSheet
        visible={sheetOpen}
        value={filters}
        wallets={wallets}
        categories={categories}
        onClose={() => setSheetOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setSheetOpen(false);
        }}
      />
      {quickView.element}
    </SafeAreaView>
  );
}

function Group({ title, total, children }: { title: string; total: number; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupTotal}>{formatTotal(total)}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

// Bỏ vòng focus mặc định của trình duyệt cho ô tìm kiếm (web)
const webNoOutline = Platform.select({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
  default: {},
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  headerSpacer: { width: 26 },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.md - 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  searchActive: { borderColor: colors.primary, borderWidth: 1.5 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: colors.text, ...webNoOutline },
  filterButton: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.badge,
  },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md - 4 },
  walletBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md - 4,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  walletBannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.primary },
  walletBannerStrong: { fontWeight: '700' },
  loading: { marginTop: spacing.xl },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  resultCount: { marginBottom: spacing.sm, fontSize: 13, color: colors.textMuted },
  group: { marginBottom: spacing.md },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textMuted },
  groupTotal: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  card: {
    paddingHorizontal: spacing.md - 4,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  empty: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl * 1.5, paddingHorizontal: spacing.lg },
  emptyTitle: { marginTop: spacing.xs, fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  link: { marginTop: spacing.sm, fontSize: 14, fontWeight: '700', color: colors.primary },
});
