import logging
import threading

from django.conf import settings

logger = logging.getLogger(__name__)
_reader = None
_lock = threading.Lock()


class OCRUnavailable(Exception):
    pass


def get_reader():
    global _reader
    if _reader is None:
        try:
            import easyocr  # nạp muộn: không ảnh hưởng thời gian khởi động server
            _reader = easyocr.Reader(
                settings.OCR_LANGUAGES, gpu=False,
                model_storage_directory=settings.OCR_MODEL_DIR,
                download_enabled=True, verbose=False,
            )
        except Exception as e:
            logger.exception("Không khởi tạo được EasyOCR")
            raise OCRUnavailable(str(e)) from e
    return _reader


def group_lines(items):
    """Gom các đoạn chữ cùng một hàng ngang thành một dòng, đọc từ trái sang phải."""
    if not items:
        return []
    heights = sorted(i["y1"] - i["y0"] for i in items)
    median = heights[len(heights) // 2] or 1
    rows = []
    for it in sorted(items, key=lambda i: (i["y0"] + i["y1"]) / 2):
        cy = (it["y0"] + it["y1"]) / 2
        if rows and abs(cy - rows[-1]["cy"]) <= 0.6 * median:
            row = rows[-1]
            row["items"].append(it)
            row["cy"] = sum((i["y0"] + i["y1"]) / 2 for i in row["items"]) / len(row["items"])
        else:
            rows.append({"cy": cy, "items": [it]})
    lines = []
    for row in rows:
        row["items"].sort(key=lambda i: i["x0"])
        lines.append({
            "text": " ".join(i["text"] for i in row["items"]),
            "conf": sum(i["conf"] for i in row["items"]) / len(row["items"]),
            "y": row["cy"],
        })
    return lines


def read_lines(gray):
    with _lock:  # torch không nên chạy song song trên cùng một bộ đọc
        results = get_reader().readtext(gray, detail=1, paragraph=False)
    items = []
    for box, text, conf in results:
        text = text.strip()
        if not text:
            continue
        xs, ys = [float(p[0]) for p in box], [float(p[1]) for p in box]
        items.append({"text": text, "conf": float(conf),
                      "x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys)})
    return group_lines(items)
