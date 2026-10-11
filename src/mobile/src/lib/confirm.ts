import { Alert, Platform } from 'react-native';

type Options = { title: string; message: string; confirmText: string; destructive?: boolean };

/** Hộp thoại xác nhận chạy được cả trên điện thoại (Alert) và web (Alert của RN không hiện trên web) */
export function confirm({ title, message, confirmText, destructive }: Options): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
