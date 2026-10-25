import logging

import cv2
import numpy as np
from django.conf import settings
from PIL import Image, ImageOps, UnidentifiedImageError

from accounts.avatar import InvalidImage

logger = logging.getLogger(__name__)

MAX_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 40_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
TARGET_LONG, MIN_LONG = 1600, 1000


def load_image(upload):
    """Kiểm tra như ảnh đại diện: không tin đuôi tệp hay Content-Type."""
    if upload.size > MAX_BYTES:
        raise InvalidImage("Ảnh tối đa 8 MB.")
    try:
        img = Image.open(upload)
        if img.format not in ALLOWED_FORMATS:
            raise InvalidImage("Chỉ nhận ảnh JPEG, PNG hoặc WEBP.")
        if img.width * img.height > MAX_PIXELS:
            raise InvalidImage("Kích thước ảnh quá lớn.")
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        # Ghi lại lý do thật và vài byte đầu (dấu hiệu định dạng: ff d8 = JPEG, 89 50 = PNG, "ftyp" = HEIC)
        upload.seek(0)
        logger.warning("Không đọc được ảnh hóa đơn: %r, %d byte, đầu tệp=%s, content_type=%s",
                       e, upload.size, upload.read(16).hex(), getattr(upload, "content_type", None))
        raise InvalidImage("Tệp không phải ảnh hợp lệ.")
    return ImageOps.exif_transpose(img).convert("RGB")  # xoay đúng chiều điện thoại


def _resize(img):
    h, w = img.shape[:2]
    long_side = max(h, w)
    if long_side > TARGET_LONG:
        scale = TARGET_LONG / long_side
    elif long_side < MIN_LONG:
        scale = MIN_LONG / long_side
    else:
        return img
    interp = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    return cv2.resize(img, None, fx=scale, fy=scale, interpolation=interp)


def _order_points(pts):
    s, d = pts.sum(axis=1), np.diff(pts, axis=1).ravel()
    # trên-trái, trên-phải, dưới-phải, dưới-trái
    return np.array([pts[s.argmin()], pts[d.argmin()], pts[s.argmax()], pts[d.argmax()]],
                    dtype="float32")


def _find_quad(img):
    """Tìm khung tứ giác lớn nhất (tờ hóa đơn). Không thấy thì trả None."""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
        area = cv2.contourArea(approx)
        # Quá nhỏ: có thể là vật khác. Quá lớn (gần bằng cả ảnh): không cần cắt.
        if len(approx) == 4 and 0.3 * h * w < area < 0.98 * h * w:
            return _order_points(approx.reshape(4, 2).astype("float32"))
    return None


def _warp(img, quad):
    tl, tr, br, bl = quad
    w = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
    h = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
    if w < 200 or h < 200:
        return img
    dst = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype="float32")
    return cv2.warpPerspective(img, cv2.getPerspectiveTransform(quad, dst), (w, h))


def prepare(upload):
    """Trả (JPEG để lưu, ảnh xám tăng tương phản để OCR)."""
    bgr = _resize(cv2.cvtColor(np.array(load_image(upload)), cv2.COLOR_RGB2BGR))
    quad = _find_quad(bgr) if settings.OCR_PERSPECTIVE else None
    work = _warp(bgr, quad) if quad is not None else bgr

    gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
    # Cố ý không nhị phân hóa: EasyOCR đọc ảnh xám tốt hơn ảnh đã cắt ngưỡng
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)

    _, buf = cv2.imencode(".jpg", work, [cv2.IMWRITE_JPEG_QUALITY, 85])  # không mang theo EXIF
    return buf.tobytes(), gray
