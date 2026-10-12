import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  cycleMockMode,
  getAdvice,
  getMockMode,
  type Advice,
  type MockMode,
} from '@/features/advice/adviceApi';
import { listBudgetUsage } from '@/features/advice/budgetsApi';
import { AdviceEmpty, AdviceError, AdviceLoading, OfflineBanner } from '@/features/advice/components/AdviceStates';
import { BudgetCard } from '@/features/advice/components/BudgetCard';
import { BudgetSheet } from '@/features/advice/components/BudgetSheet';
import type { BudgetUsage } from '@/features/advice/summary';
import { colors, radius, spacing } from '@/theme';

type Phase =
  | { kind: 'loading' }
  | { kind: 'ok'; advice: Advice }
  | { kind: 'insufficient' }
  | { kind: 'error' };

const MOCK_LABEL: Record<MockMode, string> = {
  auto: 'Giả lập: bình thường',
  offline: 'Giả lập: AI ngoại tuyến',
  insufficient: 'Giả lập: chưa đủ dữ liệu',
};

export default function AdviceScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [budgets, setBudgets] = useState<BudgetUsage[]>([]);
  const [budgetSheet, setBudgetSheet] = useState(false);
  const [mockMode, setMockMode] = useState<MockMode>(getMockMode());
  const month = new Date().getMonth() + 1;

  const analyze = useCallback(async () => {
    setPhase({ kind: 'loading' });
    try {
      const result = await getAdvice();
      setPhase(result.status === 'ok' ? { kind: 'ok', advice: result.advice } : { kind: 'insufficient' });
    } catch {
      // AdviceUnavailableError hay lỗi mạng khác đều hiện trạng thái "AI ngoại tuyến"
      setPhase({ kind: 'error' });
    }
  }, []);

  const loadBudgets = useCallback(() => {
    listBudgetUsage().then(setBudgets);
  }, []);

  // Gọi AI khi mở tab lần đầu và khi bấm làm mới (không gọi lại mỗi lần chuyển tab)
  useEffect(() => {
    analyze();
  }, [analyze]);

  // Ngân sách tính ở app nên tải lại mỗi khi quay về tab
  useFocusEffect(loadBudgets);

  // Chỉ trong bản dev: giữ tay lên tiêu đề để chuyển trạng thái giả lập, phục vụ test giao diện
  const switchMockMode = () => {
    if (!__DEV__) return;
    setMockMode(cycleMockMode());
    analyze();
  };

  const renderBody = () => {
    switch (phase.kind) {
      case 'loading':
        return <AdviceLoading />;
      case 'insufficient':
        return (
          <AdviceEmpty
            onAdd={() => router.push('/transaction/add')}
            onScan={() => router.navigate('/scan')}
          />
        );
      case 'error':
        return (
          <>
            <OfflineBanner />
            <AdviceError onRetry={analyze} onReports={() => router.navigate('/reports')} />
            <BudgetCard month={month} budgets={budgets} />
          </>
        );
      case 'ok':
        return (
          <>
            <View style={styles.insight}>
              <View style={styles.insightHeader}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={styles.insightTitle}>Nhận xét tháng {phase.advice.month}</Text>
              </View>
              <Text style={styles.insightText}>{phase.advice.insight}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Gợi ý hành động</Text>
              {phase.advice.actions.map((a, i) => (
                <View key={a} style={styles.action}>
                  <View style={styles.actionNumber}>
                    <Text style={styles.actionNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.actionText}>{a}</Text>
                </View>
              ))}
            </View>

            <BudgetCard month={month} budgets={budgets} onSetup={() => setBudgetSheet(true)} />

            <View style={styles.note}>
              <Ionicons name="ellipse-outline" size={8} color={colors.textMuted} style={styles.noteDot} />
              <Text style={styles.noteText}>
                Chỉ gửi dữ liệu chi tiêu tổng hợp tới AI, không gửi thông tin cá nhân. Lời khuyên mang tính tham khảo.
              </Text>
            </View>
          </>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onLongPress={switchMockMode} delayLongPress={600} style={styles.flex}>
            <Text style={styles.title}>Lời khuyên AI</Text>
            {__DEV__ && mockMode !== 'auto' && <Text style={styles.mockBadge}>{MOCK_LABEL[mockMode]}</Text>}
          </Pressable>
          {phase.kind === 'ok' && (
            <Pressable
              style={styles.refresh}
              onPress={analyze}
              accessibilityRole="button"
              accessibilityLabel="Phân tích lại"
            >
              <Ionicons name="refresh" size={22} color={colors.text} />
            </Pressable>
          )}
        </View>

        {renderBody()}
      </ScrollView>

      <BudgetSheet
        visible={budgetSheet}
        onClose={() => setBudgetSheet(false)}
        onSaved={() => {
          setBudgetSheet(false);
          loadBudgets();
          // Nhận xét có nhắc tới ngân sách nên phân tích lại theo hạn mức mới
          analyze();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  mockBadge: { marginTop: 2, fontSize: 12, fontWeight: '600', color: colors.warm },
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
  insight: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  insightTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  insightText: { marginTop: spacing.sm, fontSize: 16, lineHeight: 24, color: colors.text },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  cardLabel: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  action: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.md - 2 },
  actionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionNumberText: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },
  actionText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.xs },
  noteDot: { marginTop: 6 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textMuted },
});
