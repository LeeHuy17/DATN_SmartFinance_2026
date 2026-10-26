import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { InvalidCredentialsError, login } from '@/features/auth/loginApi';
import { makeStyles, radius, spacing, useColors } from '@/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Email không hợp lệ.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const token = await login(email.trim().toLowerCase(), password);
      // Lưu token; điều hướng gốc (Stack.Protected) tự chuyển sang Tổng quan
      await signIn(token);
    } catch (e) {
      setError(
        e instanceof InvalidCredentialsError
          ? 'Email hoặc mật khẩu không đúng.'
          : 'Không đăng nhập được. Vui lòng thử lại sau.',
      );
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
          <View style={styles.logo}>
            <Ionicons name="wallet-outline" size={30} color={colors.onPrimary} />
          </View>

          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>
            Đăng nhập để tiếp tục theo dõi chi tiêu với Smart Finance.
          </Text>

          <View style={styles.form}>
            <TextField
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
              placeholder="Nhập mật khẩu"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Link href="/forgot-password" asChild>
            <Pressable style={styles.forgot} hitSlop={8}>
              <Text style={styles.link}>Quên mật khẩu?</Text>
            </Pressable>
          </Link>

          <PrimaryButton
            title="Đăng nhập"
            onPress={handleLogin}
            loading={submitting}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Chưa có tài khoản?{' '}
              <Link href="/register" style={styles.link}>
                Đăng ký
              </Link>
            </Text>
            <Text style={styles.disclaimer}>
              Ví và số dư trong ứng dụng là mô phỏng, không kết nối ngân hàng thật.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.lg,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  form: { marginTop: spacing.md },
  error: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.danger,
  },
  forgot: { alignSelf: 'flex-end', marginTop: spacing.md },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  button: { marginTop: spacing.lg },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  footerText: { fontSize: 14, color: colors.textMuted },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));
