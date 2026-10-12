// TODO: thay phần giả lập bằng API OCR thật (upload ảnh lên backend, nhận kết quả bóc tách).
// Giữ nguyên chữ ký hàm để màn Xem trước không phải sửa.

export type OcrStep = 'enhance' | 'recognize' | 'extract';

export const OCR_STEPS: { key: OcrStep; label: string }[] = [
  { key: 'enhance', label: 'Làm rõ và căn chỉnh ảnh' },
  { key: 'recognize', label: 'Nhận diện chữ' },
  { key: 'extract', label: 'Bóc tách tên cửa hàng, ngày, tổng tiền' },
];

/** Những gì đọc được từ hóa đơn; thiếu trường nào thì để undefined */
export type OcrFields = {
  merchant?: string;
  /** ISO 8601 */
  date?: string;
  total?: number;
  /** Danh mục đoán theo tên cửa hàng */
  categoryId?: string;
};

export type OcrResult =
  | { status: 'ok'; fields: OcrFields & { total: number } }
  /** Không tìm thấy tổng tiền (ảnh mờ, thiếu góc...) nhưng có thể đọc được vài trường khác */
  | { status: 'failed'; reason: string; fields: OcrFields };

// ---------- Chế độ giả lập (chỉ để xem trạng thái lỗi khi chưa có backend) ----------
let forceFailure = false;
export const isOcrFailureForced = () => forceFailure;
export const toggleOcrFailure = () => (forceFailure = !forceFailure);

const SAMPLES: (OcrFields & { total: number })[] = [
  // Trùng một giao dịch mẫu đã có, để xem được cảnh báo "Có thể trùng hóa đơn"
  { merchant: 'Co.opmart Đà Nẵng', total: 312_500, categoryId: 'c-shopping' },
  { merchant: 'Highlands Coffee', total: 85_000, categoryId: 'c-food' },
  { merchant: 'Bách Hóa Xanh', total: 186_000, categoryId: 'c-shopping' },
  { merchant: 'Phúc Long', total: 65_000, categoryId: 'c-food' },
];
let sampleIndex = 0;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Đọc hóa đơn từ ảnh. `onStep` báo bước đang chạy để hiển thị tiến trình.
 * `signal` để hủy khi người dùng bấm "Hủy".
 */
export async function recognizeReceipt(
  _uri: string,
  onStep: (step: OcrStep) => void,
  signal?: { cancelled: boolean },
): Promise<OcrResult> {
  for (const step of OCR_STEPS) {
    if (signal?.cancelled) throw new Error('CANCELLED');
    onStep(step.key);
    await delay(900);
  }
  if (signal?.cancelled) throw new Error('CANCELLED');

  const today = new Date().toISOString();
  if (forceFailure) {
    return {
      status: 'failed',
      reason: 'Ảnh quá mờ hoặc thiếu góc nên chưa tìm thấy tổng tiền.',
      fields: { date: today },
    };
  }
  const sample = SAMPLES[sampleIndex++ % SAMPLES.length];
  return { status: 'ok', fields: { ...sample, date: today } };
}
