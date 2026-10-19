import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { BalanceCard } from '@/features/dashboard/components/BalanceCard';
import { BudgetAlertCard } from '@/features/dashboard/components/BudgetAlertCard';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { SectionHeader } from '@/features/dashboard/components/SectionHeader';
import { WalletList } from '@/features/dashboard/components/WalletList';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import { useTransactionQuickView } from '@/features/transactions/useTransactionQuickView';
import { colors, radius, spacing } from '@/theme';

export default function OverviewScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh, retry, reload } = useDashboard();
  const quickView = useTransactionQuickView(reload);

  const renderContent = () => {
    if (loading) return <DashboardSkeleton />;

    if (error || !data) {
      return (
        <View style={styles.error}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
          <Text style={styles.errorText}>Kiểm tra kết nối mạng rồi thử lại.</Text>
          <PrimaryButton title="Thử lại" onPress={retry} style={styles.retry} />
        </View>
      );
    }

    return (
      <>
        <DashboardHeader
          displayName={data.displayName}
          avatarUri={data.avatarUri}
          unreadNotifications={data.unreadNotifications}
          onPressProfile={() => router.push('/profile')}
          onPressNotifications={() => router.push('/notifications')}
        />

        <BalanceCard
          totalBalance={data.totalBalance}
          walletCount={data.walletCount}
          month={data.month}
          monthIncome={data.monthIncome}
          monthExpense={data.monthExpense}
        />

        <BudgetAlertCard alerts={data.budgetAlerts} onPress={() => router.navigate('/advice')} />

        {/* Viền xanh nền trắng để tách biệt với thẻ số dư */}
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() => router.push('/transaction/add')}
          accessibilityRole="button"
        >
          <View style={styles.addIcon}>
            <Ionicons name="add" size={18} color={colors.onPrimary} />
          </View>
          <Text style={styles.addText}>Nhập Thu/Chi</Text>
        </Pressable>

        <SectionHeader
          title="Ví của tôi"
          actionLabel="Quản lý"
          onPressAction={() => router.navigate('/wallets')}
        />
        <WalletList wallets={data.wallets} />

        <SectionHeader
          title="Giao dịch gần đây"
          actionLabel="Xem tất cả"
          chevron
          onPressAction={() => router.push('/transactions')}
        />
        {data.recentTransactions.length === 0 ? (
          <Text style={styles.empty}>
            Chưa có giao dịch nào. Quét hóa đơn hoặc bấm "Nhập Thu/Chi" để bắt đầu theo dõi chi tiêu.
          </Text>
        ) : (
          data.recentTransactions.map((item, i) => (
            <TransactionItem
              key={item.id}
              item={item}
              divider={i < data.recentTransactions.length - 1}
              onPress={quickView.open}
            />
          ))
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          data ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {renderContent()}
      </ScrollView>
      {quickView.element}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  addButton: {
    marginTop: spacing.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  addButtonPressed: { backgroundColor: colors.primarySoft },
  addIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  empty: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  errorTitle: { marginTop: spacing.sm, fontSize: 17, fontWeight: '700', color: colors.text },
  errorText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  retry: { marginTop: spacing.md, alignSelf: 'stretch' },
});
