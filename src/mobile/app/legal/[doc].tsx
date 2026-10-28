import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ScreenHeader } from '@/components/ScreenHeader';
import { LEGAL_DOCUMENTS, type LegalBlock, type LegalDocumentKey } from '@/features/legal/legalContent';
import { makeStyles, radius, spacing } from '@/theme';

// "2026-10-28" -> "28/10/2026"
const formatDate = (ymd: string) => ymd.split('-').reverse().join('/');

/** Điều khoản sử dụng / Chính sách quyền riêng tư: mở được cả khi chưa đăng nhập (từ màn Đăng ký) */
export default function LegalScreen() {
  const styles = useStyles();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const document = LEGAL_DOCUMENTS[doc as LegalDocumentKey];

  if (!document) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Pháp lý" />
        <Text style={styles.notFound}>Không tìm thấy văn bản này.</Text>
      </SafeAreaView>
    );
  }

  const renderBlock = (block: LegalBlock, key: number) =>
    typeof block === 'string' ? (
      <Text key={key} style={styles.paragraph}>
        {block}
      </Text>
    ) : (
      <View key={key} style={styles.list}>
        {block.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={document.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Cập nhật lần cuối: {formatDate(document.updatedAt)}</Text>
        <Text style={styles.intro}>{document.intro}</Text>

        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">
              {section.heading}
            </Text>
            {section.body.map(renderBlock)}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  notFound: { marginTop: spacing.xl, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  updated: { paddingHorizontal: spacing.xs, fontSize: 12, color: colors.textMuted },
  intro: {
    marginTop: spacing.sm,
    padding: spacing.md - 2,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    fontSize: 14,
    lineHeight: 21,
    color: colors.primary,
  },
  section: {
    marginTop: spacing.md - 4,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  paragraph: { fontSize: 14, lineHeight: 21, color: colors.text },
  list: { gap: spacing.xs + 2 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: 14, lineHeight: 21, color: colors.primary },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.text },
}));
