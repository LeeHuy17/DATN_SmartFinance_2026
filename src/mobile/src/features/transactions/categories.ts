import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';
import type { CategoryKind, IconName } from './types';

/** Bảng màu cho danh mục (theo thiết kế, 8 màu) */
export const CATEGORY_COLORS = [
  '#0F6B4F',
  '#2F6FB5',
  '#E08A1E',
  '#C8436B',
  '#7C5CB5',
  '#1F8A85',
  '#8A6A3D',
  '#5E6A65',
] as const;

/**
 * Bộ biểu tượng chọn cho danh mục: 12 biểu tượng theo thiết kế, thêm 6 biểu tượng để phủ hết
 * danh mục mặc định của server (backend/categories/defaults.py, ví dụ "Đầu tư") và đủ 3 hàng.
 * Server lưu thẳng tên Ionicons nên khóa icon chính là tên icon.
 */
export const CATEGORY_ICONS: IconName[] = [
  'cafe-outline',
  'cart-outline',
  'car-outline',
  'home-outline',
  'film-outline',
  'heart-outline',
  'book-outline',
  'gift-outline',
  'paper-plane-outline',
  'flash-outline',
  'pricetag-outline',
  'wallet-outline',
  'trending-up-outline',
  'restaurant-outline',
  'bus-outline',
  'shirt-outline',
  'medkit-outline',
  'school-outline',
];

export const FALLBACK_ICON: IconName = 'pricetag-outline';

/** Khóa icon từ server → icon thật; khóa lạ (dữ liệu cũ, gõ tay trong admin) thì dùng icon mặc định */
export const resolveIcon = (key: string): IconName =>
  key in Ionicons.glyphMap ? (key as IconName) : FALLBACK_ICON;

/** Nền nhạt của một màu danh mục (độ mờ ~13%) */
export const softColor = (hex: string) => `${hex}22`;

/**
 * Lựa chọn Chi tiêu / Thu nhập cho SegmentedControl, dùng chung ở Thêm giao dịch và Quản lý danh mục.
 * Chi tiêu: chữ đỏ nền hồng (gợi ý trừ tiền); Thu nhập: chữ xanh nền xanh nhạt.
 */
export const KIND_OPTIONS: {
  value: CategoryKind;
  label: string;
  selectedColor: string;
  selectedBackground: string;
}[] = [
  { value: 'expense', label: 'Chi tiêu', selectedColor: colors.danger, selectedBackground: colors.dangerSoft },
  { value: 'income', label: 'Thu nhập', selectedColor: colors.primary, selectedBackground: colors.primarySoft },
];
