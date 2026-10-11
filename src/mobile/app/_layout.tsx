import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplash, SPLASH_BACKGROUND } from '@/components/AnimatedSplash';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';

// Giữ splash tĩnh của hệ điều hành cho tới khi splash động (Lottie) sẵn sàng thay thế
SplashScreen.preventAutoHideAsync().catch(() => {});

// TODO: bọc thêm Provider (React Query, theme)
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isLoading, isSignedIn } = useAuth();
  const [animationDone, setAnimationDone] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  const handleAnimationFinish = useCallback(() => setAnimationDone(true), []);
  const handleSplashHidden = useCallback(() => setSplashVisible(false), []);

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }}>
      {/* Dựng điều hướng ngay khi đọc xong token, nằm bên dưới lớp splash động */}
      {!isLoading && (
        <Stack screenOptions={{ headerShown: false }}>
          {/* Chưa đăng nhập: chỉ vào được màn hình xác thực, mọi đường dẫn khác chuyển về /login */}
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/register" />
            <Stack.Screen name="(auth)/register-success" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(auth)/forgot-password" />
            <Stack.Screen name="(auth)/verify-otp" />
            <Stack.Screen name="(auth)/reset-password" />
            <Stack.Screen name="(auth)/reset-success" options={{ gestureEnabled: false }} />
          </Stack.Protected>

          {/* Đã đăng nhập: vào ứng dụng chính */}
          <Stack.Protected guard={isSignedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="transaction/add" />
            <Stack.Screen name="transaction/preview" />
            <Stack.Screen name="transactions" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="categories/index" />
            <Stack.Screen name="categories/edit" />
          </Stack.Protected>
        </Stack>
      )}

      {/* Chỉ ẩn splash khi animation đã chạy hết VÀ đã biết trạng thái đăng nhập */}
      {splashVisible && (
        <AnimatedSplash
          onLoaded={hideNativeSplash}
          onFinish={handleAnimationFinish}
          hiding={animationDone && !isLoading}
          onHidden={handleSplashHidden}
        />
      )}
    </View>
  );
}
