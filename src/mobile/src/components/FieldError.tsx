import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing } from '@/theme';

type Props = { message: string; style?: StyleProp<ViewStyle> };

export function FieldError({ message, style }: Props) {
  return (
    <View style={[styles.row, style]} accessibilityRole="alert">
      <Ionicons name="warning-outline" size={15} color={colors.danger} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  icon: { marginTop: 2 },
  text: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500', color: colors.danger },
});
