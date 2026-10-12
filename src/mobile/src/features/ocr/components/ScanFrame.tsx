import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { scanColors } from '@/features/ocr/scanTheme';

type Props = {
  width: number;
  height: number;
  /** Chạy vạch quét (tắt khi đang chụp hoặc chưa có camera) */
  scanning: boolean;
  children?: ReactNode;
};

const ARM = 46;
const STROKE = 4;
const CORNER_RADIUS = 18;

/** Khung ngắm: 4 góc chữ L bo tròn và vạch quét chạy lên xuống */
export function ScanFrame({ width, height, scanning, children }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanning) return;
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(progress, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height * 0.08, height * 0.92] });

  return (
    <View style={{ width, height }}>
      {children}

      {scanning && <Animated.View style={[styles.line, { transform: [{ translateY }] }]} />}

      {/* Bốn góc: mỗi góc là một ô vuông chỉ có 2 cạnh viền */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    top: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: scanColors.scanLine,
    boxShadow: `0 0 12px ${scanColors.scanLine}`,
  },
  corner: { position: 'absolute', width: ARM, height: ARM, borderColor: scanColors.onDark },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopRightRadius: CORNER_RADIUS,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: CORNER_RADIUS,
  },
});
