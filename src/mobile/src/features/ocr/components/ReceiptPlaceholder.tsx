import { StyleSheet, View, type DimensionValue } from 'react-native';

import { scanColors } from '@/features/ocr/scanTheme';

/** Hình minh họa hóa đơn trong khung khi chưa có hình từ camera */
export function ReceiptPlaceholder() {
  const line = (w: DimensionValue, h = 8) => (
    <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: scanColors.receiptLine }} />
  );

  return (
    <View style={styles.fill}>
      <View style={styles.receipt}>
        <View style={styles.lines}>
          {line('48%', 10)}
          {line('72%')}
          {line('64%')}
          {line('68%')}
        </View>
        <View style={styles.total}>{line('40%', 9)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: scanColors.frameFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receipt: {
    width: '67%',
    height: '73%',
    padding: '7%',
    borderRadius: 8,
    backgroundColor: scanColors.receipt,
    justifyContent: 'space-between',
  },
  lines: { gap: 10 },
  total: { alignItems: 'flex-end' },
});
