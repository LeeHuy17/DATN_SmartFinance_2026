import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SegmentedControl } from '@/components/SegmentedControl';
import { listBudgetAlerts, type Budget } from '@/features/budgets/budgetsApi';
import { lookOf } from '@/features/notifications/notificationLook';
import {
  clearAllForDemo,
  getNotifications,
  markAllRead,
  markRead,
  type AppNotification,
} from '@/features/notifications/notificationsStore';
import { formatDayMonth, formatRelativeDay, formatTime, formatVnd } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

type Tab = 'all' | 'unread';

const isToday = (iso: string) => formatRelativeDay(iso) === 'Hôm nay';

/** Giờ cho thông báo hôm nay, "Hôm qua", còn lại dd/MM */
function timeLabel(iso: string) {
  const rel = formatRelativeDay(iso);
  if (rel === 'Hôm nay') return formatTime(iso);
  return rel === 'Hôm qua' ? rel : formatDayMonth(iso);
}

export default function InboxScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [budgetAlerts, setBudgetAlerts] = useState<Budget[]>([]);

  const reload = useCallback(() => setItems(getNotifications()), []);
  useFocusEffect(reload);

  // Tình trạng ngân sách hiện tại (server tính), không phải thông báo lưu trong Hộp thư
  useFocusEffect(
    useCallback(() => {
      listBudgetAlerts()
        .then(setBudgetAlerts)
        .catch(() => setBudgetAlerts([]));
    }, []),
  );

  const unread = items.filter((n) => !n.read).length;
  const shown = tab === 'unread' ? items.filter((n) => !n.read) : items;
  const today = shown.filter((n) => isToday(n.createdAt));
  const earlier = shown.filter((n) => !isToday(n.createdAt));

  const open = (n: AppNotification) => {
    markRead(n.id);
    reload();
    if (n.link) router.push(n.link);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const renderBudgetAlerts = () =>
    budgetAlerts.length > 0 && (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>NGÂN SÁCH THÁNG NÀY</Text>
        <View style={styles.card}>
          {budgetAlerts.map((b, i) => {
            const exceeded = b.status === 'exceeded';
            const look = lookOf({ type: 'budget', tone: exceeded ? 'danger' : undefined });
            const title = exceeded ? `Đã vượt ngân sách ${b.name}` : `${b.name} đã dùng ${Math.round(b.percent)}% ngân sách`;
            const body = exceeded
              ? `Vượt ${formatVnd(b.remaining)} so với hạn mức ${formatVnd(b.amount)}.`
              : `Đã chi ${formatVnd(b.spent)} / ${formatVnd(b.amount)}, còn ${formatVnd(b.remaining)}.`;
            return (
              <Pressable
                key={b.id}
                style={({ pressed }) => [styles.item, i < budgetAlerts.length - 1 && styles.divider, pressed && styles.pressed]}
                onPress={() => router.navigate('/advice')}
                accessibilityRole="button"
                accessibilityLabel={`${title}. ${body}`}
              >
                <View style={[styles.icon, { backgroundColor: look.bg }]}>
                  <Ionicons name={look.icon} size={20} color={look.fg} />
                </View>
                <View style={styles.texts}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.body}>{body}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );

  const renderGroup = (title: string, list: AppNotification[]) =>
    list.length > 0 && (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.card}>
          {list.map((n, i) => {
            const look = lookOf(n);
            return (
              <Pressable
                key={n.id}
                style={({ pressed }) => [styles.item, i < list.length - 1 && styles.divider, pressed && styles.pressed]}
                onPress={() => open(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n.read ? '' : 'Chưa đọc. '}${n.title}. ${n.body}`}
              >
                <View style={[styles.icon, { backgroundColor: look.bg }]}>
                  <Ionicons name={look.icon} size={20} color={look.fg} />
                </View>
                <View style={styles.texts}>
                  <Text style={[styles.title, n.read && styles.titleRead]}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.time}>{timeLabel(n.createdAt)}</Text>
                  {!n.read && <View style={styles.dot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quay lại">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        {/* Chỉ trong bản dev: giữ tay lên tiêu đề để xóa hết thông báo mẫu, xem trạng thái trống */}
        <Pressable
          style={styles.headerTitleBox}
          onLongPress={() => {
            if (!__DEV__) return;
            clearAllForDemo();
            reload();
          }}
          delayLongPress={600}
        >
          <Text style={styles.headerTitle}>Hộp thư</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            markAllRead();
            reload();
          }}
          disabled={unread === 0}
          hitSlop={12}
          style={unread === 0 && styles.disabled}
          accessibilityRole="button"
          accessibilityLabel="Đánh dấu tất cả đã đọc"
        >
          <Ionicons name="checkmark-done" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {items.length === 0 && budgetAlerts.length === 0 ? (
        <EmptyInbox onSettings={() => router.push('/notification-settings')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <SegmentedControl
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'unread', label: unread > 0 ? `Chưa đọc (${unread})` : 'Chưa đọc' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {renderBudgetAlerts()}
          {shown.length === 0 && budgetAlerts.length > 0 ? null : shown.length === 0 ? (
            <View style={styles.allRead}>
              <Ionicons name="checkmark-done-circle-outline" size={36} color={colors.primary} />
              <Text style={styles.allReadText}>Bạn đã đọc hết thông báo.</Text>
            </View>
          ) : (
            <>
              {renderGroup('HÔM NAY', today)}
              {renderGroup('TRƯỚC ĐÓ', earlier)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyInbox({ onSettings }: { onSettings: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyCircle}>
        <Ionicons name="file-tray-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Hộp thư trống</Text>
      <Text style={styles.emptyText}>
        Thông báo về ngân sách, hóa đơn và lời khuyên AI sẽ xuất hiện ở đây.
      </Text>
      <Pressable style={styles.emptyButton} onPress={onSettings} accessibilityRole="button">
        <Text style={styles.emptyButtonText}>Cài đặt thông báo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitleBox: { flex: 1 },
  headerTitle: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  disabled: { opacity: 0.35 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  group: { marginTop: spacing.md + 2 },
  groupTitle: { marginBottom: spacing.sm, paddingHorizontal: spacing.xs, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textMuted },
  card: { paddingHorizontal: spacing.md - 4, borderRadius: radius.lg, backgroundColor: colors.background },
  item: { flexDirection: 'row', gap: spacing.md - 4, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  titleRead: { fontWeight: '600' },
  body: { marginTop: 3, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  meta: { alignItems: 'flex-end', gap: spacing.sm },
  time: { fontSize: 12, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  allRead: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  allReadText: { fontSize: 14, color: colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm + 2 },
  emptyCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  emptyButton: {
    alignSelf: 'stretch',
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
