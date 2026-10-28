import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import { checkPasswordRules } from '@/features/auth/passwordRules';
import {
  EmailTakenError,
  registerAccount,
  WeakPasswordError,
} from '@/features/auth/registerApi';
import { makeStyles, spacing, useColors } from '@/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { fullName?: string; email?: string };

export default function RegisterScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const goBack = () => {
    // Mở thẳng /register trên web thì không có màn hình trước để quay lại
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const rules = checkPasswordRules(password, confirmPassword);
  const passwordValid = rules.every((r) => r.passed);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const handleRegister = async () => {
    if (!passwordValid || !agreed) return;
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
    if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Email không hợp lệ.';
    setFieldErrors(errors);
    setError(null);
    if (errors.fullName || errors.email) return;

    setSubmitting(true);
    try {
      await registerAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace('/register-success');
    } catch (e) {
      if (e instanceof EmailTakenError)
        setFieldErrors({ email: 'Email này đã được dùng cho một tài khoản khác.' });
      else if (e instanceof WeakPasswordError) setError(e.message);
      else setError('Không tạo được tài khoản. Vui lòng thử lại sau.');
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
              onChangeText={(text) => {
                setFullName(text);
                clearFieldError('fullName');
              }}
              error={fieldErrors.fullName}
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
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
              }}
              error={fieldErrors.email}
              hint="Email không được trùng với tài khoản đã có."
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
              error={mismatch ? 'Mật khẩu nhập lại chưa khớp.' : null}
              placeholder="Nhập lại mật khẩu"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          <PasswordChecklist rules={rules} />

          {/* Chạm vào chữ thường để tích, chạm vào tên văn bản để mở đọc */}
          <Pressable
            style={styles.consent}
            onPress={() => setAgreed((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.check, agreed && styles.checkChecked]}>
              {agreed && <Ionicons name="checkmark" size={15} color={colors.onPrimary} />}
            </View>
            <Text style={styles.consentText}>
              Tôi đã đọc và đồng ý với{' '}
              <Link href="/legal/terms" style={styles.consentLink}>
                Điều khoản sử dụng
              </Link>{' '}
              và{' '}
              <Link href="/legal/privacy" style={styles.consentLink}>
                Chính sách quyền riêng tư
              </Link>{' '}
              của FinBuddy.
            </Text>
          </Pressable>

          {error && <FieldError message={error} />}

          <PrimaryButton
            title="Đăng ký"
            onPress={handleRegister}
            loading={submitting}
            disabled={!passwordValid || !agreed}
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

const useStyles = makeStyles((colors) => ({
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
  button: { marginTop: spacing.lg },
  consent: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 4 },
  check: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  consentLink: { fontSize: 13, fontWeight: '600', color: colors.primary },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
}));
