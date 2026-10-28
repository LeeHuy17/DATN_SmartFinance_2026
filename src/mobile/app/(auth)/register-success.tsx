import { AuthSuccess } from '@/features/auth/components/AuthSuccess';

export default function RegisterSuccessScreen() {
  return (
    <AuthSuccess
      title="Đăng ký thành công"
      message="Tài khoản của bạn đã được tạo cùng các danh mục thu chi mặc định. Hãy đăng nhập để bắt đầu dùng FinBuddy."
    />
  );
}
