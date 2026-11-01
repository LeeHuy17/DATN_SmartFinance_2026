import { ScrollView, Text, View } from 'react-native';

import type { Wallet, WalletType } from '@/features/transactions/types';
import { formatBalance } from '@/lib/format';
import { makeStyles, radius, spacing, useColors, type Colors } from '@/theme';

const TYPE_LABEL: Record<WalletType, string> = {
  cash: 'Số dư',
  bank: 'Ngân hàng',
  ewallet: 'Ví điện tử',
  credit: 'Thẻ tín dụng',
  savings: 'Tiết kiệm',
};

// Tiền mặt, tiết kiệm: thẻ trắng viền mảnh; các loại còn lại: thẻ màu, chữ trắng
const typeStyles = (colors: Colors): Record<WalletType, { bg: string; fg: string; border?: string }> => ({
  cash: { bg: colors.background, fg: colors.text, border: colors.divider },
  bank: { bg: colors.walletBank, fg: colors.onPrimary },
  ewallet: { bg: colors.walletEwallet, fg: colors.onPrimary },
  credit: { bg: colors.inverseSurface, fg: colors.onInverseSurface },
  savings: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
});

export function WalletList({ wallets }: { wallets: Wallet[] }) {
  const styles = useStyles();
  const colors = useColors();
  if (wallets.length === 0) {
    return <Text style={styles.empty}>Chưa có ví nào. Bấm "Quản lý" để thêm ví đầu tiên.</Text>;
  }

  return (
    // Cho danh sách tràn ra hai mép màn hình, gợi ý là cuộn ngang được
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {wallets.map((wallet) => {
        const look = typeStyles(colors)[wallet.type];
        return (
          <View
            key={wallet.id}
            style={[
              styles.card,
              { backgroundColor: look.bg },
              look.border && { borderWidth: 1, borderColor: look.border },
            ]}
          >
            <Text style={[styles.name, { color: look.fg }]} numberOfLines={1}>
              {wallet.name}
            </Text>
            <Text style={[styles.type, { color: look.fg }]}>{TYPE_LABEL[wallet.type]}</Text>
            <Text
              style={[styles.balance, { color: look.fg }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatBalance(wallet.balance)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export const WALLET_CARD_WIDTH = 150;

const useStyles = makeStyles((colors) => ({
  scroll: { marginHorizontal: -spacing.lg },
  content: { paddingHorizontal: spacing.lg, gap: spacing.sm + 2 },
  card: {
    width: WALLET_CARD_WIDTH,
    height: 100,
    padding: 14,
    borderRadius: radius.lg,
    justifyContent: 'space-between',
  },
  name: { fontSize: 15, fontWeight: '700' },
  type: { fontSize: 13, opacity: 0.85 },
  balance: { fontSize: 18, fontWeight: '800' },
  empty: { fontSize: 14, color: colors.textMuted },
}));
