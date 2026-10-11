import { AuthSuccess } from '@/features/auth/components/AuthSuccess';

export default function ResetSuccessScreen() {
  return (
    <AuthSuccess
      title="Đổi mật khẩu thành công"
      message="Mật khẩu của bạn đã được cập nhật. Hãy dùng mật khẩu mới để đăng nhập vào Smart Finance."
    />
  );
}
