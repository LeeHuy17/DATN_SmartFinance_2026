import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

// Trùng với backgroundColor của expo-splash-screen trong app.json và lớp nền của file Lottie
export const SPLASH_BACKGROUND = '#FFFFFF';

// Animation dài ~2,9s; quá thời gian này mà chưa báo xong (file lỗi, máy chậm) thì vẫn cho qua
const MAX_DURATION_MS = 4500;
const FADE_OUT_MS = 250;

type Props = {
  /** Lottie đã sẵn sàng (hoặc lỗi) → có thể ẩn splash tĩnh của hệ điều hành */
  onLoaded: () => void;
  /** Animation đã chạy xong */
  onFinish: () => void;
  /** Khi true: mờ dần rồi gọi onHidden để gỡ lớp splash khỏi cây giao diện */
  hiding: boolean;
  onHidden: () => void;
};

export function AnimatedSplash({ onLoaded, onFinish, hiding, onHidden }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      onLoaded();
      onFinish();
    }, MAX_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onLoaded, onFinish]);

  useEffect(() => {
    if (!hiding) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      // Web không có native driver, dùng JS để tránh cảnh báo
      useNativeDriver: Platform.OS !== 'web',
    }).start(onHidden);
  }, [hiding, opacity, onHidden]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <LottieView
        source={require('../../assets/splash-animation.json')}
        autoPlay
        loop={false}
        // File Lottie là nguyên khung màn hình điện thoại nên phủ kín, nội dung vẫn nằm giữa
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        onAnimationLoaded={onLoaded}
        onAnimationFailure={() => {
          onLoaded();
          onFinish();
        }}
        onAnimationFinish={(isCancelled) => {
          if (!isCancelled) onFinish();
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BACKGROUND,
    // Không chặn chạm vào màn hình bên dưới trong lúc đang mờ dần
    pointerEvents: 'none',
  },
});
