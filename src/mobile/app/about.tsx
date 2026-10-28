import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ScreenHeader';
import { APP_VERSION } from '@/features/about/appInfo';
import { makeStyles, radius, spacing, useColors } from '@/theme';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'swap-vertical-outline', text: 'Ghi chép thu chi theo ví và danh mục' },
  { icon: 'pie-chart-outline', text: 'Đặt ngân sách, cảnh báo khi sắp vượt hạn mức' },
  { icon: 'scan-outline', text: 'Quét hóa đơn, tự đọc số tiền, ngày và cửa hàng' },
  { icon: 'bar-chart-outline', text: 'Báo cáo chi tiêu theo tuần, tháng, năm' },
  { icon: 'sparkles-outline', text: 'Lời khuyên chi tiêu từ trợ lý AI' },
];

const PROJECT: { label: string; value: string }[] = [
  { label: 'Trường', value: 'Trường Đại học Kiến trúc Đà Nẵng' },
  { label: 'Sinh viên thực hiện', value: 'Cao Lê Huy' },
  { label: 'Giảng viên hướng dẫn', value: 'Lâm Tùng Giang' },
  { label: 'Năm thực hiện', value: '2026' },
];

const TECH = ['React Native · Expo', 'Django REST Framework', 'PostgreSQL', 'OpenCV · EasyOCR', 'Groq (mô hình ngôn ngữ lớn)'];

const LINKS: { icon: keyof typeof Ionicons.glyphMap; label: string; href: Href }[] = [
  { icon: 'document-text-outline', label: 'Điều khoản sử dụng', href: '/legal/terms' },
  { icon: 'shield-checkmark-outline', label: 'Chính sách quyền riêng tư', href: '/legal/privacy' },
  { icon: 'help-circle-outline', label: 'Trung tâm trợ giúp', href: '/help' },
];

/** Giới thiệu ứng dụng: phiên bản, tính năng chính, thông tin đồ án */
export default function AboutScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Giới thiệu ứng dụng" fallbackHref="/profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={require('../assets/icon.png')} style={styles.logo} accessibilityLabel="Logo FinBuddy" />
          <Text style={styles.name}>FinBuddy</Text>
          <Text style={styles.version}>Phiên bản {APP_VERSION}</Text>
          <Text style={styles.tagline}>
            Người bạn đồng hành giúp bạn ghi chép, theo dõi và chi tiêu hợp lý hơn mỗi ngày.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>TÍNH NĂNG CHÍNH</Text>
        <View style={styles.card}>
          {FEATURES.map((f, i) => (
            <View key={f.text} style={[styles.row, i < FEATURES.length - 1 && styles.divider]}>
              <View style={styles.icon}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.rowText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>ĐỒ ÁN TỐT NGHIỆP</Text>
        <View style={styles.card}>
          {PROJECT.map((p, i) => (
            <View key={p.label} style={[styles.infoRow, i < PROJECT.length - 1 && styles.divider]}>
              <Text style={styles.infoLabel}>{p.label}</Text>
              <Text style={styles.infoValue}>{p.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>CÔNG NGHỆ</Text>
        <View style={styles.tags}>
          {TECH.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>THÔNG TIN KHÁC</Text>
        <View style={styles.card}>
          {LINKS.map((l, i) => (
            <Pressable
              key={l.label}
              style={({ pressed }) => [styles.row, i < LINKS.length - 1 && styles.divider, pressed && styles.pressed]}
              onPress={() => router.push(l.href)}
              accessibilityRole="button"
            >
              <View style={styles.icon}>
                <Ionicons name={l.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.rowText}>{l.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.copyright}>© 2026 FinBuddy. Số liệu trong ứng dụng không kết nối ngân hàng thật.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', paddingTop: spacing.md, paddingHorizontal: spacing.md },
  logo: { width: 88, height: 88, borderRadius: radius.xl },
  name: { marginTop: spacing.md - 4, fontSize: 24, fontWeight: '700', color: colors.text },
  version: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  tagline: { marginTop: spacing.sm, fontSize: 14, lineHeight: 21, textAlign: 'center', color: colors.textMuted },
  sectionTitle: {
    marginTop: spacing.md + 4,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.textMuted,
  },
  card: { paddingHorizontal: spacing.md - 4, borderRadius: radius.lg, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  infoRow: { paddingVertical: 12, paddingHorizontal: spacing.xs, gap: 2 },
  infoLabel: { fontSize: 12, color: colors.textMuted },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md - 4,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.text },
  copyright: { marginTop: spacing.lg, fontSize: 12, lineHeight: 17, textAlign: 'center', color: colors.textMuted },
}));
