import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, useColors } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Nút hành động cố định ở đáy bảng */
  footer?: ReactNode;
};

/** Kéo xuống quá ngưỡng này (px) hoặc vuốt nhanh hơn tốc độ này thì đóng */
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 0.8;

/** Bảng trượt từ dưới lên: thanh kéo, tiêu đề, nút đóng; chạm nền tối hoặc vuốt xuống để đóng */
export function BottomSheet({ visible, title, onClose, children, footer }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Tự điều khiển hiệu ứng (Modal không animate) để nền tối mờ dần tại chỗ, không trôi theo khung
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, screenHeight * 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: screenHeight, duration: 200, useNativeDriver: true }).start(() =>
        setMounted(false),
      );
    }
  }, [visible, translateY, screenHeight]);

  // Vuốt xuống ở phần đầu bảng (thanh kéo + tiêu đề); phần nội dung vẫn cuộn bình thường
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
            Animated.timing(translateY, {
              toValue: screenHeight,
              duration: 200,
              useNativeDriver: true,
            }).start(() => onCloseRef.current());
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        },
      }),
    [translateY, screenHeight],
  );

  return (
    <Modal visible={visible || mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Đóng" />
        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md), transform: [{ translateY }] }]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.md - 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { paddingHorizontal: spacing.lg - 4, paddingBottom: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.md - 4,
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.md - 4,
  },
}));
