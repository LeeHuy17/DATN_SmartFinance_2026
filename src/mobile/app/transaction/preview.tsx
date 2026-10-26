import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ConfirmReceipt } from '@/features/ocr/components/ConfirmReceipt';
import { discardReceipt, OCR_STEPS, recognizeReceipt, type OcrFields, type OcrStep } from '@/features/ocr/ocrApi';
import { getPendingReceipt, setOcrDraft } from '@/features/ocr/pendingReceipt';
import { formatFullDate, formatVnd } from '@/lib/format';
import { makeStyles, radius, spacing, useColors } from '@/theme';

type Phase =
  | { kind: 'reading'; step: OcrStep }
  /** Đọc được: chờ người dùng kiểm tra và xác nhận (UI-03) */
  | { kind: 'confirm'; fields: OcrFields & { total: number } }
  | { kind: 'failed'; reason: string; fields: OcrFields; retryable?: boolean }
  | { kind: 'no-image' };

/** Đọc hóa đơn vừa chụp: tiến trình → xác nhận kết quả (hoặc báo lỗi nếu không đọc được) */
export default function ReceiptPreviewScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const receipt = getPendingReceipt();
  const [phase, setPhase] = useState<Phase>(
    receipt ? { kind: 'reading', step: 'enhance' } : { kind: 'no-image' },
  );
  const signal = useRef({ cancelled: false });

  const read = () => {
    if (!receipt) return;
    const s = signal.current;
    setPhase({ kind: 'reading', step: 'enhance' });
    recognizeReceipt(receipt.uri, (step) => !s.cancelled && setPhase({ kind: 'reading', step }), s)
      .then((result) => {
        if (s.cancelled) return;
        if (result.status === 'ok') {
          setPhase({ kind: 'confirm', fields: result.fields });
        } else {
          setPhase({ kind: 'failed', reason: result.reason, fields: result.fields, retryable: result.retryable });
        }
      })
      .catch(() => {
        if (!s.cancelled) setPhase({ kind: 'failed', reason: 'Không đọc được ảnh. Vui lòng chụp lại.', fields: {} });
      });
  };

  useEffect(() => {
    read();
    return () => {
      signal.current.cancelled = true;
    };
    // Chỉ đọc một lần cho mỗi lần mở màn
  }, []);

  /** Bỏ ảnh hóa đơn đã lưu trên server khi người dùng không dùng nữa */
  const discard = () => {
    if ((phase.kind === 'confirm' || phase.kind === 'failed') && phase.fields.receiptId) {
      void discardReceipt(phase.fields.receiptId);
    }
  };

  /** Quay về màn quét để chụp lại (hoặc hủy khi đang đọc) */
  const backToScanner = () => {
    signal.current.cancelled = true;
    discard();
    if (router.canGoBack()) router.back();
    else router.replace('/receipt/scan');
  };

  const manualWithReadData = (fields: OcrFields) => {
    setOcrDraft({ ...fields, complete: false });
    router.replace('/transaction/add');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Xem trước hóa đơn" fallbackHref="/receipt/scan" />

      {phase.kind === 'reading' && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <ScanningImage uri={receipt?.uri} />
            <Text style={styles.heading}>Đang đọc hóa đơn...</Text>
            <Text style={styles.sub}>Có thể mất vài giây, vui lòng chờ.</Text>

            <View style={styles.card} accessibilityRole="progressbar" accessibilityLabel="Tiến trình đọc hóa đơn">
              {OCR_STEPS.map((s, i) => {
                const current = OCR_STEPS.findIndex((x) => x.key === phase.step);
                const state = i < current ? 'done' : i === current ? 'active' : 'pending';
                return <StepRow key={s.key} label={s.label} state={state} />;
              })}
            </View>

            <View style={[styles.card, styles.skeleton]}>
              <View style={[styles.bone, { width: '100%' }]} />
              <View style={[styles.bone, { width: '70%' }]} />
              <View style={[styles.bone, { width: '50%' }]} />
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <SecondaryButton title="Hủy" onPress={backToScanner} />
          </View>
        </>
      )}

      {phase.kind === 'confirm' && (
        <ConfirmReceipt
          uri={receipt?.uri}
          fields={phase.fields}
          onRetake={backToScanner}
          // Hủy bỏ: không lưu gì, đóng cả luồng quét
          onCancel={() => {
            discard();
            router.dismissTo('/');
          }}
          // Lưu xong về Tổng quan để thấy giao dịch vừa thêm
          onSaved={() => router.dismissTo('/')}
        />
      )}

      {phase.kind === 'failed' && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="warning-outline" size={16} color={colors.danger} style={styles.bannerIcon} />
              <Text style={styles.errorText}>
                <Text style={styles.errorStrong}>Không đọc được hóa đơn. </Text>
                {phase.reason}
              </Text>
            </View>

            <View style={styles.tips}>
              {receipt?.uri ? (
                <Image source={{ uri: receipt.uri }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={styles.flex}>
                <Text style={styles.tipsTitle}>Mẹo chụp rõ hơn</Text>
                <Text style={styles.tipsText}>
                  Đủ sáng, giữ máy thẳng, trải phẳng hóa đơn và chụp trọn bốn góc.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Field
                label="Ngày giao dịch (đọc được)"
                value={phase.fields.date ? formatFullDate(phase.fields.date) : 'Chưa đọc được'}
                missing={!phase.fields.date}
              />
              {phase.fields.merchant && <Field label="Cửa hàng" value={phase.fields.merchant} />}
              <Field
                label="Tổng tiền"
                value={phase.fields.total ? formatVnd(phase.fields.total) : 'Chưa đọc được'}
                missing={!phase.fields.total}
                last
              />
            </View>
          </ScrollView>
          <View style={[styles.footer, styles.footerGap]}>
            {phase.retryable ? (
              <PrimaryButton title="Thử lại" onPress={read} />
            ) : (
              <PrimaryButton title="Chụp lại" onPress={backToScanner} />
            )}
            <SecondaryButton title={phase.fields.receiptId ? 'Nhập tay với dữ liệu đã đọc' : 'Nhập tay'} onPress={() => manualWithReadData(phase.fields)} />
          </View>
        </>
      )}

      {phase.kind === 'no-image' && (
        <View style={styles.content}>
          <Text style={styles.sub}>Chưa có ảnh hóa đơn. Hãy quay lại màn quét để chụp.</Text>
          <PrimaryButton title="Mở màn quét" onPress={() => router.replace('/receipt/scan')} style={styles.noImageButton} />
        </View>
      )}
    </SafeAreaView>
  );
}

/** Ảnh hóa đơn kèm vạch quét chạy lên xuống trong lúc đọc */
function ScanningImage({ uri }: { uri?: string }) {
  const styles = useStyles();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(progress, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, IMAGE_HEIGHT - 10] });

  return (
    <View style={styles.imageBox}>
      {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Ảnh hóa đơn" />}
      <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
    </View>
  );
}

function StepRow({ label, state }: { label: string; state: 'done' | 'active' | 'pending' }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.step} accessibilityLabel={`${label}: ${state === 'done' ? 'xong' : state === 'active' ? 'đang chạy' : 'chờ'}`}>
      {state === 'done' ? (
        <View style={styles.stepDone}>
          <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
        </View>
      ) : state === 'active' ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.stepIcon} />
      ) : (
        <View style={styles.stepPending} />
      )}
      <Text style={[styles.stepText, state === 'pending' && styles.stepTextPending]}>{label}</Text>
    </View>
  );
}

function Field({ label, value, missing, last }: { label: string; value: string; missing?: boolean; last?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.field, !last && styles.fieldDivider]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, missing && styles.fieldMissing]}>{value}</Text>
    </View>
  );
}

function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable style={styles.secondary} onPress={onPress} accessibilityRole="button">
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

const IMAGE_HEIGHT = 150;

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  imageBox: {
    height: IMAGE_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.disabled,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  heading: { marginTop: spacing.lg, fontSize: 18, fontWeight: '700', color: colors.text },
  sub: { marginTop: spacing.xs, fontSize: 13, color: colors.textMuted },
  card: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingVertical: spacing.sm + 2 },
  stepIcon: { width: 20, height: 20 },
  stepDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPending: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  stepTextPending: { color: colors.textMuted },
  skeleton: { gap: spacing.md - 2, paddingVertical: spacing.md },
  bone: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted },
  errorBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md - 4,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  bannerIcon: { marginTop: 2 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.danger },
  errorStrong: { fontWeight: '700' },
  tips: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  thumb: { width: 72, height: 96, borderRadius: radius.md, backgroundColor: colors.disabled },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  tipsText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  field: { paddingVertical: spacing.sm + 2 },
  fieldDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  fieldLabel: { fontSize: 12, color: colors.textMuted },
  fieldValue: { marginTop: 2, fontSize: 16, fontWeight: '700', color: colors.text },
  fieldMissing: { color: colors.danger, fontWeight: '600' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  footerGap: { gap: spacing.sm + 2 },
  secondary: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
  noImageButton: { marginTop: spacing.md },
}));
