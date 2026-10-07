import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const goBack = () => {
    // Mở thẳng /register trên web thì không có màn hình trước để quay lại
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const validate = () => {
    if (!fullName.trim()) return 'Vui lòng nhập họ và tên.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Email không hợp lệ.';
    if (password.length < MIN_PASSWORD_LENGTH)
      return `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`;
    if (password !== confirmPassword) return 'Mật khẩu nhập lại không khớp.';
    return null;
  };

  const handleRegister = async () => {
    const message = validate();
    setError(message);
    if (message) return;

    setSubmitting(true);
    try {
      // TODO: gọi API đăng ký (features/auth); trùng email thì hiển thị lỗi từ server,
      // thành công thì signIn(token) từ useAuth() để vào ứng dụng
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.back}
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>

          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>
            Chỉ mất một phút. Bạn sẽ có sẵn các danh mục thu chi mặc định.
          </Text>

          <View style={styles.form}>
            <TextField
              label="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nguyễn Văn An"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <TextField
              ref={emailRef}
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="ten@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              ref={passwordRef}
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="Tối thiểu 8 ký tự"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TextField
              ref={confirmRef}
              label="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.hint}>
              Mật khẩu tối thiểu 8 ký tự. Email không được trùng với tài khoản đã có.
            </Text>
          )}

          <PrimaryButton
            title="Đăng ký"
            onPress={handleRegister}
            loading={submitting}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Đã có tài khoản?{' '}
              <Link href="/login" replace style={styles.link}>
                Đăng nhập
              </Link>
            </Text>
          </View>
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
  back: { alignSelf: 'flex-start', marginLeft: -spacing.xs },
  title: {
    marginTop: spacing.lg,
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  form: { marginTop: spacing.sm },
  hint: {
    marginTop: spacing.lg,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  error: {
    marginTop: spacing.lg,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  button: { marginTop: spacing.lg },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
