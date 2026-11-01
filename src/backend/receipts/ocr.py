import logging
import threading

import cv2

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
        x0 = min(i["x0"] for i in row["items"])
        x1 = max(i["x1"] for i in row["items"])
        lines.append({
            "text": " ".join(i["text"] for i in row["items"]),
            "conf": sum(i["conf"] for i in row["items"]) / len(row["items"]),
            "y": row["cy"], "x0": x0, "x1": x1, "cx": (x0 + x1) / 2,
        })
    return lines


def _is_sideways(horizontal_list, free_list):
    """Chữ in dọc (ảnh bị xoay 90 độ): đa số hộp chữ cao hơn rộng. Ảnh thẳng thì ngược lại."""
    wide = tall = 0
    for box in horizontal_list:  # [x_min, x_max, y_min, y_max]
        w, h = box[1] - box[0], box[3] - box[2]
        wide += w >= 1.5 * h
        tall += h >= 1.5 * w
    for poly in free_list:  # 4 điểm, hộp nghiêng
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        wide += w >= 1.5 * h
        tall += h >= 1.5 * w
    return tall >= 5 and tall >= 3 * wide


def _quality(results):
    """Tổng (độ tin cậy x số ký tự): ảnh đúng chiều có nhiều chữ đọc chắc hơn hẳn ảnh nằm ngang."""
    return sum(conf * len(text) for _, text, conf in results)


def _pick_rotation(reader, gray, horizontal_list):
    """Chọn xoay thuận hay ngược chiều kim đồng hồ bằng cách đọc thử vài hộp chữ lớn nhất ở mỗi chiều.

    Đọc cả ảnh ở hai chiều sẽ tốn thêm hàng chục giây trên CPU; đọc thử mười hộp chỉ mất vài giây.
    """
    boxes = sorted(horizontal_list, key=lambda b: (b[1] - b[0]) * (b[3] - b[2]), reverse=True)[:10]
    crops = []
    for x_min, x_max, y_min, y_max in boxes:
        crop = gray[max(0, int(y_min)):int(y_max), max(0, int(x_min)):int(x_max)]
        if crop.size:
            crops.append(crop)
    scores = {}
    for code in (cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE):
        total = 0.0
        for crop in crops:
            rotated = cv2.rotate(crop, code)
            height, width = rotated.shape[:2]
            total += _quality(reader.recognize(rotated, [[0, width, 0, height]], [], detail=1))
        scores[code] = total
    return max(scores, key=scores.get)


ORIENTATION_CHECK_LONG_SIDE = 640  # kiểm tra hướng trên bản thu nhỏ: nhanh gấp nhiều lần bản đầy đủ


def _upright(reader, gray):
    """Xoay lại ảnh hóa đơn bị xoay 90 độ (dữ liệu điểm ảnh nằm ngang dù người xem thấy thẳng).

    Chỉ kiểm tra ảnh nằm ngang (hóa đơn thường dọc, nên ảnh nằm ngang mới có khả năng bị xoay) và chỉ
    trên bản thu nhỏ, để ảnh thẳng không tốn thêm thời gian đáng kể.
    """
    height, width = gray.shape[:2]
    if width < 1.15 * height:
        return gray
    scale = ORIENTATION_CHECK_LONG_SIDE / max(height, width)
    small = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    horizontal, free = reader.detect(small)
    if not _is_sideways(horizontal[0], free[0]):
        return gray
    full_size_boxes = [[v / scale for v in box] for box in horizontal[0]]
    return cv2.rotate(gray, _pick_rotation(reader, gray, full_size_boxes))


def _recognize(reader, gray):
    """Giống reader.readtext nhưng tự xoay lại ảnh nằm ngang trước khi đọc."""
    gray = _upright(reader, gray)
    horizontal, free = reader.detect(gray)
    return reader.recognize(gray, horizontal[0], free[0], detail=1, paragraph=False)


def read_lines(gray):
    with _lock:  # torch không nên chạy song song trên cùng một bộ đọc
        results = _recognize(get_reader(), gray)
    items = []
    for box, text, conf in results:
        text = text.strip()
        if not text:
            continue
        xs, ys = [float(p[0]) for p in box], [float(p[1]) for p in box]
        items.append({"text": text, "conf": float(conf),
                      "x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys)})
    return group_lines(items)
