import { Stack } from 'expo-router';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';

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

  // Chờ đọc token xong mới dựng điều hướng, tránh nháy màn hình sai
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Chưa đăng nhập: chỉ vào được màn hình xác thực, mọi đường dẫn khác chuyển về /login */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
      </Stack.Protected>

      {/* Đã đăng nhập: vào ứng dụng chính */}
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction/add" />
        <Stack.Screen name="transaction/preview" />
      </Stack.Protected>
    </Stack>
  );
}
