import re

from django.core.files.base import ContentFile
from django.utils import timezone

from categories.models import Category

from .models import Receipt
from .ocr import read_lines
from .parser import ADDRESS_RE, fold, parse_receipt
from .preprocess import prepare


class NoTextFound(Exception):
    pass


# Tên danh mục khớp bộ mặc định trong categories/defaults.py
CATEGORY_RULES = {
    "Ăn uống": ("cafe", "coffee", "ca phe", "tra sua", "nha hang", "quan an",
                "pho bo", "pho ga", "quan pho", "bun bo", "bun cha", "com tam", "banh mi",
                "highlands", "starbucks", "kfc", "lotteria", "pizza", "bia", "phuc long",
                "coffee house"),
    "Di chuyển": ("grab", "taxi", "xanh sm", "gojek", "xang", "petrolimex", "pvoil",
                  "bai do xe", "ve xe", "gui xe"),
    "Mua sắm": ("winmart", "vinmart", "coopmart", "bach hoa xanh", "circle k", "familymart",
                "family mart", "7-eleven", "aeon", "big c", "lotte mart", "ministop",
                "mini stop", "sieu thi", "tap hoa", "uniqlo",
                "eyewear", "mat kinh", "kinh mat", "optic", "thoi trang", "quan ao",
                "giay dep", "dien may"),
    "Hóa đơn & tiện ích": ("dien luc", "evn", "tien dien", "tien nuoc", "internet", "viettel",
                           "vnpt", "fpt", "mobifone", "vinaphone", "cuoc"),
    "Sức khỏe": ("nha thuoc", "pharmacity", "long chau", "benh vien", "phong kham", "thuoc"),
    "Giải trí": ("cgv", "lotte cinema", "galaxy cinema", "rap chieu", "karaoke", "bhd"),
    "Giáo dục": ("hoc phi", "nha sach", "fahasa", "sach", "khoa hoc"),
}


def suggest_category(user, texts):
    key = fold(" ".join(texts))
    best, score = None, 0
    for name, words in CATEGORY_RULES.items():
        hits = sum(1 for w in words if re.search(rf"\b{re.escape(w)}\b", key))
        if hits > score:
            best, score = name, hits
    if not best:
        return None
    return Category.objects.filter(
        user=user, kind="expense", name__iexact=best, is_hidden=False
    ).first()


def scan(user, upload):
    stored, gray = prepare(upload)  # InvalidImage nếu ảnh không hợp lệ
    lines = read_lines(gray)  # OCRUnavailable nếu EasyOCR không chạy được
    if not lines:
        raise NoTextFound
    texts = [l["text"] for l in lines]
    parsed = parse_receipt(texts, timezone.localdate(), meta=lines)
    # Bỏ dòng địa chỉ khi đoán danh mục: "Thành phố" không được khớp "phở"
    keywords = [t for t in texts[:30] if not ADDRESS_RE.search(fold(t))]

    receipt = Receipt(
        user=user,
        raw_text="\n".join(texts)[:20000],
        merchant=parsed["merchant"] or "",
        total=parsed["total"],
        total_confidence=parsed["total_confidence"],
        receipt_date=parsed["date"],
        suggested_category=suggest_category(user, keywords),
        confidence=sum(l["conf"] for l in lines) / len(lines),
    )
    receipt.image.save("receipt.jpg", ContentFile(stored), save=False)
    receipt.save()
    return receipt
