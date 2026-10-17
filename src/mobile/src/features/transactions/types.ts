import type { Ionicons } from '@expo/vector-icons';

export type WalletType = 'cash' | 'bank' | 'ewallet' | 'credit' | 'savings';

/** Số tiền là số nguyên đồng, đã quy đổi từ chuỗi Decimal của server (xem lib/money.ts) */
export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  /** Số dư hiện tại do server tính */
  balance: number;
  initialBalance: number;
  /** Có cộng vào tổng tài sản không */
  includeInTotal: boolean;
  isArchived: boolean;
};

export type CategoryKind = 'expense' | 'income';
export type IconName = keyof typeof Ionicons.glyphMap;

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Mã màu #RRGGBB trong bảng màu CATEGORY_COLORS */
  color: string;
  icon: IconName;
  /** Ẩn khỏi danh sách chọn khi thêm giao dịch (giao dịch cũ vẫn giữ danh mục) */
  hidden: boolean;
};

/** Phần thông tin danh mục đi kèm mỗi giao dịch để hiển thị */
export type CategoryRef = Pick<Category, 'id' | 'name' | 'color' | 'icon'>;

/** Giao dịch được tạo bằng cách quét hóa đơn (OCR) hay nhập tay */
export type TransactionSource = 'ocr' | 'manual';

export type Transaction = {
  id: string;
  title: string;
  category: CategoryRef;
  walletId: string;
  walletName: string;
  /** Âm là chi, dương là thu */
  amount: number;
  /** ISO 8601 */
  date: string;
  note?: string;
  source: TransactionSource;
};

/** Dữ liệu gửi lên khi tạo / sửa giao dịch */
export type TransactionInput = Omit<Transaction, 'id' | 'walletName' | 'category'> & {
  categoryId: string;
};
