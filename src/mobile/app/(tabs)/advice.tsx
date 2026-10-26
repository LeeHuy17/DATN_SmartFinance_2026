import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  getAdvice,
  isRateLimited,
  runAdvice,
  type Insights,
  type ShownAdvice,
} from '@/features/advice/adviceApi';
import {
  AdviceEmpty,
  AdviceError,
  AdviceLoading,
  NoticeBanner,
} from '@/features/advice/components/AdviceStates';
import { BudgetCard } from '@/features/advice/components/BudgetCard';
import { BudgetSheet } from '@/features/advice/components/BudgetSheet';
import { listBudgets, type Budget } from '@/features/budgets/budgetsApi';
import { addMonths, toMonthKey } from '@/lib/date';
import { formatDateTime } from '@/lib/format';
import { makeStyles, radius, spacing, useColors, type Colors } from '@/theme';

const RATE_LIMITED = 'Bạn phân tích quá nhiều lần, hãy thử lại sau.';
const FAILED = 'Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại sau ít phút.';

type TrendDirection = Insights['trends'][number]['direction'];
type Priority = Insights['advice'][number]['priority'];

// Xu hướng ở đây chủ yếu nói về chi tiêu: tăng tô cam để chú ý, giảm tô xanh
const trendLooks = (colors: Colors): Record<TrendDirection, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> => ({
  up: { icon: 'trending-up', color: colors.expense, label: 'Tăng' },
  down: { icon: 'trending-down', color: colors.primary, label: 'Giảm' },
  flat: { icon: 'remove', color: colors.textMuted, label: 'Ổn định' },
});

const priorityLooks = (colors: Colors): Record<Priority, { color: string; label: string }> => ({
  high: { color: colors.danger, label: 'Ưu tiên cao' },
  medium: { color: colors.expense, label: 'Ưu tiên vừa' },
  low: { color: colors.primary, label: 'Ưu tiên thấp' },
});

export default function AdviceScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  // Lời khuyên của tháng hiện tại (giờ máy); ngân sách bên dưới có nút chọn tháng riêng
  const [month] = useState(() => toMonthKey(new Date()));
  const [result, setResult] = useState<ShownAdvice | null>(null);
  // Đang đọc kết quả đã lưu hoặc đang chờ AI phân tích
  const [busy, setBusy] = useState(true);
  // Không lấy được kết quả nào (lần mở đầu tiên thất bại)
  const [failure, setFailure] = useState<string | null>(null);
  // Làm mới thất bại nhưng vẫn còn kết quả cũ để xem
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<ShownAdvice | null>(null);
  // Lần tải cũ trả về muộn (đã có lần mới hơn) thì bỏ qua
  const requestId = useRef(0);

  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [budgetError, setBudgetError] = useState(false);
  const [budgetMonth, setBudgetMonth] = useState(() => addMonths(new Date(), 0));
  // undefined: bảng đóng; null: thêm mới; Budget: sửa ngân sách đó
  const [editingBudget, setEditingBudget] = useState<Budget | null | undefined>(undefined);

  /**
   * open: đọc bản đã lưu (nhanh), chỉ gọi phân tích khi chưa có.
   * refresh: bấm "Phân tích lại" (force: bỏ qua thời gian chờ nếu số liệu đã đổi).
   * recheck: lặng lẽ kiểm tra lại khi quay về tab mà trước đó chưa đủ giao dịch, lỗi thì bỏ qua.
   */
  const fetchAdvice = useCallback(
    async (mode: 'open' | 'refresh' | 'recheck') => {
      const id = ++requestId.current;
      const hadResult = resultRef.current !== null;
      if (mode !== 'recheck') {
        setBusy(true);
        setNotice(null);
        if (mode === 'open') setFailure(null);
      }
      try {
        let next = mode === 'open' ? await getAdvice(month) : null;
        if (!next || next.status === 'none') next = await runAdvice(month, mode === 'refresh');
        if (next.status === 'none') throw new Error('Server không trả kết quả');
        if (id !== requestId.current) return;
        resultRef.current = next;
        setResult(next);
        setFailure(null);
      } catch (e) {
        if (id !== requestId.current || mode === 'recheck') return;
        const message = isRateLimited(e) ? RATE_LIMITED : FAILED;
        if (hadResult) setNotice(message);
        else setFailure(message);
      } finally {
        if (id === requestId.current) setBusy(false);
      }
    },
    [month],
  );

  // Mở tab lần đầu: không gọi lại mỗi lần chuyển tab
  useEffect(() => {
    fetchAdvice('open');
  }, [fetchAdvice]);

  // Số đã chi do server tính theo tháng đang xem (?month=YYYY-MM ghép từ giờ máy)
  const loadBudgets = useCallback(() => {
    setBudgetError(false);
    listBudgets(toMonthKey(budgetMonth))
      .then(setBudgets)
      .catch(() => setBudgetError(true));
  }, [budgetMonth]);

  const changeBudgetMonth = (delta: -1 | 1) => {
    setBudgets(null);
    setBudgetMonth((m) => addMonths(m, delta));
  };

  // Quay về tab: có thể vừa thêm / sửa / xóa giao dịch hoặc xóa danh mục. Đang chờ đủ giao dịch thì kiểm tra lại
  useFocusEffect(
    useCallback(() => {
      loadBudgets();
      if (resultRef.current?.status === 'insufficient_data') fetchAdvice('recheck');
    }, [loadBudgets, fetchAdvice]),
  );

  const budgetCard = (
    <BudgetCard
      month={budgetMonth}
      budgets={budgets}
      error={budgetError}
      onRetry={loadBudgets}
      onChangeMonth={changeBudgetMonth}
      onAdd={() => setEditingBudget(null)}
      onEdit={setEditingBudget}
    />
  );

  const renderInsights = (r: Extract<ShownAdvice, { status: 'ok' }>) => {
    const { insights } = r;
    const rules = r.source === 'rules';
    return (
      <View style={busy && styles.dimmed}>
        <View style={styles.insight}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            <Text style={styles.insightTitle}>Nhận xét tháng {Number(r.month.slice(5))}</Text>
            {rules && (
              <View style={styles.basicTag} accessibilityLabel="Gợi ý cơ bản, không phải do AI viết">
                <Text style={styles.basicTagText}>Gợi ý cơ bản</Text>
              </View>
            )}
          </View>
          <Text style={styles.insightText}>{insights.summary}</Text>
          {rules && (
            <Text style={styles.insightHint}>
              Trợ lý AI tạm thời không khả dụng nên đây là gợi ý theo số liệu của bạn. Bấm nút làm mới để thử lại.
            </Text>
          )}
          <Text style={styles.updated}>Cập nhật {formatDateTime(r.generated_at)}</Text>
        </View>

        {insights.trends.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Xu hướng</Text>
            {insights.trends.map((t, i) => {
              const look = trendLooks(colors)[t.direction];
              return (
                <View key={`${i}-${t.title}`} style={styles.item} accessibilityLabel={`${look.label}: ${t.title}. ${t.detail}`}>
                  <View style={[styles.trendIcon, { backgroundColor: `${look.color}1A` }]}>
                    <Ionicons name={look.icon} size={18} color={look.color} />
                  </View>
                  <View style={styles.itemTexts}>
                    <Text style={styles.itemTitle}>{t.title}</Text>
                    {!!t.detail && <Text style={styles.itemDetail}>{t.detail}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {insights.advice.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Gợi ý hành động</Text>
            {insights.advice.map((a, i) => {
              const look = priorityLooks(colors)[a.priority];
              return (
                <View key={`${i}-${a.title}`} style={styles.item} accessibilityLabel={`${look.label}: ${a.title}. ${a.detail}`}>
                  <View style={[styles.actionNumber, { backgroundColor: look.color }]}>
                    <Text style={styles.actionNumberText}>{i + 1}</Text>
                  </View>
                  <View style={styles.itemTexts}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.itemTitle, styles.flex]}>{a.title}</Text>
                      {a.priority === 'high' && <Text style={[styles.priorityTag, { color: look.color }]}>{look.label}</Text>}
                    </View>
                    {!!a.detail && <Text style={styles.itemDetail}>{a.detail}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderBody = () => {
    if (!result) {
      if (busy) return <AdviceLoading />;
      return (
        <>
          <AdviceError
            message={failure}
            onRetry={() => fetchAdvice('open')}
            onReports={() => router.navigate('/reports')}
          />
          {budgetCard}
        </>
      );
    }

    if (result.status === 'insufficient_data') {
      return (
        <>
          <AdviceEmpty
            transactions={result.transactions}
            minTransactions={result.min_transactions}
            onAdd={() => router.push('/transaction/add')}
            onScan={() => router.push('/receipt/scan')}
          />
          {/* Chưa đủ dữ liệu cho AI vẫn đặt được ngân sách */}
          {budgetCard}
        </>
      );
    }

    return (
      <>
        {notice && <NoticeBanner text={notice} />}
        {renderInsights(result)}
        {budgetCard}

        <View style={styles.note}>
          <Ionicons name="ellipse-outline" size={8} color={colors.textMuted} style={styles.noteDot} />
          <Text style={styles.noteText}>
            Chỉ gửi dữ liệu chi tiêu tổng hợp tới AI, không gửi thông tin cá nhân.
          </Text>
        </View>
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} style={styles.noteDot} />
          <Text style={styles.noteText}>{result.disclaimer}</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.flex]}>Lời khuyên AI</Text>
          {result?.status === 'ok' && (
            <Pressable
              style={styles.refresh}
              onPress={() => fetchAdvice('refresh')}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Phân tích lại"
              accessibilityState={{ busy }}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={22} color={colors.text} />
              )}
            </Pressable>
          )}
        </View>

        {renderBody()}
      </ScrollView>

      <BudgetSheet
        visible={editingBudget !== undefined}
        budget={editingBudget}
        existing={budgets ?? []}
        onClose={() => setEditingBudget(undefined)}
        onSaved={() => {
          setEditingBudget(undefined);
          loadBudgets();
          // Không tự phân tích lại: mỗi lần là một lượt gọi AI (giới hạn 20 lần/giờ). Bấm nút làm mới khi cần
        }}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  refresh: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.5 },
  insight: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  insightTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.primary },
  basicTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.md,
    backgroundColor: colors.warmSoft,
  },
  basicTagText: { fontSize: 11, fontWeight: '700', color: colors.warm },
  insightText: { marginTop: spacing.sm, fontSize: 16, lineHeight: 24, color: colors.text },
  insightHint: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  updated: { marginTop: spacing.sm, fontSize: 12, color: colors.textMuted },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  cardLabel: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  item: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.md - 2 },
  itemTexts: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemTitle: { fontSize: 15, fontWeight: '700', lineHeight: 22, color: colors.text },
  itemDetail: { marginTop: 2, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  priorityTag: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  trendIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionNumberText: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.xs },
  noteDot: { marginTop: 6 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textMuted },
}));
