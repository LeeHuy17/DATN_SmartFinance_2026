import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { makeStyles, spacing, useColors } from '@/theme';

type Props = { title: string; message: string };

/** Màn hình báo thành công (đăng ký, đổi mật khẩu) với nút "Đăng nhập ngay" */
export function AuthSuccess({ title, message }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.halo}>
          <View style={styles.circle}>
            <Ionicons name="checkmark" size={44} color={colors.onPrimary} />
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      {/* Quay về màn hình đăng nhập và bỏ các màn hình trước đó khỏi lịch sử */}
      <PrimaryButton
        title="Đăng nhập ngay"
        onPress={() => router.dismissTo('/login')}
        style={styles.button}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  halo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.xl,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
  },
  message: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.textMuted,
  },
  button: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
}));
