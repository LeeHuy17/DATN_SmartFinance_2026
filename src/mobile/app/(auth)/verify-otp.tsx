import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FieldError } from '@/components/FieldError';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ForgotPasswordLayout } from '@/features/auth/components/ForgotPasswordLayout';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { detectIdentifier, maskIdentifier } from '@/features/auth/identifier';
import {
  OTP_LENGTH,
  OTP_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  requestPasswordReset,
  verifyResetCode,
} from '@/features/auth/passwordResetApi';
import { makeStyles, spacing, useColors } from '@/theme';

export default function VerifyOtpScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { identifier } = useLocalSearchParams<{ identifier?: string }>();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // Đếm ngược: chờ được gửi lại mã, và thời hạn của mã hiện tại
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);
  const [expiresIn, setExpiresIn] = useState(OTP_TTL_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1));
      setExpiresIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mở thẳng /verify-otp mà không qua bước 1
  if (!identifier) return <Redirect href="/forgot-password" />;

  const channel = detectIdentifier(identifier) === 'phone' ? 'số điện thoại' : 'email';
  const expired = expiresIn === 0;

  const handleChange = (value: string) => {
    setCode(value);
    if (error) setError(null);
  };

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      const token = await verifyResetCode(identifier, code);
      router.push({ pathname: '/reset-password', params: { token } });
    } catch {
      setError('Mã xác thực không đúng. Vui lòng kiểm tra và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await requestPasswordReset(identifier);
      setCode('');
      setError(null);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setExpiresIn(OTP_TTL_SECONDS);
    } catch {
      setError('Không gửi lại được mã. Vui lòng thử lại sau.');
    } finally {
      setResending(false);
    }
  };

  return (
    <ForgotPasswordLayout
      step={2}
      icon="mail-outline"
      title="Nhập mã xác thực"
      subtitle={
        <>
          Chúng tôi đã gửi mã gồm {OTP_LENGTH} chữ số đến {channel}{' '}
          <Text style={styles.strong}>{maskIdentifier(identifier)}</Text>.{' '}
          {expired ? 'Mã trước đó đã hết hiệu lực.' : `Mã có hiệu lực trong ${OTP_TTL_SECONDS / 60} phút.`}
        </>
      }
    >
      <OtpInput value={code} onChange={handleChange} length={OTP_LENGTH} error={!!error} autoFocus />
      {error && <FieldError message={error} style={styles.error} />}

      <View style={styles.resend}>
        <Text style={styles.resendQuestion}>Chưa nhận được mã?</Text>
        {resendIn > 0 ? (
          <View style={styles.resendRow}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={styles.resendWaiting}>Gửi lại mã sau ({resendIn}s)</Text>
          </View>
        ) : (
          <Pressable
            style={styles.resendRow}
            onPress={handleResend}
            disabled={resending}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.resendLink}>{resending ? 'Đang gửi...' : 'Gửi lại mã'}</Text>
          </Pressable>
        )}
      </View>

      <PrimaryButton
        title="Xác nhận"
        onPress={handleVerify}
        loading={submitting}
        disabled={code.length < OTP_LENGTH}
        style={styles.button}
      />
    </ForgotPasswordLayout>
  );
}

const useStyles = makeStyles((colors) => ({
  strong: { fontWeight: '700', color: colors.text },
  error: { marginTop: spacing.md },
  resend: { marginTop: spacing.lg, alignItems: 'center', gap: spacing.md },
  resendQuestion: { fontSize: 14, color: colors.textMuted },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resendWaiting: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  resendLink: { fontSize: 15, fontWeight: '700', color: colors.primary },
  button: { marginTop: spacing.lg },
}));
