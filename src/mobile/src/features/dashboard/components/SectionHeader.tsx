import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, spacing, useColors } from '@/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
  /** Thêm mũi tên ">" sau nhãn hành động */
  chevron?: boolean;
};

export function SectionHeader({ title, actionLabel, onPressAction, chevron }: Props) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && (
        <Pressable
          style={styles.actionRow}
          onPress={onPressAction}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.action}>{actionLabel}</Text>
          {chevron && <Ionicons name="chevron-forward" size={16} color={colors.primary} />}
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    marginTop: spacing.lg,
    marginBottom: spacing.md - 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: { fontSize: 14, fontWeight: '700', color: colors.primary },
}));
