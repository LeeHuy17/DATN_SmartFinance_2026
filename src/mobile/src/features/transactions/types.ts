import type { Ionicons } from '@expo/vector-icons';

import type { BudgetAlert } from '@/features/budgets/budgetsApi';

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

/** Giao dịch để hiển thị, quy đổi từ dữ liệu server (xem transactionsApi.ts) */
export type Transaction = {
  id: string;
  /** Tên hiển thị: ghi chú, không có thì tên danh mục */
  title: string;
  category: CategoryRef;
  walletId: string;
  walletName: string;
  /** Số nguyên đồng; âm là chi, dương là thu */
  amount: number;
  /** ISO 8601, lúc 0h của ngày giao dịch theo giờ máy (server chỉ lưu ngày, không có giờ) */
  date: string;
  note?: string;
  source: TransactionSource;
  /** Ảnh hóa đơn đã quét gắn với giao dịch, nếu có */
  receiptImageUrl?: string;
  /** Chỉ có ngay sau khi tạo / sửa giao dịch chi: ngân sách vừa chạm ngưỡng hoặc vượt mức */
  budgetAlerts?: BudgetAlert[];
};

/** Dữ liệu gửi lên khi tạo / sửa giao dịch. Loại thu / chi do server tự suy ra từ danh mục */
export type TransactionInput = {
  categoryId: string;
  walletId: string;
  /** Số nguyên đồng, luôn dương */
  amount: number;
  /** YYYY-MM-DD theo giờ máy (lib/date.ts → toYmd) */
  date: string;
  note: string;
  source: TransactionSource;
  /** Id hóa đơn đã quét (từ POST /receipts/scan/) để đính kèm giao dịch */
  receiptId?: number;
};
