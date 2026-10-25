import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { ReceiptPlaceholder } from '@/features/ocr/components/ReceiptPlaceholder';
import { ScanFrame } from '@/features/ocr/components/ScanFrame';
import { setPendingReceipt } from '@/features/ocr/pendingReceipt';
import { scanColors } from '@/features/ocr/scanTheme';

/** Tỉ lệ khung ngắm theo thiết kế (hóa đơn dọc) */
const FRAME_RATIO = 1.47;
/**
 * Khoảng chừa trên/dưới cho màn nền tối phủ kín màn hình. Lấy từ safe-area; nếu trả về 0
 * (một số máy / chế độ hiển thị) thì tối thiểu bằng chiều cao thanh trạng thái để nút không bị che.
 */
function useScreenInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  const statusBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : Platform.OS === 'ios' ? 44 : 0;
  return { ...insets, top: Math.max(insets.top, statusBar) };
}

/** Trình duyệt không điều khiển được đèn flash */
const TORCH_SUPPORTED = Platform.OS !== 'web';

export default function ScanReceiptScreen() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lần đầu mở: hỏi quyền camera ngay, không bắt người dùng bấm thêm một nút
  useEffect(() => {
    if (permission?.status === 'undetermined') requestPermission();
  }, [permission?.status, requestPermission]);

  // Khung rộng ~78% màn hình nhưng không quá cao trên máy màn hình thấp
  const frameWidth = Math.min(width * 0.78, 320, (height * 0.52) / FRAME_RATIO);
  const frameHeight = frameWidth * FRAME_RATIO;

  const granted = permission?.granted === true;
  /** Đã hỏi mà không được cấp quyền → màn hướng dẫn toàn trang */
  const permissionDenied = !!permission && !granted && permission.status !== 'undetermined';
  const cameraActive = granted && !cameraFailed;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /** Chuyển sang màn Xem trước & xác nhận với ảnh vừa có */
  const openPreview = (uri: string, source: 'camera' | 'gallery') => {
    setTorch(false);
    setPendingReceipt({ uri, source });
    router.push('/transaction/preview');
  };

  const capture = async () => {
    if (!cameraRef.current || !cameraReady || busy) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) openPreview(photo.uri, 'camera');
    } catch {
      setError('Không chụp được ảnh. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        // iPhone lưu ảnh dạng HEIC, server không đọc được: bắt iOS đổi sang JPEG
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled && result.assets[0]) openPreview(result.assets[0].uri, 'gallery');
    } catch {
      setError('Không mở được thư viện ảnh.');
    }
  };

  if (permissionDenied) {
    return (
      <PermissionDenied
        insets={insets}
        canAskAgain={permission.canAskAgain}
        onAllow={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        onClose={close}
        onPickImage={pickFromLibrary}
        onManual={() => router.replace('/transaction/add')}
        error={error}
      />
    );
  }

  /** Nội dung trong khung khi chưa dùng được camera */
  const renderFrameContent = () => {
    if (cameraActive) return null;
    return (
      <>
        <ReceiptPlaceholder />
        {cameraFailed && (
          <View style={styles.permission}>
            <Ionicons name="alert-circle-outline" size={28} color={scanColors.onDark} />
            <Text style={styles.permissionText}>
              Không mở được camera. Hãy chọn ảnh từ thư viện hoặc nhập tay.
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {cameraActive && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => setCameraFailed(true)}
        />
      )}

      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable
            onPress={close}
            hitSlop={8}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          >
            <Ionicons name="close" size={28} color={scanColors.onDark} />
          </Pressable>
          <Text style={styles.title}>Quét hóa đơn</Text>
          <Pressable
            onPress={() => setTorch((t) => !t)}
            disabled={!cameraReady || !TORCH_SUPPORTED}
            hitSlop={8}
            style={[styles.iconButton, (!cameraReady || !TORCH_SUPPORTED) && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Tắt đèn flash' : 'Bật đèn flash'}
            accessibilityState={{ disabled: !cameraReady || !TORCH_SUPPORTED, selected: torch }}
          >
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={24} color={scanColors.onDark} />
          </Pressable>
        </View>

        <View style={styles.middle}>
          <View
            style={[
              styles.frameHole,
              { width: frameWidth, height: frameHeight },
              // Có camera: làm tối mọi thứ ngoài khung bằng bóng đổ rất rộng
              cameraActive && styles.dimOutside,
            ]}
          >
            <ScanFrame width={frameWidth} height={frameHeight} scanning={cameraReady && !busy}>
              {renderFrameContent()}
            </ScanFrame>
          </View>
          <Text style={[styles.hint, { maxWidth: frameWidth + 40 }]}>
            {error ?? 'Đặt hóa đơn vào khung, đủ sáng, tránh nhăn và bị cắt góc để đọc chính xác hơn.'}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            style={styles.gallery}
            onPress={pickFromLibrary}
            accessibilityRole="button"
            accessibilityLabel="Chọn ảnh từ thư viện"
          >
            <Ionicons name="image-outline" size={24} color={scanColors.onDark} />
          </Pressable>

          <Pressable
            style={[styles.shutter, !cameraReady && styles.disabled]}
            onPress={capture}
            disabled={!cameraReady || busy}
            accessibilityRole="button"
            accessibilityLabel="Chụp hóa đơn"
            accessibilityState={{ disabled: !cameraReady || busy, busy }}
          >
            <View style={styles.shutterInner}>
              {busy && <ActivityIndicator color={scanColors.background} />}
            </View>
          </Pressable>

          <Pressable
            style={styles.manual}
            onPress={() => router.replace('/transaction/add')}
            accessibilityRole="button"
          >
            <Text style={styles.manualText}>Nhập{'\n'}tay</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Chưa có quyền camera: hướng dẫn mở Cài đặt, vẫn cho chọn ảnh có sẵn hoặc nhập tay */
function PermissionDenied({
  insets,
  canAskAgain,
  onAllow,
  onClose,
  onPickImage,
  onManual,
  error,
}: {
  insets: EdgeInsets;
  canAskAgain: boolean;
  onAllow: () => void;
  onClose: () => void;
  onPickImage: () => void;
  onManual: () => void;
  error: string | null;
}) {
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <View style={styles.deniedHeader}>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
        >
          <Ionicons name="close" size={26} color={scanColors.onDark} />
        </Pressable>
        <Text style={styles.deniedHeaderTitle}>Quét hóa đơn</Text>
      </View>

      <View style={styles.denied}>
        <View style={styles.deniedIcon}>
          <Ionicons name="camera-outline" size={30} color={scanColors.onDark} />
        </View>
        <Text style={styles.deniedTitle}>Chưa có quyền dùng camera</Text>
        <Text style={styles.deniedText}>
          Hãy cấp quyền camera hoặc thư viện ảnh trong Cài đặt để quét hóa đơn. Bạn vẫn có thể nhập giao dịch
          bằng tay.
        </Text>

        <Pressable style={styles.deniedPrimary} onPress={onAllow} accessibilityRole="button">
          {/* Đã từ chối hẳn thì hệ điều hành không hỏi lại nữa, phải mở Cài đặt */}
          <Text style={styles.deniedPrimaryText}>{canAskAgain ? 'Cho phép dùng camera' : 'Mở Cài đặt'}</Text>
        </Pressable>
        <Pressable style={styles.deniedSecondary} onPress={onPickImage} accessibilityRole="button">
          <Text style={styles.deniedSecondaryText}>Chọn từ thư viện ảnh</Text>
        </Pressable>
        <Pressable onPress={onManual} hitSlop={8} accessibilityRole="button">
          <Text style={styles.deniedLink}>Nhập tay</Text>
        </Pressable>
        {error && <Text style={styles.deniedText}>{error}</Text>}
      </View>
    </View>
  );
}

const SHUTTER = 80;
const SIDE = 56;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: scanColors.background },
  safe: { flex: 1 },
  disabled: { opacity: 0.4 },
  // Tiêu đề và hàng nút nằm trên lớp làm tối quanh khung (bóng đổ của khung)
  header: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  /** Vùng chạm 44×44 cho nút đóng / flash */
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: scanColors.onDark, textAlign: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  frameHole: { borderRadius: 18 },
  dimOutside: { boxShadow: `0 0 0 2000px ${scanColors.dim}` },
  hint: { fontSize: 14, lineHeight: 21, color: scanColors.onDarkMuted, textAlign: 'center' },
  deniedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deniedHeaderTitle: { fontSize: 17, fontWeight: '700', color: scanColors.onDark },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  deniedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: scanColors.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  deniedTitle: { fontSize: 19, fontWeight: '700', color: scanColors.onDark, textAlign: 'center' },
  deniedText: { fontSize: 14, lineHeight: 21, color: scanColors.onDarkMuted, textAlign: 'center', marginBottom: 8 },
  deniedPrimary: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 12,
    backgroundColor: scanColors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedPrimaryText: { fontSize: 16, fontWeight: '700', color: scanColors.background },
  deniedSecondary: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: scanColors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedSecondaryText: { fontSize: 16, fontWeight: '700', color: scanColors.onDark },
  deniedLink: { marginTop: 4, fontSize: 15, fontWeight: '700', color: scanColors.scanLine },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(14, 23, 20, 0.72)',
  },
  permissionText: { fontSize: 13, lineHeight: 19, color: scanColors.onDarkMuted, textAlign: 'center' },
  controls: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  gallery: {
    width: SIDE,
    height: SIDE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: scanColors.controlBorder,
    backgroundColor: scanColors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    borderColor: scanColors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: SHUTTER - 20,
    height: SHUTTER - 20,
    borderRadius: (SHUTTER - 20) / 2,
    backgroundColor: scanColors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manual: { width: SIDE, alignItems: 'center' },
  manualText: { fontSize: 14, fontWeight: '700', lineHeight: 19, color: scanColors.onDark, textAlign: 'center' },
});
