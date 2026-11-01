from datetime import date, datetime, timedelta
from decimal import Decimal
from io import StringIO
from unittest import mock
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from budgets.models import Budget, BudgetAmount
from transactions.models import Transaction
from wallets.models import Wallet

from .models import Notification, NotificationSetting
from .services import notify, send_daily_reminders, send_monthly_digests

User = get_user_model()
VN = ZoneInfo("Asia/Ho_Chi_Minh")
PASSWORD = "StrongPass123!"


def at(y, m, d, hh=12, mm=0):
    return datetime(y, m, d, hh, mm, tzinfo=VN)


class Base(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="an@example.com", password=PASSWORD, full_name="Nguyễn An")
        self.other = User.objects.create_user(email="binh@example.com", password=PASSWORD)
        self.client.force_authenticate(self.user)
        self.wallet = Wallet.objects.create(user=self.user, name="Tiền mặt")
        self.food = self.user.categories.get(name="Ăn uống")

    def _notify(self, user=None, **kw):
        return notify(user or self.user, kw.pop("type", "budget"), kw.pop("title", "Tiêu đề"), "Nội dung", **kw)

    def _tx(self, amount, day, user=None, category=None, wallet=None):
        return Transaction.objects.create(
            user=user or self.user, wallet=wallet or self.wallet, category=category or self.food,
            amount=Decimal(amount), date=day,
        )


class InboxApiTests(Base):
    def test_list_newest_first_with_read_flag(self):
        old = self._notify(title="Cũ")
        Notification.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=1))
        self._notify(title="Mới")
        res = self.client.get(reverse("notification-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([n["title"] for n in res.data["results"]], ["Mới", "Cũ"])
        self.assertEqual(set(res.data["results"][0]), {"id", "type", "title", "body", "link", "tone", "read", "created_at"})
        self.assertFalse(res.data["results"][0]["read"])

    def test_only_own_notifications(self):
        n = self._notify(user=self.other)
        self.assertEqual(self.client.get(reverse("notification-list")).data["count"], 0)
        res = self.client.post(reverse("notification-read", args=[n.pk]))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_filter_unread_and_type(self):
        self._notify(type="budget")
        read = self._notify(type="security")
        read.read_at = timezone.now()
        read.save()
        self.assertEqual(self.client.get(reverse("notification-list"), {"unread": "1"}).data["count"], 1)
        self.assertEqual(self.client.get(reverse("notification-list"), {"type": "security"}).data["count"], 1)

    def test_mark_read_and_read_all_and_unread_count(self):
        a, b = self._notify(), self._notify()
        self._notify(user=self.other)
        url = reverse("notification-unread-count")
        self.assertEqual(self.client.get(url).data["count"], 2)
        res = self.client.post(reverse("notification-read", args=[a.pk]))
        self.assertTrue(res.data["read"])
        self.assertEqual(self.client.get(url).data["count"], 1)
        res = self.client.post(reverse("notification-read-all"))
        self.assertEqual(res.data["updated"], 1)
        self.assertEqual(self.client.get(url).data["count"], 0)
        # Thông báo của người khác không bị đánh dấu
        self.assertTrue(Notification.objects.filter(user=self.other, read_at__isnull=True).exists())
        b.refresh_from_db()
        self.assertIsNotNone(b.read_at)

    def test_cannot_create_or_delete_via_api(self):
        n = self._notify()
        self.assertEqual(self.client.post(reverse("notification-list"), {"title": "x"}).status_code, 405)
        self.assertEqual(self.client.delete(reverse("notification-detail", args=[n.pk])).status_code, 405)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("notification-list")).status_code, 401)
        self.assertEqual(self.client.get(reverse("notification_settings")).status_code, 401)


class SettingsTests(Base):
    def test_defaults_created_on_first_get(self):
        res = self.client.get(reverse("notification_settings"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, {
            "budget": True, "ocr": True, "reminder": True, "advice": False,
            "banner": True, "push": True, "email": False,
        })

    def test_update_settings(self):
        res = self.client.patch(reverse("notification_settings"), {"budget": False, "email": True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        setting = NotificationSetting.objects.get(user=self.user)
        self.assertFalse(setting.budget)
        self.assertTrue(setting.email)

    def test_disabled_type_is_not_created_but_security_always_is(self):
        NotificationSetting.objects.create(user=self.user, budget=False)
        self.assertIsNone(self._notify(type="budget"))
        self.assertIsNotNone(self._notify(type="security"))


class NotifyKeyTests(Base):
    def test_once_skips_existing_key(self):
        self.assertIsNotNone(self._notify(key="k", once=True))
        self.assertIsNone(self._notify(key="k", once=True))
        self.assertEqual(Notification.objects.count(), 1)

    def test_upsert_moves_to_top_and_marks_unread(self):
        n = self._notify(key="k", title="Cũ")
        n.read_at = timezone.now()
        n.save()
        self._notify(key="k", title="Mới")
        n.refresh_from_db()
        self.assertEqual((n.title, n.read_at), ("Mới", None))
        self.assertEqual(Notification.objects.count(), 1)

    def test_same_key_allowed_for_different_users(self):
        self._notify(key="k")
        self._notify(user=self.other, key="k")
        self.assertEqual(Notification.objects.count(), 2)


class BudgetNotificationTests(Base):
    def setUp(self):
        super().setUp()
        budget = Budget.objects.create(user=self.user, category=self.food)
        BudgetAmount.objects.create(budget=budget, month=date(2026, 1, 1), amount=Decimal("100000"))

    def _post(self, amount, day="2026-10-10"):
        return self.client.post(reverse("transaction-list"), {
            "wallet": self.wallet.pk, "category": self.food.pk, "amount": amount, "date": day,
        })

    def test_each_level_notified_once_per_month(self):
        self._post("50000")
        self.assertEqual(Notification.objects.count(), 0)
        self._post("35000")  # 85%: chạm ngưỡng
        self._post("1000")   # 86%: vẫn warning, không báo lại
        warning = Notification.objects.get()
        self.assertEqual(warning.type, "budget")
        self.assertEqual(warning.title, "Ăn uống đã dùng 85% ngân sách")
        self.assertEqual(warning.link, "/advice")
        self._post("20000")  # 106%: vượt
        self._post("5000")   # vẫn vượt, không báo lại
        exceeded = Notification.objects.get(tone="danger")
        self.assertEqual(exceeded.title, "Đã vượt ngân sách Ăn uống")
        self.assertIn("vượt 6.000đ", exceeded.body)
        self.assertEqual(Notification.objects.count(), 2)

    def test_new_month_notifies_again(self):
        self._post("90000", "2026-09-10")
        self._post("90000", "2026-10-10")
        self.assertEqual(Notification.objects.count(), 2)

    def test_disabled_budget_notifications(self):
        NotificationSetting.objects.create(user=self.user, budget=False)
        res = self._post("90000")
        self.assertEqual(len(res.data["budget_alerts"]), 1)  # app vẫn nhận cảnh báo tức thời
        self.assertEqual(Notification.objects.count(), 0)


class SecurityNotificationTests(Base):
    def test_change_password_notifies(self):
        self.client.post(reverse("change_password"), {
            "current_password": PASSWORD, "new_password": "NewStrong456!",
        })
        n = Notification.objects.get(user=self.user)
        self.assertEqual((n.type, n.title), ("security", "Mật khẩu đã được thay đổi"))

    def test_change_password_notifies_even_if_types_disabled(self):
        NotificationSetting.objects.create(user=self.user, budget=False, reminder=False, ocr=False)
        self.client.post(reverse("change_password"), {
            "current_password": PASSWORD, "new_password": "NewStrong456!",
        })
        self.assertEqual(Notification.objects.filter(type="security").count(), 1)

    def test_failed_change_does_not_notify(self):
        self.client.post(reverse("change_password"), {"current_password": "sai", "new_password": "NewStrong456!"})
        self.assertFalse(Notification.objects.exists())

    def test_password_reset_notifies(self):
        self.client.force_authenticate(None)
        self.client.post(reverse("password_reset_request"), {"email": self.user.email})
        code = next(w for w in mail.outbox[-1].body.split() if w.isdigit() and len(w) == 6)
        token = self.client.post(
            reverse("password_reset_verify"), {"email": self.user.email, "code": code}
        ).data["reset_token"]
        self.client.post(reverse("password_reset_confirm"), {"reset_token": token, "new_password": "NewStrong456!"})
        self.assertEqual(Notification.objects.get(user=self.user).title, "Mật khẩu đã được đặt lại")


class ReminderTests(Base):
    def test_before_20h_does_nothing(self):
        self.assertEqual(send_daily_reminders(at(2026, 10, 21, 19, 59)), 0)

    def test_reminds_users_without_transactions_today_once(self):
        now = at(2026, 10, 21, 20, 5)
        with mock.patch("django.utils.timezone.now", return_value=now):
            self._tx("10000", date(2026, 10, 21))  # an đã ghi hôm nay
        self.assertEqual(send_daily_reminders(now), 1)
        self.assertEqual(Notification.objects.get().user, self.other)
        self.assertEqual(send_daily_reminders(at(2026, 10, 21, 21, 0)), 0)  # không nhắc lại
        self.assertEqual(send_daily_reminders(at(2026, 10, 22, 20, 0)), 2)  # ngày mới

    def test_respects_reminder_setting(self):
        NotificationSetting.objects.create(user=self.other, reminder=False)
        self.assertEqual(send_daily_reminders(at(2026, 10, 21, 20, 0)), 1)
        self.assertEqual(Notification.objects.get().user, self.user)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class DigestTests(Base):
    def setUp(self):
        super().setUp()
        NotificationSetting.objects.create(user=self.user, email=True)
        self._tx("200000", date(2026, 9, 5))
        self._tx("100000", date(2026, 8, 5))
        salary = self.user.categories.get(name="Lương")
        self._tx("5000000", date(2026, 9, 1), category=salary)

    def test_sends_last_month_summary_once(self):
        self.assertEqual(send_monthly_digests(at(2026, 10, 1, 7, 59)), 0)  # chưa tới 8h ngày 1
        self.assertEqual(send_monthly_digests(at(2026, 10, 1, 8, 0)), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.to, [self.user.email])
        self.assertIn("tháng 9/2026", msg.subject)
        self.assertIn("Tổng chi: 200.000đ (tăng 100.0% so với tháng trước)", msg.body)
        self.assertIn("Tổng thu: 5.000.000đ", msg.body)
        self.assertIn("Ăn uống: 200.000đ", msg.body)
        self.assertEqual(send_monthly_digests(at(2026, 10, 15)), 0)  # không gửi lại
        self.assertEqual(NotificationSetting.objects.get(user=self.user).last_digest_month, "2026-09")

    def test_catches_up_if_scheduler_was_down_on_day_one(self):
        self.assertEqual(send_monthly_digests(at(2026, 10, 3)), 1)

    def test_skips_users_with_email_off_or_no_transactions(self):
        NotificationSetting.objects.create(user=self.other, email=True)  # không có giao dịch
        NotificationSetting.objects.filter(user=self.user).update(email=False)
        self.assertEqual(send_monthly_digests(at(2026, 10, 1, 9)), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_failed_send_is_retried_next_run(self):
        with mock.patch("notifications.services.send_mail", side_effect=OSError("SMTP lỗi")), \
                self.assertLogs("notifications.services", level="ERROR"):
            self.assertEqual(send_monthly_digests(at(2026, 10, 1, 9)), 0)
        self.assertEqual(NotificationSetting.objects.get(user=self.user).last_digest_month, "")
        self.assertEqual(send_monthly_digests(at(2026, 10, 1, 9, 10)), 1)


class CommandTests(Base):
    def test_command_runs_and_prunes_old_read(self):
        n = self._notify()
        Notification.objects.filter(pk=n.pk).update(
            read_at=timezone.now(), created_at=timezone.now() - timedelta(days=100)
        )
        self._notify()  # chưa đọc thì giữ dù cũ
        out = StringIO()
        # Chỉ kiểm tra việc dọn dẹp: tắt nhắc ghi chép / email tổng kết, vì chúng phụ thuộc giờ thật
        # (sau 20:00 lệnh sẽ tự tạo thêm thông báo nhắc và làm sai số đếm)
        cmd = "notifications.management.commands.send_scheduled_notifications"
        with mock.patch(f"{cmd}.send_daily_reminders", return_value=0),                 mock.patch(f"{cmd}.send_monthly_digests", return_value=0):
            call_command("send_scheduled_notifications", stdout=out)
        self.assertIn("Đã dọn: 1", out.getvalue())
        self.assertEqual(Notification.objects.count(), 1)
