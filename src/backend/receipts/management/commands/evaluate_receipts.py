import csv
import difflib
import json
import time
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.utils import timezone

from receipts.ocr import read_lines
from receipts.parser import fold, parse_receipt
from receipts.preprocess import prepare

# Ngưỡng app tô vàng ô tổng tiền (xem ReceiptSerializer.get_needs_review)
REVIEW_THRESHOLD = 0.7
CACHE_NAME = "ocr_cache.json"


def _ratio(a, b):
    return difflib.SequenceMatcher(None, fold(a), fold(b)).ratio()


class Command(BaseCommand):
    help = (
        "Đo độ chính xác quét hóa đơn trên thư mục ảnh có nhãn: eval/labels.csv (file,total,date,merchant). "
        "Kết quả OCR được lưu vào eval/ocr_cache.json nên sửa luật rồi chạy lại chỉ mất vài giây; "
        "dùng --refresh khi muốn đọc lại ảnh (đổi tiền xử lý hoặc cấu hình OCR)."
    )

    def add_arguments(self, parser):
        parser.add_argument("folder", default="eval", nargs="?")
        parser.add_argument("--refresh", action="store_true", help="Bỏ bộ nhớ đệm, chạy lại OCR toàn bộ")

    def _ocr_lines(self, base, name, cache, refresh):
        """Trả (dòng chữ OCR, giây đã tốn). Lấy từ bộ nhớ đệm nếu có."""
        if not refresh and name in cache:
            return cache[name]["lines"], cache[name]["seconds"]
        started = time.time()
        with open(base / name, "rb") as f:
            _, gray = prepare(File(f))
        lines = read_lines(gray)
        seconds = time.time() - started
        cache[name] = {"lines": lines, "seconds": seconds}
        return lines, seconds

    def handle(self, folder, refresh=False, **options):
        base = Path(folder)
        with open(base / "labels.csv", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        cache_path = base / CACHE_NAME
        cache = {}
        if cache_path.exists() and not refresh:
            cache = json.loads(cache_path.read_text(encoding="utf-8"))

        hit = {"total": 0, "date": 0, "merchant": 0, "merchant_close": 0}
        silent_wrong = []  # tổng tiền sai nhưng app không tô vàng: lỗi nguy hiểm nhất
        times = []
        for row in rows:
            lines, seconds = self._ocr_lines(base, row["file"], cache, refresh)
            times.append(seconds)
            parsed = parse_receipt([line["text"] for line in lines], timezone.localdate(), meta=lines)

            got = {
                "total": str(parsed["total"] or "").split(".")[0],
                "date": str(parsed["date"] or ""),
                "merchant": parsed["merchant"] or "",
            }
            want = {"total": row["total"], "date": row["date"], "merchant": row["merchant"]}
            ok = {
                "total": got["total"] == want["total"],
                "date": got["date"] == want["date"],
                "merchant": got["merchant"].lower() == want["merchant"].lower(),
            }
            close = ok["merchant"] or (bool(got["merchant"]) and bool(want["merchant"])
                                       and _ratio(got["merchant"], want["merchant"]) >= 0.8)
            for k, v in ok.items():
                hit[k] += v
            hit["merchant_close"] += close

            confidence = parsed["total_confidence"]
            if not ok["total"] and confidence >= REVIEW_THRESHOLD:
                silent_wrong.append(row["file"])

            short = row["file"][-14:-4]
            self.stdout.write(f"[{short}] {seconds:4.0f}s  tin cậy tổng={confidence:.2f}")
            for k in ("total", "date", "merchant"):
                if not ok[k]:
                    note = " (gần đúng)" if k == "merchant" and close else ""
                    self.stdout.write(f"    {k:8} SAI{note}: cần {want[k]!r:32} đọc được {got[k]!r}")

        cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

        n = len(rows) or 1
        self.stdout.write(
            f"\nTổng cộng: {hit['total']}/{n} ({hit['total']/n:.0%}) | Ngày: {hit['date']}/{n} ({hit['date']/n:.0%}) | "
            f"Cửa hàng: {hit['merchant']}/{n} ({hit['merchant']/n:.0%}), gần đúng {hit['merchant_close']}/{n} "
            f"({hit['merchant_close']/n:.0%}) | TB {sum(times)/n:.1f}s mỗi ảnh")
        self.stdout.write(
            f"Tổng tiền SAI mà KHÔNG được tô vàng (tin cậy >= {REVIEW_THRESHOLD}): "
            f"{len(silent_wrong)}/{n}")
