import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Bucket } from '@/features/reports/aggregate';
import { formatShortVnd } from '@/lib/format';
import { makeStyles, spacing, useColors } from '@/theme';

const PLOT_HEIGHT = 140;
const MAX_BAR_WIDTH = 24;
/** Cột của kỳ khác: cùng tông xanh nhưng nhạt, để cột kỳ hiện tại nổi bật */
const BAR_MUTED = '#9FC8B5';

/**
 * Biểu đồ cột một chuỗi: chi tiêu theo ngày / tuần / tháng.
 * Chạm vào cột để xem số tiền (mặc định hiện ở cột của kỳ hiện tại).
 */
export function SpendingBars({ buckets }: { buckets: Bucket[] }) {
  const styles = useStyles();
  const colors = useColors();
  const max = Math.max(...buckets.map((b) => b.amount), 0);
  const currentIndex = buckets.findIndex((b) => b.current);
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked ?? (currentIndex >= 0 ? currentIndex : null);

  return (
    <View>
      <View style={styles.plot}>
        {buckets.map((b, i) => {
          const height = max > 0 ? Math.max((b.amount / max) * (PLOT_HEIGHT - 22), b.amount > 0 ? 4 : 0) : 0;
          return (
            // Cả cột dọc là vùng chạm, rộng hơn thanh cột
            <Pressable
              key={b.label}
              style={styles.slot}
              onPress={() => setPicked(i === picked ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={`${b.label}: ${formatShortVnd(b.amount)}`}
            >
              {shown === i && <Text style={styles.value}>{b.amount > 0 ? formatShortVnd(b.amount) : '0đ'}</Text>}
              <View
                style={[
                  styles.bar,
                  { height, backgroundColor: b.current ? colors.primary : BAR_MUTED },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.baseline} />
      <View style={styles.labels}>
        {buckets.map((b) => (
          <Text key={b.label} style={[styles.label, b.current && styles.labelCurrent]} numberOfLines={1}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  plot: { height: PLOT_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: '60%',
    maxWidth: MAX_BAR_WIDTH,
    // Bo đầu cột, vuông ở đáy
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  value: { marginBottom: spacing.xs, fontSize: 11, fontWeight: '700', color: colors.text },
  baseline: { height: 1, backgroundColor: colors.divider },
  labels: { flexDirection: 'row', marginTop: spacing.sm },
  label: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.textMuted },
  labelCurrent: { fontWeight: '700', color: colors.text },
}));
