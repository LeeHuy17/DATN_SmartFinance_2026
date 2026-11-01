from django.core.management.base import BaseCommand

from notifications.services import prune_old_notifications, send_daily_reminders, send_monthly_digests


class Command(BaseCommand):
    help = (
        "Việc thông báo theo lịch: nhắc ghi chép sau 20:00, email tổng kết tháng trước, dọn thông báo cũ. "
        "Chạy lặp lại nhiều lần trong ngày cũng không gửi trùng (container scheduler chạy mỗi 10 phút)."
    )

    def handle(self, *args, **options):
        reminders = send_daily_reminders()
        digests = send_monthly_digests()
        pruned = prune_old_notifications()
        self.stdout.write(f"Nhắc ghi chép: {reminders} · Email tổng kết: {digests} · Đã dọn: {pruned}")
