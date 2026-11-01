// Backend trả DecimalField dạng chuỗi ("1500000.00"). VND không có xu nên app quy về số nguyên đồng:
// cộng trừ số nguyên trong JS là chính xác (tới ~9 triệu tỷ), tránh sai số khi parseFloat rồi cộng dồn.

const MONEY_RE = /^(-?)(\d+)(?:\.(\d*))?$/;

/** "1500000.00" → 1500000, "-25000.50" → -25001 (làm tròn theo chữ số thập phân đầu); sai định dạng → 0 */
export function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Math.round(value);
  const m = MONEY_RE.exec((value ?? '').trim());
  if (!m) return 0;
  const [, sign, integer, fraction = ''] = m;
  const n = Number(integer) + (fraction[0] >= '5' ? 1 : 0);
  return sign && n !== 0 ? -n : n;
}

/** Số nguyên đồng → chuỗi gửi lên server: 1500000 → "1500000" */
export const toMoneyString = (amount: number) => String(Math.round(amount));
