import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { showToast } from '@/components/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { changePassword, WrongPasswordError } from '@/features/profile/profileStore';
import { confirm } from '@/lib/confirm';
import { colors, spacing } from '@/theme';

/** Điều kiện mật khẩu mới theo thiết kế màn Đổi mật khẩu */
const rulesFor = (password: string) => [
  { label: 'Tối thiểu 8 ký tự', passed: password.length >= 8 },
  { label: 'Có ít nhất 1 chữ hoa', passed: /[A-Z]/.test(password) },
  { label: 'Có ít nhất 1 chữ số', passed: /\d/.test(password) },
];

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [againTouched, setAgainTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rules = rulesFor(next);
  const rulesPassed = rules.every((r) => r.passed);
  // Báo không khớp khi đã gõ đủ độ dài hoặc rời ô, tránh báo lỗi khi đang gõ dở
  const mismatch = again.length > 0 && again !== next && (againTouched || again.length >= next.length);
  const sameAsCurrent = next.length > 0 && next === current;
  const canSubmit = current.length > 0 && rulesPassed && again === next && !sameAsCurrent;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await changePassword(current, next);
      showToast('Đổi mật khẩu thành công');
      if (router.canGoBack()) router.back();
      else router.replace('/profile');
    } catch (e) {
      if (e instanceof WrongPasswordError) setCurrentError('Mật khẩu hiện tại không đúng.');
      else showToast('Không đổi được mật khẩu. Vui lòng thử lại.', 'alert-circle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async () => {
    const ok = await confirm({
      title: 'Quên mật khẩu hiện tại?',
      message: 'Bạn sẽ được đăng xuất để khôi phục mật khẩu bằng mã xác thực gửi qua email hoặc số điện thoại.',
      confirmText: 'Tiếp tục',
    });
    if (!ok) return;
    await signOut();
    // Chờ điều hướng gốc chuyển sang nhóm màn xác thực rồi mới mở Khôi phục mật khẩu
    setTimeout(() => router.push('/forgot-password'), 0);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Đổi mật khẩu" fallbackHref="/profile" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>Nhập mật khẩu hiện tại để xác minh, sau đó đặt mật khẩu mới.</Text>

          <TextField
            label="Mật khẩu hiện tại"
            value={current}
            onChangeText={(t) => {
              setCurrent(t);
              setCurrentError(null);
            }}
            placeholder="Nhập mật khẩu hiện tại"
            error={currentError}
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
          />
          <TextField
            label="Mật khẩu mới"
            value={next}
            onChangeText={setNext}
            placeholder="Nhập mật khẩu mới"
            error={sameAsCurrent ? 'Mật khẩu mới phải khác mật khẩu hiện tại.' : null}
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            label="Xác nhận mật khẩu mới"
            value={again}
            onChangeText={setAgain}
            onBlur={() => setAgainTouched(true)}
            placeholder="Nhập lại mật khẩu mới"
            error={mismatch ? 'Mật khẩu xác nhận không khớp.' : null}
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <View style={styles.rules}>
            {rules.map((r) => (
              <View
                key={r.label}
                style={styles.rule}
                accessibilityLabel={`${r.label}: ${r.passed ? 'đã đạt' : 'chưa đạt'}`}
              >
                <Ionicons
                  name={r.passed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={r.passed ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.ruleText, r.passed && styles.rulePassed]}>{r.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.forgot} onPress={handleForgot} hitSlop={8} accessibilityRole="link">
            <Text style={styles.forgotText}>Quên mật khẩu hiện tại?</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title="Cập nhật mật khẩu"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  intro: { marginTop: spacing.xs, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  rules: { marginTop: spacing.md - 4, gap: spacing.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ruleText: { fontSize: 14, color: colors.textMuted },
  rulePassed: { fontWeight: '600', color: colors.primary },
  forgot: { alignSelf: 'flex-start', marginTop: spacing.lg },
  forgotText: { fontSize: 14, fontWeight: '700', color: colors.text },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md - 4,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
