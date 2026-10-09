import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Tổng quan' }} />
      <Tabs.Screen name="reports" options={{ title: 'Báo cáo' }} />
      <Tabs.Screen name="scan" options={{ title: 'Quét' }} />
      <Tabs.Screen name="advice" options={{ title: 'Lời khuyên' }} />
      <Tabs.Screen name="wallets" options={{ title: 'Ví' }} />
    </Tabs>
  );
}
