import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PasswordRule } from '@/features/auth/passwordRules';
import { makeStyles, radius, spacing, useColors } from '@/theme';

/** Checklist điều kiện mật khẩu, tick xanh ngay khi người dùng gõ */
export function PasswordChecklist({ rules }: { rules: PasswordRule[] }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Mật khẩu cần có</Text>
      {rules.map((rule) => (
        <View
          key={rule.label}
          style={styles.rule}
          accessibilityLabel={`${rule.label}: ${rule.passed ? 'đã đạt' : 'chưa đạt'}`}
        >
          <View style={[styles.check, rule.passed && styles.checkPassed]}>
            {rule.passed && <Ionicons name="checkmark" size={15} color={colors.onPrimary} />}
          </View>
          <Text style={[styles.text, rule.passed && styles.textPassed]}>{rule.label}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  box: {
    marginTop: spacing.md,
    padding: spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.disabled,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  title: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPassed: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { flex: 1, fontSize: 14, color: colors.textMuted },
  textPassed: { fontWeight: '600', color: colors.primary },
}));
