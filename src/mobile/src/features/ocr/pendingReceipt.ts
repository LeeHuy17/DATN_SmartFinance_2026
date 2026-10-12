// Dữ liệu chuyển giữa các màn của luồng quét hóa đơn, giữ trong bộ nhớ thay vì truyền qua
// tham số đường dẫn (trên web ảnh chụp là data URI rất dài).
import type { OcrFields } from './ocrApi';

export type PendingReceipt = { uri: string; source: 'camera' | 'gallery' };

let pending: PendingReceipt | null = null;

/** Ảnh vừa chụp / chọn, chờ màn Xem trước đọc */
export const setPendingReceipt = (receipt: PendingReceipt) => {
  pending = receipt;
};

export const getPendingReceipt = () => pending;

/** Kết quả đọc được, chờ màn Thêm giao dịch điền sẵn; `complete` = đã có tổng tiền */
export type OcrDraft = OcrFields & { complete: boolean };

let draft: OcrDraft | null = null;

export const setOcrDraft = (d: OcrDraft) => {
  draft = d;
};

/** Lấy một lần rồi xóa, để mở lại màn Thêm giao dịch không bị điền lại */
export const takeOcrDraft = () => {
  const d = draft;
  draft = null;
  return d;
};
