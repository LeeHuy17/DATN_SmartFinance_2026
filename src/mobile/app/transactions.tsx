import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
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
  groupByDay,
  hasAdvancedFilters,
  toApiFilters,
  type TransactionFilters,
  type TypeFilter,
} from '@/features/transactions/filters';
import {
  getTransactionSummary,
  listCategories,
  listTransactions,
} from '@/features/transactions/transactionsApi';
import type { Category, Transaction, Wallet } from '@/features/transactions/types';
import { useTransactionQuickView } from '@/features/transactions/useTransactionQuickView';
import * as walletsApi from '@/features/wallets/walletsApi';
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

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

export default function TransactionHistoryScreen() {
  const router = useRouter();
  // Mở từ tab Ví: lọc sẵn theo ví để người dùng truy vết và sửa giao dịch sai
  const params = useLocalSearchParams<{ walletId?: string }>();
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    params.walletId ? { ...DEFAULT_FILTERS, walletIds: [params.walletId] } : DEFAULT_FILTERS,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const page = useRef(1);
  // Mỗi lần tải lại từ đầu tăng số này; phản hồi của lần tải cũ (bộ lọc cũ) bị bỏ qua
  const requestId = useRef(0);

  // Chờ người dùng ngừng gõ rồi mới tìm, tránh gọi API theo từng ký tự
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const apiFilters = useMemo(() => toApiFilters(filters, debouncedQuery), [filters, debouncedQuery]);
  const searching = debouncedQuery.trim().length > 0;

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setError(false);
    try {
      const [first, summary] = await Promise.all([
        listTransactions({ ...apiFilters, page: 1, page_size: PAGE_SIZE }),
        apiFilters.search ? getTransactionSummary(apiFilters) : Promise.resolve(null),
      ]);
      if (id !== requestId.current) return;
      page.current = 1;
      setItems(first.items);
      setCount(first.count);
      setHasMore(first.hasMore);
      setSearchTotal(summary?.net ?? null);
    } catch {
      if (id === requestId.current) setError(true);
    }
  }, [apiFilters]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !items) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const next = await listTransactions({ ...apiFilters, page: page.current + 1, page_size: PAGE_SIZE });
      if (id !== requestId.current) return;
      page.current += 1;
      // Có giao dịch mới thêm giữa hai lần tải thì trang sau có thể lặp lại vài dòng
      setItems((prev) => {
        const seen = new Set(prev?.map((t) => t.id));
        return [...(prev ?? []), ...next.items.filter((t) => !seen.has(t.id))];
      });
      setHasMore(next.hasMore);
    } catch {
      // Giữ danh sách đang có; cuộn xuống lần nữa sẽ thử lại
    } finally {
      setLoadingMore(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  };

  // Tải lại khi đổi bộ lọc / từ khóa và mỗi khi quay về màn hình (vd: sau khi sửa giao dịch)
  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage]),
  );

  // Ví (kể cả ví đã lưu trữ) và danh mục cho bảng Bộ lọc
  useFocusEffect(
    useCallback(() => {
      Promise.all([walletsApi.list({ includeArchived: true }), listCategories('expense')])
        .then(([ws, cs]) => {
          setWallets(ws);
          setCategories(cs);
        })
        .catch(() => undefined);
    }, []),
  );

  const quickView = useTransactionQuickView(loadFirstPage);

  const groups = useMemo(() => groupByDay(items ?? []), [items]);
  const advancedActive = hasAdvancedFilters(filters);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const renderList = () => {
    if (error && !items) {
      return (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Không tải được giao dịch</Text>
          <Text style={styles.emptyText}>Kiểm tra kết nối mạng rồi thử lại.</Text>
          <Pressable onPress={loadFirstPage} hitSlop={8}>
            <Text style={styles.link}>Thử lại</Text>
          </Pressable>
        </View>
      );
    }

    if (!items) return <ActivityIndicator style={styles.loading} color={colors.primary} />;

    if (items.length === 0) {
      const filtered = query.trim().length > 0 || advancedActive || filters.type !== 'all';
      return (
        <View style={styles.empty}>
          <Ionicons name={filtered ? 'search-outline' : 'receipt-outline'} size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{filtered ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch nào'}</Text>
          <Text style={styles.emptyText}>
            {filtered ? 'Thử từ khóa khác hoặc bỏ bớt bộ lọc.' : 'Bấm "Nhập Thu/Chi" ở Tổng quan để thêm giao dịch đầu tiên.'}
          </Text>
          {filtered && (
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

    return (
      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          searching ? (
            <Text style={styles.resultCount}>
              {count} kết quả cho “{debouncedQuery.trim()}”
              {searchTotal !== null && ` · ${formatTotal(searchTotal)}`}
            </Text>
          ) : undefined
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.loadingMore} color={colors.primary} /> : undefined
        }
        renderItem={({ item: g }) => (
          <Group title={dayLabel(g.date)} total={g.total}>
            {g.items.map((t, i) => (
              <TransactionItem
                key={t.id}
                item={t}
                when="none"
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
        <View style={[styles.search, query.trim().length > 0 && styles.searchActive]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo ghi chú, danh mục"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
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
  loadingMore: { marginVertical: spacing.md },
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
