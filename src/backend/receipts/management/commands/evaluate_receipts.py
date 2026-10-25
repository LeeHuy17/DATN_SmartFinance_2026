import csv
import time
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.utils import timezone

from receipts.ocr import read_lines
from receipts.parser import parse_receipt
from receipts.preprocess import prepare


class Command(BaseCommand):
    help = "Đo độ chính xác OCR trên thư mục ảnh có nhãn: eval/labels.csv (file,total,date,merchant)"

    def add_arguments(self, parser):
        parser.add_argument("folder", default="eval", nargs="?")

    def handle(self, folder, **options):
        base = Path(folder)
        with open(base / "labels.csv", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        hit = {"total": 0, "date": 0, "merchant": 0}
        times = []
        for row in rows:
            started = time.time()
            with open(base / row["file"], "rb") as f:
                _, gray = prepare(File(f))
            lines = read_lines(gray)
            parsed = parse_receipt([l["text"] for l in lines], timezone.localdate(), meta=lines)
            times.append(time.time() - started)
            ok = {
                "total": str(parsed["total"] or "").split(".")[0] == row["total"],
                "date": str(parsed["date"] or "") == row["date"],
                "merchant": (parsed["merchant"] or "").lower() == row["merchant"].lower(),
            }
            for k, v in ok.items():
                hit[k] += v
            self.stdout.write(f"{row['file']}: " + ", ".join(
                f"{k}={'ĐÚNG' if v else 'SAI'}" for k, v in ok.items()))
        n = len(rows) or 1
        self.stdout.write(f"\nTổng cộng: {hit['total']/n:.0%} | Ngày: {hit['date']/n:.0%} | "
                          f"Cửa hàng: {hit['merchant']/n:.0%} | TB {sum(times)/n:.1f}s mỗi ảnh")
