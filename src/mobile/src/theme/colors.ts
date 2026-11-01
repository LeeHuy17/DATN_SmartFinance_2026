// Bảng màu sáng lấy theo bản thiết kế trong designs/
export const lightColors = {
  primary: '#0F6B4F',
  primarySoft: '#DFEEE7',
  onPrimary: '#FFFFFF',
  background: '#FFFFFF',
  surfaceMuted: '#F3F5F2',
  text: '#13221C',
  textMuted: '#5E6A65',
  border: '#D4D6D5',
  danger: '#B3261E',
  dangerSoft: '#FBEFEE',
  disabled: '#E6EAE6',
  // Dashboard
  screen: '#F4F6F2',
  skeleton: '#E8ECE7',
  divider: '#E3E7E2',
  expense: '#B45309',
  badge: '#C2410C',
  warmSoft: '#FFF1D6',
  warm: '#8A5A00',
  walletBank: '#1F4E79',
  walletEwallet: '#A84300',
  infoSoft: '#E3ECF7',
  overlay: 'rgba(19, 34, 28, 0.45)',
  /** Nền ngược tông (toast, thẻ tín dụng): tối trên giao diện sáng, sáng trên giao diện tối */
  inverseSurface: '#13221C',
  onInverseSurface: '#FFFFFF',
  /** Màu đổ bóng: bóng xanh đen trên nền sáng, đen hẳn trên nền tối */
  shadow: '19, 34, 28',
};

export type Colors = typeof lightColors;

/**
 * Bảng màu tối, cùng khóa với bảng sáng. Nền xám ánh xanh lá (cùng sắc với chữ #13221C) thay vì
 * đen tuyền; thẻ (background) sáng hơn nền màn (screen) để vẫn thấy lớp như giao diện sáng.
 * Màu nhấn sáng hơn để đọc được trên nền tối; primary vẫn đủ đậm cho chữ trắng trên nút.
 */
export const darkColors: Colors = {
  primary: '#1F9A6F',
  primarySoft: '#173A2E',
  onPrimary: '#FFFFFF',
  background: '#18221E',
  surfaceMuted: '#212C27',
  text: '#E6EDE9',
  textMuted: '#9AA8A1',
  border: '#3A4741',
  danger: '#F2867E',
  dangerSoft: '#3A1F1D',
  disabled: '#2A3530',
  screen: '#0F1613',
  skeleton: '#26312C',
  divider: '#2A3530',
  expense: '#F0A65A',
  badge: '#E8692E',
  warmSoft: '#3A2E12',
  warm: '#F2C25C',
  walletBank: '#7FB2E5',
  walletEwallet: '#F59E5B',
  infoSoft: '#1C2B3D',
  overlay: 'rgba(0, 0, 0, 0.6)',
  inverseSurface: '#E6EDE9',
  onInverseSurface: '#13221C',
  shadow: '0, 0, 0',
};
