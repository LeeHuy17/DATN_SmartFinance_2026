"""Quên mật khẩu: tạo, gửi và kiểm tra mã OTP qua email, cấp token đặt lại mật khẩu."""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken, OutstandingToken,
)

from .models import PasswordResetCode

User = get_user_model()

# Khớp với OTP_LENGTH, OTP_TTL_SECONDS, RESEND_COOLDOWN_SECONDS bên app mobile
CODE_LENGTH = 6
CODE_TTL = timedelta(minutes=5)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 5
RESET_TOKEN_MAX_AGE = 10 * 60  # giây, thời gian để hoàn tất bước đặt mật khẩu mới

_SALT = "accounts.password_reset"


def _hash_code(code):
    return salted_hmac(_SALT, code).hexdigest()


def issue_code(user):
    """Tạo mã mới và vô hiệu các mã cũ. Trả về None nếu vừa gửi trong thời gian chờ."""
    now = timezone.now()
    latest = user.password_reset_codes.first()
    if latest and now - latest.created_at < RESEND_COOLDOWN:
        return None

    user.password_reset_codes.filter(used_at__isnull=True).update(used_at=now)
    code = f"{secrets.randbelow(10 ** CODE_LENGTH):0{CODE_LENGTH}d}"
    PasswordResetCode.objects.create(
        user=user, code_hash=_hash_code(code), expires_at=now + CODE_TTL
    )
    return code


def send_code_email(user, code):
    minutes = int(CODE_TTL.total_seconds() // 60)
    name = user.full_name or user.email
    subject = "[Smart Finance] Mã xác thực đặt lại mật khẩu"
    text = (
        f"Xin chào {name},\n\n"
        f"Mã xác thực để đặt lại mật khẩu Smart Finance của bạn là: {code}\n\n"
        f"Mã có hiệu lực trong {minutes} phút. Không chia sẻ mã này với bất kỳ ai.\n"
        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.\n"
    )
    html = (
        '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2937">'
        "<h2>Đặt lại mật khẩu</h2>"
        f"<p>Xin chào {name},</p>"
        "<p>Mã xác thực để đặt lại mật khẩu Smart Finance của bạn là:</p>"
        f'<p style="font-size:32px;font-weight:bold;letter-spacing:8px">{code}</p>'
        f"<p>Mã có hiệu lực trong <b>{minutes} phút</b>. Không chia sẻ mã này với bất kỳ ai.</p>"
        '<p style="color:#6b7280;font-size:13px">Nếu bạn không yêu cầu đặt lại mật khẩu, '
        "hãy bỏ qua email này.</p></div>"
    )
    send_mail(
        subject, text, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html
    )


def verify_code(user, code):
    """Kiểm tra mã mới nhất của user; đúng thì đánh dấu đã dùng."""
    entry = user.password_reset_codes.filter(used_at__isnull=True).first()
    if (
        entry is None
        or entry.expires_at < timezone.now()
        or entry.attempts >= MAX_ATTEMPTS
    ):
        return False

    entry.attempts += 1
    if constant_time_compare(entry.code_hash, _hash_code(code)):
        entry.used_at = timezone.now()
    entry.save(update_fields=["attempts", "used_at"])
    return entry.used_at is not None


def make_reset_token(user):
    # Token của Django gắn với mật khẩu hiện tại nên tự hết hiệu lực sau khi đổi mật khẩu
    return signing.dumps(
        {"uid": user.pk, "token": default_token_generator.make_token(user)}, salt=_SALT
    )


def get_user_from_reset_token(reset_token):
    try:
        data = signing.loads(reset_token, salt=_SALT, max_age=RESET_TOKEN_MAX_AGE)
        user = User.objects.get(pk=data["uid"], is_active=True)
    except (signing.BadSignature, User.DoesNotExist, KeyError, TypeError):
        return None
    if not default_token_generator.check_token(user, data["token"]):
        return None
    return user


def revoke_refresh_tokens(user):
    """Đăng xuất mọi thiết bị: đưa toàn bộ refresh token của user vào blacklist."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
