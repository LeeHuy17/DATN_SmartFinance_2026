import { normalizeText } from '@/features/transactions/filters';
import type { Transaction } from '@/features/transactions/types';

/** Cách nhau tối đa chừng này ngày thì mới coi là có thể trùng */
const WINDOW_DAYS = 7;

/** Từ đầu của tên cửa hàng, bỏ dấu: "Co.opmart Đà Nẵng" → "co.opmart" */
const firstWord = (name: string) => normalizeText(name).split(/\s+/)[0] ?? '';

/**
 * Tìm giao dịch đã có giống hóa đơn vừa quét: cùng số tiền chi, cùng cửa hàng (từ đầu tên)
 * và ngày cách nhau không quá 7 ngày. Chỉ để cảnh báo, người dùng vẫn được lưu.
 */
export function findPossibleDuplicate(
  all: Transaction[],
  receipt: { merchant: string; total: number; date: Date },
): Transaction | null {
  if (receipt.total <= 0) return null;
  const word = firstWord(receipt.merchant);
  return (
    all.find((t) => {
      if (t.amount !== -receipt.total) return false;
      const days = Math.abs(new Date(t.date).getTime() - receipt.date.getTime()) / 86_400_000;
      if (days > WINDOW_DAYS) return false;
      return word.length > 0 && firstWord(t.title) === word;
    }) ?? null
  );
}
