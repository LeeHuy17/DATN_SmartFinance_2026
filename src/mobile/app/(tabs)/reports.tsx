import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { SegmentedControl } from '@/components/SegmentedControl';
import type { Period, Report } from '@/features/reports/aggregate';
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

/** "06/10 – 12/10/2026", "Tháng 10/2026", "Năm 2026" */
function periodLabel(r: Report) {
  if (r.period === 'week') return `Tuần này · ${formatDayMonth(r.from)} – ${formatDayMonth(r.to)}/${r.to.getFullYear()}`;
  if (r.period === 'month') return `Tháng ${r.from.getMonth() + 1}/${r.from.getFullYear()}`;
  return `Năm ${r.from.getFullYear()}`;
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setReport(await getReport(p));
    setLoading(false);
  }, []);

  // Tải lại khi quay về tab (có thể vừa thêm / sửa giao dịch) và khi đổi kỳ
  useFocusEffect(
    useCallback(() => {
      load(period);
    }, [load, period]),
  );

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setSelectedSlice(null);
  };

  const slice = report?.slices.find((s) => s.key === selectedSlice) ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Báo cáo</Text>

        <View style={styles.segment}>
          <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={changePeriod} />
        </View>
        {report && <Text style={styles.periodLabel}>{periodLabel(report)}</Text>}

        {!report ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <View style={loading && styles.reloading}>
            <View style={styles.totals}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Tổng thu</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]} adjustsFontSizeToFit numberOfLines={1}>
                  {formatVnd(report.totalIncome)}
                </Text>
              </View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Tổng chi</Text>
                <Text style={[styles.totalValue, { color: colors.expense }]} adjustsFontSizeToFit numberOfLines={1}>
                  {formatVnd(report.totalExpense)}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Chi tiêu theo danh mục</Text>
              <View style={styles.donutRow}>
                <DonutChart
                  slices={report.slices}
                  selected={selectedSlice}
                  onSelect={(k) => setSelectedSlice(k === selectedSlice ? null : k)}
                />
                <View style={styles.donutSummary}>
                  <Text style={styles.summaryLabel}>{slice ? slice.name : 'Đã chi'}</Text>
                  <Text style={styles.summaryValue} adjustsFontSizeToFit numberOfLines={1}>
                    {formatVnd(slice ? slice.amount : report.totalExpense)}
                  </Text>
                  {slice && <Text style={styles.summaryPercent}>{slice.percent}% tổng chi</Text>}
                </View>
              </View>

              {report.slices.length === 0 ? (
                <Text style={styles.empty}>Chưa có khoản chi nào trong kỳ này.</Text>
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
  periodLabel: { marginTop: spacing.sm, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
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
  empty: { marginTop: spacing.md, fontSize: 14, color: colors.textMuted },
  legend: { marginTop: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: spacing.sm },
  dimmed: { opacity: 0.4 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  legendName: { flex: 1, fontSize: 15, color: colors.text },
  legendAmount: { width: 64, textAlign: 'right', fontSize: 14, color: colors.textMuted },
  legendPercent: { width: 48, textAlign: 'right', fontSize: 15, fontWeight: '700', color: colors.text },
  bars: { marginTop: spacing.md },
});
