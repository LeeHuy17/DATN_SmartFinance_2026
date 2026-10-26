import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SegmentedControl } from '@/components/SegmentedControl';
import type { Period, Report, ReportKind } from '@/features/reports/aggregate';
import { DonutChart } from '@/features/reports/components/DonutChart';
import { SpendingBars } from '@/features/reports/components/SpendingBars';
import { getReport } from '@/features/reports/reportsApi';
import { formatDayMonth, formatShortVnd, formatVnd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

const BAR_TITLE: Record<Period, string> = {
  week: 'Chi tiêu theo ngày',
  month: 'Chi tiêu theo tuần',
  year: 'Chi tiêu theo tháng',
};

const KIND_OPTIONS: { value: ReportKind; label: string; selectedColor: string; selectedBackground: string }[] = [
  { value: 'expense', label: 'Chi', selectedColor: colors.danger, selectedBackground: colors.dangerSoft },
  { value: 'income', label: 'Thu', selectedColor: colors.primary, selectedBackground: colors.primarySoft },
];

/** "Tuần này · 06/10 – 12/10/2026", "Tháng 10/2026", "Năm 2026" */
function periodLabel(r: Report) {
  if (r.period === 'week') {
    const range = `${formatDayMonth(r.from)} – ${formatDayMonth(r.to)}/${r.to.getFullYear()}`;
    return r.isCurrent ? `Tuần này · ${range}` : range;
  }
  if (r.period === 'month') return `Tháng ${r.from.getMonth() + 1}/${r.from.getFullYear()}`;
  return `Năm ${r.from.getFullYear()}`;
}

/** "↑ 12,5%" / "↓ 3%"; null (tháng trước bằng 0) → "—" */
function changeText(percent: number | null) {
  if (percent === null) return '—';
  const value = String(Math.abs(percent)).replace('.', ',');
  return percent === 0 ? '0%' : `${percent > 0 ? '↑' : '↓'} ${value}%`;
}

/** Chi tăng là xấu (đỏ), thu tăng là tốt (xanh) */
function changeColor(percent: number | null, goodWhenUp: boolean) {
  if (!percent) return colors.textMuted;
  return percent > 0 === goodWhenUp ? colors.primary : colors.danger;
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  // 0 = kỳ hiện tại, -1 = kỳ trước...; không cho xem kỳ sau kỳ hiện tại
  const [offset, setOffset] = useState(0);
  const [kind, setKind] = useState<ReportKind>('expense');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  // Đổi kỳ liên tục thì chỉ giữ kết quả của lần gọi mới nhất
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const r = await getReport(period, offset, kind);
      if (id === requestId.current) setReport(r);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [period, offset, kind]);

  // Tải lại khi quay về tab (có thể vừa thêm / sửa giao dịch) và khi đổi kỳ / loại
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setOffset(0);
    setSelectedSlice(null);
  };

  const shift = (delta: -1 | 1) => {
    setOffset((o) => Math.min(0, o + delta));
    setSelectedSlice(null);
  };

  const changeKind = (k: ReportKind) => {
    setKind(k);
    setSelectedSlice(null);
  };

  const isExpense = kind === 'expense';

  const slice = report?.slices.find((s) => s.key === selectedSlice) ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Báo cáo</Text>

        <View style={styles.segment}>
          <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={changePeriod} />
        </View>
        <View style={styles.periodRow}>
          <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Kỳ trước">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.periodLabel}>{report ? periodLabel(report) : ' '}</Text>
          <Pressable
            onPress={() => shift(1)}
            disabled={offset === 0}
            hitSlop={12}
            style={offset === 0 && styles.hidden}
            accessibilityRole="button"
            accessibilityLabel="Kỳ sau"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        {error && !loading ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
            <Text style={styles.empty}>Không tải được báo cáo. Kiểm tra kết nối mạng rồi thử lại.</Text>
            <Pressable onPress={load} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Thử lại</Text>
            </Pressable>
          </View>
        ) : !report ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <View style={loading && styles.reloading}>
            <View style={styles.totals}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Tổng thu</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]} adjustsFontSizeToFit numberOfLines={1}>
                  {formatVnd(report.totalIncome)}
                </Text>
                {report.change && (
                  <Text style={[styles.change, { color: changeColor(report.change.income, true) }]}>
                    {changeText(report.change.income)} so với T{Number(report.change.previousMonth.slice(5))}
                  </Text>
                )}
              </View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Tổng chi</Text>
                <Text style={[styles.totalValue, { color: colors.expense }]} adjustsFontSizeToFit numberOfLines={1}>
                  {formatVnd(report.totalExpense)}
                </Text>
                {report.change && (
                  <Text style={[styles.change, { color: changeColor(report.change.expense, false) }]}>
                    {changeText(report.change.expense)} so với T{Number(report.change.previousMonth.slice(5))}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{isExpense ? 'Chi tiêu' : 'Thu nhập'} theo danh mục</Text>
                <View style={styles.kindSwitch}>
                  <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={changeKind} />
                </View>
              </View>
              <View style={styles.donutRow}>
                <DonutChart
                  slices={report.slices}
                  selected={selectedSlice}
                  onSelect={(k) => setSelectedSlice(k === selectedSlice ? null : k)}
                />
                <View style={styles.donutSummary}>
                  <Text style={styles.summaryLabel}>{slice ? slice.name : isExpense ? 'Đã chi' : 'Đã thu'}</Text>
                  <Text style={styles.summaryValue} adjustsFontSizeToFit numberOfLines={1}>
                    {formatVnd(slice ? slice.amount : isExpense ? report.totalExpense : report.totalIncome)}
                  </Text>
                  {slice && <Text style={styles.summaryPercent}>{slice.percent}% tổng {isExpense ? 'chi' : 'thu'}</Text>}
                </View>
              </View>

              {report.slices.length === 0 ? (
                <Text style={styles.empty}>Chưa có khoản {isExpense ? 'chi' : 'thu'} nào trong kỳ này.</Text>
              ) : (
                // Chú thích kiêm bảng số liệu: tên, số tiền rút gọn, phần trăm
                <View style={styles.legend}>
                  {report.slices.map((s) => {
                    const dimmed = selectedSlice !== null && selectedSlice !== s.key;
                    return (
                      <Pressable
                        key={s.key}
                        style={[styles.legendRow, dimmed && styles.dimmed]}
                        onPress={() => setSelectedSlice(s.key === selectedSlice ? null : s.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${s.name}: ${formatVnd(s.amount)}, ${s.percent}%`}
                      >
                        <View style={[styles.swatch, { backgroundColor: s.color }]} />
                        <Text style={styles.legendName} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text style={styles.legendAmount}>{formatShortVnd(s.amount)}</Text>
                        <Text style={styles.legendPercent}>{s.percent}%</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{BAR_TITLE[report.period]}</Text>
              <View style={styles.bars}>
                {/* key theo kỳ để bỏ cột đang chọn khi đổi kỳ */}
                <SpendingBars key={report.period} buckets={report.buckets} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  segment: { marginTop: spacing.md },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
  periodLabel: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  hidden: { opacity: 0 },
  errorBox: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  change: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  kindSwitch: { width: 120 },
  loading: { marginTop: spacing.xl },
  reloading: { opacity: 0.5 },
  totals: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.md },
  totalCard: {
    flex: 1,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.md - 4,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  totalLabel: { fontSize: 13, color: colors.textMuted },
  totalValue: { marginTop: 2, fontSize: 19, fontWeight: '800' },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  donutSummary: { flex: 1 },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { marginTop: 2, fontSize: 22, fontWeight: '800', color: colors.text },
  summaryPercent: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  empty: { marginTop: spacing.md, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  legend: { marginTop: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: spacing.sm },
  dimmed: { opacity: 0.4 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  legendName: { flex: 1, fontSize: 15, color: colors.text },
  legendAmount: { width: 64, textAlign: 'right', fontSize: 14, color: colors.textMuted },
  legendPercent: { width: 48, textAlign: 'right', fontSize: 15, fontWeight: '700', color: colors.text },
  bars: { marginTop: spacing.md },
});
