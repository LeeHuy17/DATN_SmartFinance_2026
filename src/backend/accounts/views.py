import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from notifications.services import notify_password_changed

from . import password_reset
from .avatar import InvalidImage, process_avatar
from .serializers import (
    ChangePasswordSerializer, LoginSerializer, LogoutSerializer, PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer, PasswordResetVerifySerializer,
    RegisterSerializer, UserSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AvatarView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "avatar_upload"

    def post(self, request):
        upload = request.FILES.get("avatar")
        if not upload:
            raise DRFValidationError({"avatar": "Chưa chọn ảnh."})
        try:
            content = process_avatar(upload)
        except InvalidImage as e:
            raise DRFValidationError({"avatar": str(e)})

        user = request.user
        old = user.avatar.name if user.avatar else None
        user.avatar.save("avatar.jpg", content, save=False)  # tên thật do avatar_path sinh
        user.save(update_fields=["avatar"])
        if old:
            default_storage.delete(old)
        return Response(UserSerializer(user, context={"request": request}).data)

    def delete(self, request):
        user = request.user
        if user.avatar:
            old = user.avatar.name
            user.avatar = None
            user.save(update_fields=["avatar"])
            default_storage.delete(old)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    """Đổi mật khẩu khi đang đăng nhập: thu hồi mọi phiên cũ, cấp cặp token mới cho máy hiện tại"""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        password_reset.revoke_refresh_tokens(user)
        notify_password_changed(user)
        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


class LogoutView(APIView):
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response(
                {"detail": "Token không hợp lệ hoặc đã hết hạn."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetBaseView(APIView):
    permission_classes = (permissions.AllowAny,)
    # Bỏ qua header Authorization để token cũ/hết hạn trên máy không làm request bị 401
    authentication_classes = ()


class PasswordResetRequestView(PasswordResetBaseView):
    """Bước 1: gửi mã OTP qua email"""

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email=serializer.validated_data["email"], is_active=True
        ).first()
        if user:
            code = password_reset.issue_code(user)
            if code:
                try:
                    password_reset.send_code_email(user, code)
                except Exception:
                    logger.exception("Gửi email đặt lại mật khẩu thất bại: %s", user.email)
                    return Response(
                        {"detail": "Không gửi được email. Vui lòng thử lại sau."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
        # Luôn trả cùng một câu để không lộ email nào đã đăng ký
        return Response({"detail": "Nếu email đã đăng ký, mã xác thực đã được gửi tới email."})


class PasswordResetVerifyView(PasswordResetBaseView):
    """Bước 2: kiểm tra mã OTP, trả về reset_token cho bước 3"""

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email=serializer.validated_data["email"], is_active=True
        ).first()
        if not user or not password_reset.verify_code(user, serializer.validated_data["code"]):
            return Response(
                {"detail": "Mã xác thực không đúng hoặc đã hết hạn."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"reset_token": password_reset.make_reset_token(user)})


class PasswordResetConfirmView(PasswordResetBaseView):
    """Bước 3: đặt mật khẩu mới và đăng xuất mọi thiết bị"""

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = password_reset.get_user_from_reset_token(serializer.validated_data["reset_token"])
        if user is None:
            return Response(
                {"reset_token": ["Phiên đặt lại mật khẩu đã hết hạn. Vui lòng làm lại từ đầu."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_password = serializer.validated_data["new_password"]
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"new_password": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        password_reset.revoke_refresh_tokens(user)
        notify_password_changed(user, via_reset=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
