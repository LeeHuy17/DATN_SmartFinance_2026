"""Tạo thông báo theo nghiệp vụ: ngân sách, bảo mật, nhắc ghi chép, email tổng kết tháng."""
import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone

from .models import Notification, NotificationSetting

logger = logging.getLogger(__name__)
User = get_user_model()

# Nhắc ghi chép từ giờ này trở đi (giờ địa phương), nếu hôm đó chưa nhập giao dịch nào
REMINDER_HOUR = 20
# Email tổng kết tháng trước gửi từ giờ này của ngày đầu tháng trở đi
DIGEST_HOUR = 8


def vnd(amount):
    """Decimal → "1.500.000đ" (làm tròn đồng, dấu chấm phân cách hàng nghìn)."""
    return f"{int(Decimal(amount).quantize(Decimal('1'))):,}".replace(",", ".") + "đ"


def get_settings(user):
    return NotificationSetting.objects.get_or_create(user=user)[0]


def notify(user, type, title, body="", *, link="", tone="", key="", once=False):
    """
    Tạo thông báo nếu người dùng chưa tắt loại đó (bảo mật luôn gửi).
    Có `key`: mỗi người dùng chỉ giữ một thông báo cho key đó.
      - once=True: đã có thì bỏ qua (vd. mỗi mốc ngân sách chỉ báo một lần mỗi tháng).
      - once=False: đã có thì cập nhật nội dung, đưa lên đầu và đánh dấu chưa đọc.
    Trả về thông báo vừa tạo / cập nhật, hoặc None nếu không gửi.
    """
    if not get_settings(user).allows(type):
        return None
    fields = {"type": type, "title": title, "body": body, "link": link, "tone": tone}
    if key:
        existing = Notification.objects.filter(user=user, key=key).first()
        if existing:
            if once:
                return None
            for name, value in fields.items():
                setattr(existing, name, value)
            existing.read_at = None
            existing.created_at = timezone.now()
            existing.save()
            return existing
    return Notification.objects.create(user=user, key=key, **fields)


# ---------- Ngân sách ----------

def notify_budget_alerts(user, alerts, month):
    """
    `alerts` là kết quả budgets.services.alerts_for của một giao dịch chi; `month` là "YYYY-MM"
    của giao dịch. Mỗi ngân sách chỉ báo một lần cho mốc "chạm ngưỡng" và một lần cho "vượt"
    trong mỗi tháng, nên nhập thêm khoản chi vào danh mục đã vượt không tạo thông báo lặp.
    """
    for a in alerts:
        exceeded = a["status"] == "exceeded"
        spent, amount = Decimal(a["spent"]), Decimal(a["amount"])
        name = a["category_name"]
        if exceeded:
            title = f"Đã vượt ngân sách {name}"
            body = f"Đã chi {vnd(spent)}, vượt {vnd(spent - amount)} so với hạn mức {vnd(amount)}."
        else:
            title = f"{name} đã dùng {round(a['percent'])}% ngân sách"
            body = f"Đã chi {vnd(spent)} / {vnd(amount)} trong tháng {month[5:]}/{month[:4]}."
        notify(
            user, Notification.Type.BUDGET, title, body,
            link="/advice", tone="danger" if exceeded else "",
            key=f"budget-{a['budget']}-{month}-{a['status']}", once=True,
        )


# ---------- Bảo mật ----------

def notify_password_changed(user, *, via_reset=False):
    """Luôn gửi; mọi thiết bị đều thấy trong Hộp thư (các phiên cũ đã bị đăng xuất)."""
    if via_reset:
        title = "Mật khẩu đã được đặt lại"
        body = "Mật khẩu vừa được đặt lại bằng mã xác thực gửi qua email. Nếu không phải bạn, hãy liên hệ hỗ trợ ngay."
    else:
        title = "Mật khẩu đã được thay đổi"
        body = "Các thiết bị khác đã được đăng xuất. Nếu không phải bạn, hãy đặt lại mật khẩu ngay."
    notify(user, Notification.Type.SECURITY, title, body, link="/profile")


# ---------- Việc chạy theo lịch (lệnh send_scheduled_notifications) ----------

def send_daily_reminders(now=None):
    """
    Từ 20:00, nhắc những người bật "Nhắc ghi chép" mà hôm nay chưa nhập giao dịch nào.
    Mỗi người tối đa một lần mỗi ngày (key theo ngày). Trả về số thông báo đã tạo.
    """
    now = timezone.localtime(now)
    if now.hour < REMINDER_HOUR:
        return 0
    today = now.date()
    key = f"reminder-{today.isoformat()}"
    users = (
        User.objects.filter(is_active=True)
        .exclude(notification_setting__reminder=False)
        .exclude(transactions__created_at__date=today)
        .exclude(notifications__key=key)
        .distinct()
    )
    count = 0
    for user in users:
        if notify(
            user, Notification.Type.REMINDER, "Nhắc ghi chép chi tiêu",
            "Hôm nay bạn chưa ghi giao dịch nào. Dành một phút để cập nhật nhé.",
            link="/transaction/add", key=key, once=True,
        ):
            count += 1
    return count


def send_monthly_digests(now=None):
    """
    Từ 08:00 ngày đầu tháng (hoặc lần chạy đầu tiên sau đó), gửi email tổng kết tháng trước cho
    người bật "Bản tin qua email" và có giao dịch trong tháng đó. Mỗi tháng tối đa một email.
    Trả về số email đã gửi.
    """
    from reports.services import by_category, prev_month, totals, user_transactions

    now = timezone.localtime(now)
    this_month = now.date().replace(day=1)
    if now.day == 1 and now.hour < DIGEST_HOUR:
        return 0
    start = prev_month(this_month)
    month_key = start.strftime("%Y-%m")
    settings_qs = (
        NotificationSetting.objects.filter(email=True, user__is_active=True)
        .exclude(last_digest_month=month_key)
        .select_related("user")
    )
    sent = 0
    for setting in settings_qs:
        user = setting.user
        qs = user_transactions(user)
        if not qs.filter(date__gte=start, date__lt=this_month).exists():
            continue
        cur = totals(qs, start, this_month)
        old = totals(qs, prev_month(start), start)
        top = by_category(qs, start, this_month, "expense")["items"][:3]
        try:
            _send_digest_email(user, start, cur, old, top)
        except Exception:
            # Lỗi gửi mail (sai cấu hình SMTP, mạng) thì để lần chạy sau thử lại
            logger.exception("Gửi email tổng kết tháng %s thất bại: %s", month_key, user.email)
            continue
        setting.last_digest_month = month_key
        setting.save(update_fields=["last_digest_month", "updated_at"])
        sent += 1
    return sent


def _send_digest_email(user, start, cur, old, top):
    label = f"{start.month}/{start.year}"
    name = user.full_name or user.email

    def change(now_value, old_value):
        if not old_value:
            return ""
        pct = (now_value - old_value) / old_value * 100
        return f" ({'tăng' if pct >= 0 else 'giảm'} {abs(pct):.1f}% so với tháng trước)"

    lines = [
        f"Xin chào {name},",
        "",
        f"Tổng kết chi tiêu tháng {label} trên Smart Finance:",
        f"- Tổng thu: {vnd(cur['income'])}{change(cur['income'], old['income'])}",
        f"- Tổng chi: {vnd(cur['expense'])}{change(cur['expense'], old['expense'])}",
        f"- Chênh lệch: {'-' if cur['net'] < 0 else ''}{vnd(abs(cur['net']))}",
    ]
    if top:
        lines += ["", "Danh mục chi nhiều nhất:"]
        lines += [f"- {c['category_name']}: {vnd(c['total'])} ({c['percent']}%)" for c in top]
    lines += ["", "Bạn có thể tắt bản tin này trong Hồ sơ > Thông báo."]
    send_mail(
        f"[Smart Finance] Tổng kết chi tiêu tháng {label}",
        "\n".join(lines),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )


def prune_old_notifications(days=90, now=None):
    """Xóa thông báo đã đọc cũ hơn `days` ngày cho Hộp thư gọn. Trả về số dòng đã xóa."""
    cutoff = (now or timezone.now()) - timedelta(days=days)
    deleted, _ = Notification.objects.filter(read_at__isnull=False, created_at__lt=cutoff).delete()
    return deleted
