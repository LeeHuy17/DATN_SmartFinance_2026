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

/** Bộ biểu tượng chọn cho danh mục (theo thiết kế, 12 biểu tượng) */
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
];

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
