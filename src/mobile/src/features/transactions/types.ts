export type WalletType = 'cash' | 'bank' | 'ewallet';

export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
};

export type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'bill'
  | 'income'
  | 'bonus'
  | 'other';

/** Giao dịch được tạo bằng cách quét hóa đơn (OCR) hay nhập tay */
export type TransactionSource = 'ocr' | 'manual';

export type Transaction = {
  id: string;
  title: string;
  category: Category;
  walletId: string;
  walletName: string;
  /** Âm là chi, dương là thu */
  amount: number;
  /** ISO 8601 */
  date: string;
  note?: string;
  source: TransactionSource;
};
