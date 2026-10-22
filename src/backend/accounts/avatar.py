from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 25_000_000
SIZE = 512
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class InvalidImage(ValueError):
    pass


def process_avatar(upload):
    """Kiểm tra, cắt vuông, thu nhỏ, xóa EXIF; trả về ContentFile JPEG."""
    if upload.size > MAX_BYTES:
        raise InvalidImage("Ảnh tối đa 5 MB.")
    try:
        img = Image.open(upload)
        if img.format not in ALLOWED_FORMATS:
            raise InvalidImage("Chỉ nhận ảnh JPEG, PNG hoặc WEBP.")
        if img.width * img.height > MAX_PIXELS:
            raise InvalidImage("Kích thước ảnh quá lớn.")
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise InvalidImage("Tệp không phải ảnh hợp lệ.")

    img = ImageOps.exif_transpose(img)  # xoay đúng chiều theo EXIF
    img = ImageOps.fit(img, (SIZE, SIZE), Image.LANCZOS)  # cắt vuông ở giữa

    if img.mode in ("RGBA", "LA", "P"):  # ảnh trong suốt: đặt lên nền trắng
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.getchannel("A"))
        img = bg
    else:
        img = img.convert("RGB")

    buf = BytesIO()
    img.save(buf, "JPEG", quality=85, optimize=True)  # không truyền exif nên metadata bị bỏ
    return ContentFile(buf.getvalue())
