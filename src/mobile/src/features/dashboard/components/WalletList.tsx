import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Wallet, WalletType } from '@/features/transactions/types';
import { formatVnd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const TYPE_LABEL: Record<WalletType, string> = {
  cash: 'Số dư',
  bank: 'Ngân hàng',
  ewallet: 'Ví điện tử',
};

// Tiền mặt: thẻ trắng viền mảnh; ngân hàng và ví điện tử: thẻ màu, chữ trắng
const TYPE_STYLE: Record<WalletType, { bg: string; fg: string; border?: string }> = {
  cash: { bg: colors.background, fg: colors.text, border: colors.divider },
  bank: { bg: colors.walletBank, fg: colors.onPrimary },
  ewallet: { bg: colors.walletEwallet, fg: colors.onPrimary },
};

export function WalletList({ wallets }: { wallets: Wallet[] }) {
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
        const look = TYPE_STYLE[wallet.type];
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
              {formatVnd(wallet.balance)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export const WALLET_CARD_WIDTH = 150;

const styles = StyleSheet.create({
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
});
