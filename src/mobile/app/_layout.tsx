import { Stack } from 'expo-router';

// TODO: bọc Provider (React Query, theme) và kiểm tra token để điều hướng (auth)/(tabs)
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
