import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ScreenHeader';
import { showToast } from '@/components/Toast';
import { HELP_TOPICS } from '@/features/help/helpContent';
import { CONTACT_EMAIL } from '@/features/legal/legalContent';
import { makeStyles, radius, spacing, useColors } from '@/theme';

/** Trung tâm trợ giúp: câu hỏi thường gặp theo chủ đề, chạm để mở / đóng câu trả lời */
export default function HelpScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  // Khóa "chủ đề:câu hỏi" của các câu đang mở
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const contact = async () => {
    try {
      await Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('[FinBuddy] Hỗ trợ')}`);
    } catch {
      // Máy không có ứng dụng email
      showToast(`Gửi email tới ${CONTACT_EMAIL}`, 'mail-outline');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Trung tâm trợ giúp" fallbackHref="/profile" />
      <ScrollView contentContainerStyle={styles.content}>
        {HELP_TOPICS.map((topic) => (
          <View key={topic.title}>
            <View style={styles.topicHeader}>
              <Ionicons name={topic.icon} size={15} color={colors.textMuted} />
              <Text style={styles.topicTitle}>{topic.title.toUpperCase()}</Text>
            </View>
            <View style={styles.card}>
              {topic.questions.map((q, i) => {
                const key = `${topic.title}:${i}`;
                const expanded = open.has(key);
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [
                      styles.item,
                      i < topic.questions.length - 1 && styles.divider,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => toggle(key)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                  >
                    <View style={styles.questionRow}>
                      <Text style={styles.question}>{q.question}</Text>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>
                    {expanded && <Text style={styles.answer}>{q.answer}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.contact}>
          <Text style={styles.contactTitle}>Chưa tìm thấy câu trả lời?</Text>
          <Text style={styles.contactText}>Gửi câu hỏi cho chúng tôi, phản hồi qua email đăng ký của bạn.</Text>
          <Pressable
            style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
            onPress={contact}
            accessibilityRole="button"
          >
            <Ionicons name="mail-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.contactButtonText}>Liên hệ hỗ trợ</Text>
          </Pressable>
        </View>

        <Pressable style={styles.legal} onPress={() => router.push('/legal/privacy')} hitSlop={8}>
          <Text style={styles.legalText}>Chính sách quyền riêng tư</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.md + 4,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  topicTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textMuted },
  card: { paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.background },
  item: { paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.6 },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  question: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 21, color: colors.text },
  answer: { marginTop: spacing.sm, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  contact: {
    marginTop: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  contactTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  contactText: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: colors.textMuted },
  contactButton: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  contactButtonText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
  legal: { marginTop: spacing.md, alignSelf: 'center' },
  legalText: { fontSize: 13, fontWeight: '600', color: colors.primary },
}));
