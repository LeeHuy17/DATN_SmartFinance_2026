import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing } from '@/theme';

/** Nút viền (hành động phụ) theo thiết kế */
function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondary} onPress={onPress} accessibilityRole="button">
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

/** Đang phân tích: thẻ xanh nhạt có vòng xoay + 2 thẻ khung chờ nhấp nháy */
export function AdviceLoading() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const native = Platform.OS !== 'web';
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: native }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: native }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const bone = (w: DimensionValue, h: number) => (
    <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: colors.surfaceMuted }} />
  );

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Đang phân tích chi tiêu">
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTitle}>Đang phân tích chi tiêu...</Text>
        <Text style={styles.loadingText}>Trợ lý AI đang đọc dữ liệu tổng hợp của bạn.</Text>
      </View>
      <Animated.View style={{ opacity }}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.card, styles.skeletonCard]}>
            {bone(i === 0 ? '40%' : '50%', 14)}
            {bone('100%', 10)}
            {bone(i === 0 ? '85%' : '100%', 10)}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

type EmptyProps = {
  /** Số giao dịch đã có trong tháng và số tối thiểu để AI phân tích (từ insufficient_data của server) */
  transactions: number;
  minTransactions: number;
  onAdd: () => void;
  onScan: () => void;
};

/** Chưa đủ dữ liệu: cho biết cần thêm bao nhiêu giao dịch */
export function AdviceEmpty({ transactions, minTransactions, onAdd, onScan }: EmptyProps) {
  const needed = Math.max(1, minTransactions - transactions);
  return (
    <View style={styles.empty}>
      <View style={[styles.circle, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="sparkles-outline" size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Cần thêm {needed} giao dịch</Text>
      <Text style={styles.emptyText}>
        Tháng này mới có {transactions}/{minTransactions} giao dịch. Hãy ghi thêm để AI đưa ra nhận xét và
        lời khuyên sát với thói quen của bạn.
      </Text>
      <PrimaryButton title="Thêm giao dịch" onPress={onAdd} style={styles.stretch} />
      <SecondaryButton title="Quét hóa đơn" onPress={onScan} />
    </View>
  );
}

/** Dải vàng báo một việc không làm được (vd. phân tích quá nhiều lần) trong khi kết quả cũ vẫn hiển thị */
export function NoticeBanner({ text }: { text: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={18} color={colors.warm} />
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
}

/** Không lấy được lời khuyên (mất mạng, server lỗi, quá giới hạn): thử lại hoặc xem báo cáo (không cần AI) */
export function AdviceError({
  message,
  onRetry,
  onReports,
}: {
  message?: string | null;
  onRetry: () => void;
  onReports: () => void;
}) {
  return (
    <View style={[styles.card, styles.errorCard]}>
      <View style={[styles.circle, styles.circleSmall, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
      </View>
      <Text style={styles.errorTitle}>Chưa tải được lời khuyên</Text>
      <Text style={styles.errorText}>
        {message ?? 'Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại sau ít phút.'}
      </Text>
      <PrimaryButton title="Thử lại" onPress={onRetry} style={styles.stretch} />
      <SecondaryButton title="Xem báo cáo" onPress={onReports} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  skeletonCard: { gap: spacing.md - 2 },
  loadingCard: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  loadingTitle: { marginTop: spacing.md, fontSize: 16, fontWeight: '700', color: colors.text },
  loadingText: { marginTop: spacing.xs, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, gap: spacing.sm + 2 },
  circle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  circleSmall: { width: 64, height: 64, borderRadius: 32 },
  emptyTitle: { marginTop: spacing.sm, fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  stretch: { alignSelf: 'stretch' },
  secondary: {
    alignSelf: 'stretch',
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '700', color: colors.text },
  banner: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    padding: spacing.md - 2,
    borderRadius: radius.lg,
    backgroundColor: colors.warmSoft,
  },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.warm },
  errorCard: { alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.lg },
  errorTitle: { marginTop: spacing.xs, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  errorText: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xs },
});
