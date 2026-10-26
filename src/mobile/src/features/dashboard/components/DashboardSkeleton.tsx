import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, View, type DimensionValue } from 'react-native';

import { makeStyles, radius, spacing, useColors } from '@/theme';
import { WALLET_CARD_WIDTH } from './WalletList';

/** Khối xám giữ chỗ */
function Bone({
  w,
  h,
  r = h / 2,
  color,
}: {
  w: DimensionValue;
  h: number;
  r?: number;
  color?: string;
}) {
  const colors = useColors();
  return <View style={{ width: w, height: h, borderRadius: r, backgroundColor: color ?? colors.skeleton }} />;
}

const ON_CARD = 'rgba(255,255,255,0.3)';
const ON_CARD_SOFT = 'rgba(255,255,255,0.2)';

/** Khung chờ của màn hình Tổng quan, nhấp nháy nhẹ trong lúc tải */
export function DashboardSkeleton() {
  const styles = useStyles();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const native = Platform.OS !== 'web';
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: native }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: native }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View accessibilityLabel="Đang tải dữ liệu" accessibilityRole="progressbar">
      <Animated.View style={{ opacity }}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Bone w={90} h={12} />
            <Bone w={120} h={18} />
          </View>
          <Bone w={44} h={44} />
        </View>

        <View style={styles.card}>
          <Bone w={110} h={12} color={ON_CARD} />
          <Bone w="70%" h={30} r={10} color={ON_CARD} />
          <View style={styles.cardStats}>
            <View style={styles.flex}>
              <Bone w="100%" h={52} r={radius.lg} color={ON_CARD_SOFT} />
            </View>
            <View style={styles.flex}>
              <Bone w="100%" h={52} r={radius.lg} color={ON_CARD_SOFT} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Bone w={100} h={16} />
        </View>
        <View style={styles.wallets}>
          {[0, 1, 2].map((i) => (
            <Bone key={i} w={WALLET_CARD_WIDTH} h={92} r={radius.lg} />
          ))}
        </View>

        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.row}>
              <Bone w={44} h={44} r={radius.md} />
              <View style={styles.rowTexts}>
                <Bone w="75%" h={14} />
                <Bone w="45%" h={10} />
              </View>
              <Bone w={64} h={14} />
            </View>
          ))}
        </View>
      </Animated.View>

      <Text style={styles.loadingText}>Đang tải dữ liệu…</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTexts: { flex: 1, gap: spacing.sm },
  card: {
    marginTop: spacing.lg,
    padding: 20,
    gap: spacing.md - 4,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  cardStats: { flexDirection: 'row', gap: spacing.md - 4, marginTop: spacing.xs },
  section: { marginTop: spacing.lg, marginBottom: spacing.md - 4 },
  wallets: { flexDirection: 'row', gap: spacing.sm + 2, overflow: 'hidden', marginRight: -spacing.lg },
  list: { marginTop: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  rowTexts: { flex: 1, gap: spacing.sm },
  loadingText: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
}));
