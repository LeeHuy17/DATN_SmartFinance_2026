from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from receipts.models import Receipt


class Command(BaseCommand):
    help = "Xóa hóa đơn đã quét nhưng không gắn giao dịch sau 24 giờ"

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=24)
        count = 0
        for r in Receipt.objects.filter(transaction__isnull=True, created_at__lt=cutoff):
            r.delete()  # post_delete xóa luôn tệp ảnh
            count += 1
        self.stdout.write(f"Đã xóa {count} hóa đơn chưa dùng")
