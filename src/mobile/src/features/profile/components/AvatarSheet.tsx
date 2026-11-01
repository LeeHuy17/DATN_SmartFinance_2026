import { Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/BottomSheet';
import { showToast } from '@/components/Toast';
import { makeStyles, radius, spacing, useColors } from '@/theme';

type Props = {
  visible: boolean;
  hasAvatar: boolean;
  onClose: () => void;
  /** uri ảnh mới, hoặc null khi xóa ảnh */
  onChange: (uri: string | null) => void;
};

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

/** Bảng chọn ảnh đại diện: chụp mới, chọn từ thư viện, xóa ảnh hiện tại */
export function AvatarSheet({ visible, hasAvatar, onClose, onChange }: Props) {
  const styles = useStyles();
  const pick = async (source: 'camera' | 'library') => {
    // Đóng bảng trước: iOS không mở được camera/thư viện khi đang có Modal hiển thị
    onClose();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast(
        source === 'camera' ? 'Chưa có quyền dùng Camera' : 'Chưa có quyền truy cập Thư viện ảnh',
        'alert-circle',
      );
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICK_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
    if (!result.canceled) onChange(result.assets[0].uri);
  };

  return (
    <BottomSheet
      visible={visible}
      title="Ảnh đại diện"
      onClose={onClose}
      footer={
        <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
          <Text style={styles.cancelText}>Hủy</Text>
        </Pressable>
      }
    >
      <Option
        icon="camera-outline"
        title="Chụp ảnh mới"
        text="Mở camera để chụp trực tiếp"
        onPress={() => pick('camera')}
      />
      <Option
        icon="images-outline"
        title="Chọn từ thư viện"
        text="Chọn một ảnh có sẵn trong điện thoại"
        onPress={() => pick('library')}
      />
      {hasAvatar && (
        <Option
          icon="trash-outline"
          title="Xóa ảnh hiện tại"
          danger
          onPress={() => {
            onClose();
            onChange(null);
          }}
        />
      )}
      <Text style={styles.note}>
        Lần đầu sử dụng, ứng dụng sẽ xin quyền truy cập Camera hoặc Thư viện ảnh.
      </Text>
    </BottomSheet>
  );
}

function Option({
  icon,
  title,
  text,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const fg = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, danger && { color: colors.danger }]}>{title}</Text>
        {text && <Text style={styles.text}>{text}</Text>}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: spacing.sm + 2 },
  pressed: { opacity: 0.6 },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  text: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  note: { marginTop: spacing.sm, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  cancel: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.text },
}));
