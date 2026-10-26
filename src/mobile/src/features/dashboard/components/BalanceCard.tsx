import { Text, View } from 'react-native';

import { formatBalance, formatVnd } from '@/lib/format';
import { makeStyles, radius, spacing } from '@/theme';

type Props = {
  totalBalance: number;
  walletCount: number;
  month: number;
  monthIncome: number;
  monthExpense: number;
};

export function BalanceCard({ totalBalance, walletCount, month, monthIncome, monthExpense }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Tổng số dư ({walletCount} ví)</Text>
      <Text style={styles.total} adjustsFontSizeToFit numberOfLines={1}>
        {formatBalance(totalBalance)}
      </Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Thu tháng {month}</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatVnd(monthIncome)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Chi tháng {month}</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatVnd(monthExpense)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    marginTop: spacing.lg,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  total: { marginTop: spacing.xs, fontSize: 34, fontWeight: '800', color: colors.onPrimary },
  stats: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.md },
  stat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.md - 4,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  statValue: { marginTop: 2, fontSize: 16, fontWeight: '700', color: colors.onPrimary },
}));
