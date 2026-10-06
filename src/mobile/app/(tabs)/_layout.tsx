import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Tổng quan' }} />
      <Tabs.Screen name="reports" options={{ title: 'Báo cáo' }} />
      <Tabs.Screen name="scan" options={{ title: 'Quét' }} />
      <Tabs.Screen name="advice" options={{ title: 'Lời khuyên' }} />
      <Tabs.Screen name="wallets" options={{ title: 'Ví' }} />
    </Tabs>
  );
}
