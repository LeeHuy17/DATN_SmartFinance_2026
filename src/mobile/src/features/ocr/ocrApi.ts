// Quét hóa đơn: gửi ảnh lên POST /receipts/scan/ (OpenCV + EasyOCR chạy trên server).
// Server chỉ trả bản nháp, giao dịch chỉ được tạo khi người dùng xác nhận.
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { ApiError, apiDetail, apiFetch, getFieldErrors } from '@/lib/api/client';
import { parseMoney } from '@/lib/money';

export type OcrStep = 'enhance' | 'recognize' | 'extract';

export const OCR_STEPS: { key: OcrStep; label: string }[] = [
  { key: 'enhance', label: 'Làm rõ và căn chỉnh ảnh' },
  { key: 'recognize', label: 'Nhận diện chữ' },
  { key: 'extract', label: 'Bóc tách tên cửa hàng, ngày, tổng tiền' },
];

/** Trường cần người dùng kiểm tra lại vì server không chắc chắn */
export type ReviewField = 'total' | 'date' | 'merchant' | 'category';

/** Những gì đọc được từ hóa đơn; thiếu trường nào thì để undefined */
export type OcrFields = {
  merchant?: string;
  /** ISO 8601 */
  date?: string;
  total?: number;
  /** Danh mục server gợi ý theo tên cửa hàng */
  categoryId?: string;
  /** Hóa đơn đã lưu trên server, gửi kèm khi tạo giao dịch */
  receiptId?: number;
  needsReview?: ReviewField[];
};

export type OcrResult =
  | { status: 'ok'; fields: OcrFields & { total: number } }
  /** Không đọc được tổng tiền (ảnh mờ, thiếu góc...) nhưng có thể đọc được vài trường khác */
  | { status: 'failed'; reason: string; fields: OcrFields; retryable?: boolean };

type ApiReceipt = {
  id: number;
  merchant: string;
  /** Decimal dạng chuỗi, null nếu không tìm thấy */
  total: string | null;
  /** YYYY-MM-DD */
  receipt_date: string | null;
  suggested_category: number | null;
  needs_review: ReviewField[];
};

const toFields = (r: ApiReceipt): OcrFields => ({
  merchant: r.merchant || undefined,
  // Ngày trên hóa đơn không có giờ: lấy 12h trưa để không lệch ngày khi đổi múi giờ
  date: r.receipt_date ? new Date(`${r.receipt_date}T12:00:00`).toISOString() : undefined,
  total: r.total !== null ? parseMoney(r.total) : undefined,
  categoryId: r.suggested_category !== null ? String(r.suggested_category) : undefined,
  receiptId: r.id,
  needsReview: r.needs_review,
});

async function uploadReceipt(uri: string): Promise<ApiReceipt> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    form.append('image', await (await fetch(uri)).blob(), 'receipt.jpg');
  } else {
    // fetch của Expo không nhận kiểu { uri, name, type }; File (expo-file-system) là Blob nên gửi được
    form.append('image', new File(uri) as unknown as Blob, 'receipt.jpg');
  }
  // Server đọc ảnh bằng CPU nên có thể mất vài giây đến hơn chục giây
  return apiFetch<ApiReceipt>('/receipts/scan/', { method: 'POST', body: form }, { timeoutMs: 90000 });
}

/** Xóa ảnh hóa đơn đã quét mà không dùng (server cũng tự dọn sau 24 giờ nên lỗi cũng không sao) */
export const discardReceipt = (id: number): Promise<void> =>
  apiFetch<null>(`/receipts/${id}/`, { method: 'DELETE' }).then(
    () => undefined,
    () => undefined,
  );

const failed = (reason: string, retryable = false): OcrResult => ({
  status: 'failed',
  reason,
  fields: {},
  retryable,
});

/**
 * Đọc hóa đơn từ ảnh. `onStep` báo bước đang chạy để hiển thị tiến trình.
 * `signal` để hủy khi người dùng bấm "Hủy".
 */
export async function recognizeReceipt(
  uri: string,
  onStep: (step: OcrStep) => void,
  signal?: { cancelled: boolean },
): Promise<OcrResult> {
  // Server chạy một lượt, không báo từng bước: đổi bước theo thời gian cho người dùng thấy tiến triển
  onStep('enhance');
  const timers = [setTimeout(() => onStep('recognize'), 1500), setTimeout(() => onStep('extract'), 6000)];
  try {
    const receipt = await uploadReceipt(uri);
    if (signal?.cancelled) {
      // Người dùng đã hủy trong lúc chờ: bỏ ảnh vừa lưu trên server
      void discardReceipt(receipt.id);
      throw new Error('CANCELLED');
    }
    const fields = toFields(receipt);
    if (fields.total === undefined) {
      return {
        status: 'failed',
        reason: 'Chưa tìm thấy tổng tiền trên hóa đơn.',
        fields,
      };
    }
    return { status: 'ok', fields: { ...fields, total: fields.total } };
  } catch (e) {
    if (!(e instanceof ApiError)) {
      if (e instanceof Error && e.message === 'CANCELLED') throw e;
      return failed('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', true);
    }
    if (e.status === 400) return failed(getFieldErrors(e).image ?? 'Ảnh không hợp lệ. Hãy chọn ảnh khác.');
    if (e.status === 429) return failed('Bạn quét quá nhiều lần. Hãy thử lại sau hoặc nhập tay.');
    if (e.status === 422 || e.status === 503) {
      return failed(apiDetail(e) ?? 'Không đọc được hóa đơn. Bạn có thể nhập tay.');
    }
    throw e;
  } finally {
    timers.forEach(clearTimeout);
  }
}
