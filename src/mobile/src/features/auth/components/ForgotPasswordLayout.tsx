import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '@/theme';

type Props = {
  step: number;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
};

const TOTAL_STEPS = 3;

/** Khung chung cho 3 bước quên mật khẩu: nút quay lại, "Bước x/3", tiêu đề và link về Đăng nhập */
export function ForgotPasswordLayout({ step, icon, title, subtitle, children }: Props) {
  const router = useRouter();

  const goBack = () => {
    // Mở thẳng đường dẫn trên web thì không có màn hình trước để quay lại
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable
              onPress={goBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <Text style={styles.step}>
              Bước {step}/{TOTAL_STEPS}
            </Text>
          </View>

          {icon && (
            <View style={styles.iconBadge}>
              <Ionicons name={icon} size={26} color={colors.primary} />
            </View>
          )}

          <Text style={[styles.title, !icon && styles.titleNoIcon]}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {children}

          <Pressable
            style={styles.backToLogin}
            onPress={() => router.dismissTo('/login')}
            hitSlop={8}
            accessibilityRole="link"
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backToLoginText}>Quay lại Đăng nhập</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -spacing.xs,
  },
  step: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  iconBadge: {
    marginTop: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.lg,
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  titleNoIcon: { marginTop: spacing.md },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
  },
  backToLogin: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  backToLoginText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
