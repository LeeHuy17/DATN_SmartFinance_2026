import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { kindOptions } from '@/features/transactions/categories';
import { CategoryIcon } from '@/features/transactions/components/CategoryIcon';
import { listCategories, type CategoryWithCount } from '@/features/transactions/transactionsApi';
import type { CategoryKind } from '@/features/transactions/types';
import { makeStyles, radius, spacing, useColors } from '@/theme';

function subtitle(c: CategoryWithCount) {
  const count = c.transactionCount > 0 ? `${c.transactionCount} giao dịch` : 'Chưa có giao dịch';
  return c.hidden ? `${count} · Đang ẩn` : count;
}

export default function CategoryManagerScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  // Mở từ màn Thêm giao dịch thì đi kèm loại đang chọn
  const params = useLocalSearchParams<{ kind?: CategoryKind }>();
  const [kind, setKind] = useState<CategoryKind>(params.kind === 'income' ? 'income' : 'expense');
  const [categories, setCategories] = useState<CategoryWithCount[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    listCategories(kind)
      .then(setCategories)
      .catch(() => setError(true));
  }, [kind]);

  // Tải khi đổi tab Chi / Thu và khi quay về từ màn Sửa / Thêm danh mục
  useFocusEffect(load);

  const changeKind = (next: CategoryKind) => {
    setCategories(null);
    setKind(next);
  };

  const list = categories?.filter((c) => c.kind === kind) ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Quản lý danh mục" />

      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl options={kindOptions(colors)} value={kind} onChange={changeKind} />
        <Text style={styles.hint}>
          Chạm vào danh mục để đổi tên, màu, biểu tượng hoặc ẩn/hiện.
        </Text>

        {error ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>Không tải được danh mục. Kiểm tra kết nối mạng rồi thử lại.</Text>
            <PrimaryButton title="Thử lại" onPress={load} style={styles.retry} />
          </View>
        ) : !categories ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : list.length === 0 ? (
          <Text style={styles.stateText}>Chưa có danh mục nào. Bấm "Thêm danh mục" để tạo.</Text>
        ) : (
          <View style={styles.card}>
            {list.map((c, i) => (
              <Pressable
                key={c.id}
                style={({ pressed }) => [
                  styles.row,
                  i < list.length - 1 && styles.divider,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push({ pathname: '/categories/edit', params: { id: c.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${subtitle(c)}`}
              >
                <CategoryIcon icon={c.icon} color={c.color} dimmed={c.hidden} />
                <View style={styles.texts}>
                  <Text style={[styles.name, c.hidden && styles.nameHidden]}>{c.name}</Text>
                  <Text style={styles.meta}>{subtitle(c)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="+ Thêm danh mục"
          onPress={() => router.push({ pathname: '/categories/edit', params: { kind } })}
        />
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  state: { marginTop: spacing.lg, alignItems: 'center' },
  stateText: { marginTop: spacing.lg, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  retry: { marginTop: spacing.md, alignSelf: 'stretch' },
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  hint: { marginTop: spacing.md - 4, fontSize: 13, lineHeight: 19, color: colors.primary },
  loading: { marginTop: spacing.xl },
  card: {
    marginTop: spacing.md - 4,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  texts: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  nameHidden: { color: colors.textMuted },
  meta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
}));
