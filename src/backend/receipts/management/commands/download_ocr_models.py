from django.core.management.base import BaseCommand

from receipts.ocr import get_reader


class Command(BaseCommand):
    help = "Tải sẵn mô hình EasyOCR để lần quét đầu tiên không bị chậm hoặc quá thời gian"

    def handle(self, *args, **options):
        get_reader()
        self.stdout.write("Đã sẵn sàng")
