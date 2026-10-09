import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ForgotPasswordLayout } from '@/features/auth/components/ForgotPasswordLayout';
import { detectIdentifier, normalizeIdentifier } from '@/features/auth/identifier';
import { requestPasswordReset } from '@/features/auth/passwordResetApi';
import { spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!detectIdentifier(identifier)) {
      setError('Email hoặc số điện thoại chưa đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const value = normalizeIdentifier(identifier);
      await requestPasswordReset(value);
      router.push({ pathname: '/verify-otp', params: { identifier: value } });
    } catch {
      setError('Không gửi được mã xác thực. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ForgotPasswordLayout
      step={1}
      icon="lock-closed-outline"
      title="Khôi phục mật khẩu"
      subtitle="Vui lòng nhập Email hoặc Số điện thoại đã đăng ký để nhận mã xác thực."
    >
      <View style={styles.form}>
        <TextField
          label="Email hoặc số điện thoại"
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            if (error) setError(null);
          }}
          placeholder="ten@example.com hoặc 09xxxxxxxx"
          error={error}
          hint="Hệ thống tự nhận diện đó là email hay số điện thoại."
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
      </View>

      <PrimaryButton
        title="Gửi mã xác thực"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.button}
      />
    </ForgotPasswordLayout>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.md },
  button: { marginTop: spacing.lg },
});
