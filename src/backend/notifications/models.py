from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Notification(models.Model):
    """Một thông báo trong Hộp thư của người dùng (server tạo, app chỉ đọc và đánh dấu đã đọc)."""

    class Type(models.TextChoices):
        BUDGET = "budget", "Ngân sách"
        OCR = "ocr", "Quét hóa đơn"
        ADVICE = "advice", "Lời khuyên AI"
        REMINDER = "reminder", "Nhắc ghi chép"
        SECURITY = "security", "Bảo mật"

    class Tone(models.TextChoices):
        DEFAULT = "", "Mặc định"
        DANGER = "danger", "Nguy hiểm"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=10, choices=Type.choices)
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=500, blank=True)
    # Màn app mở ra khi chạm vào, vd. "/advice"
    link = models.CharField(max_length=200, blank=True)
    tone = models.CharField(max_length=10, choices=Tone.choices, blank=True, default=Tone.DEFAULT)
    # Khóa chống trùng: mỗi người dùng chỉ có một thông báo cho mỗi key (xem services.notify)
    key = models.CharField(max_length=100, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(fields=("user", "-created_at"), name="notif_user_created_idx"),
            models.Index(fields=("user", "read_at"), name="notif_user_read_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("user", "key"), condition=~Q(key=""), name="uniq_notification_user_key"
            ),
        ]

    def __str__(self):
        return f"{self.user} · {self.title}"


class NotificationSetting(models.Model):
    """Cài đặt thông báo của một người dùng. Thông báo bảo mật luôn được gửi, không tắt được."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_setting"
    )
    # Theo loại (khớp Notification.Type, trừ security)
    budget = models.BooleanField(default=True)
    ocr = models.BooleanField(default=True)
    reminder = models.BooleanField(default=True)
    advice = models.BooleanField(default=False)
    # Kênh nhận
    banner = models.BooleanField(default=True)
    push = models.BooleanField(default=True)
    email = models.BooleanField(default=False)
    # Tháng gần nhất đã gửi email tổng kết ("2026-09"), để không gửi trùng
    last_digest_month = models.CharField(max_length=7, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def allows(self, notification_type):
        if notification_type == Notification.Type.SECURITY:
            return True
        return getattr(self, notification_type, True)

    def __str__(self):
        return f"Cài đặt thông báo của {self.user}"
