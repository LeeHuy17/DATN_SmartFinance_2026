import { useRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputInstance } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ForgotPasswordLayout } from '@/features/auth/components/ForgotPasswordLayout';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import { checkPasswordRules } from '@/features/auth/passwordRules';
import {
  resetPassword,
  ResetSessionExpiredError,
  WeakNewPasswordError,
} from '@/features/auth/passwordResetApi';
import { spacing } from '@/theme';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmRef = useRef<TextInputInstance>(null);

  // Chỉ vào được sau khi đã xác thực mã ở bước 2
  if (!token) return <Redirect href="/forgot-password" />;

  const rules = checkPasswordRules(password, confirm);
  const allPassed = rules.every((r) => r.passed);
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async () => {
    if (!allPassed) return;
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      router.replace('/reset-success');
    } catch (e) {
      if (e instanceof ResetSessionExpiredError)
        setError('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng quay lại và gửi mã mới.');
      else if (e instanceof WeakNewPasswordError) setError(e.message);
      else setError('Không đặt lại được mật khẩu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ForgotPasswordLayout
      step={3}
      title="Tạo mật khẩu mới"
      subtitle="Chọn mật khẩu mạnh mà bạn chưa dùng trước đây."
    >
      <TextField
        label="Mật khẩu mới"
        value={password}
        onChangeText={setPassword}
        placeholder="Nhập mật khẩu mới"
        secureTextEntry
        passwordToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Nhập lại mật khẩu mới"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Nhập lại mật khẩu mới"
        error={mismatch ? 'Mật khẩu nhập lại chưa khớp.' : null}
        secureTextEntry
        passwordToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <PasswordChecklist rules={rules} />

      {error && <FieldError message={error} />}

      <PrimaryButton
        title="Đặt lại mật khẩu"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!allPassed}
        style={styles.button}
      />
    </ForgotPasswordLayout>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: spacing.lg },
});
