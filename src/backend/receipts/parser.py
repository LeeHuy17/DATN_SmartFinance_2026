import re
import unicodedata
from datetime import date, timedelta
from decimal import Decimal


def fold(s):
    """Bỏ dấu và hạ chữ thường để so khớp từ khóa: 'Tổng cộng' -> 'tong cong'."""
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


# ---------- Ngày ----------
TIME_RE = re.compile(r"\d{1,2}\s*[:h]\s*\d{2}(?::\d{2})?")
DATE_PATTERNS = [
    (re.compile(r"(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?!\d)"), "dmy"),
    (re.compile(r"(?<!\d)(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?!\d)"), "ymd"),
    (re.compile(r"(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})(?!\d)"), "dmy"),
    (re.compile(r"ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})"), "dmy"),
]


def _make_date(d, m, y, today):
    if y < 100:
        y += 2000
    try:
        value = date(y, m, d)
    except ValueError:
        return None
    if value > today + timedelta(days=1) or value < date(2015, 1, 1):
        return None
    return value


def extract_date(lines, today):
    for line in lines:
        text = fold(line)
        for rx, order in DATE_PATTERNS:
            for m in rx.finditer(text):
                a, b, c = (int(g) for g in m.groups())
                value = _make_date(c, b, a, today) if order == "ymd" else _make_date(a, b, c, today)
                if value:
                    return value
    return None


# ---------- Số tiền ----------
TOKEN_RE = re.compile(r"\d[\d.,]*\d|\d")


def _fix_ocr_digits(line):
    """OCR hay đọc nhầm 0->O, 1->l/I trong dãy số: '1O5.OOO' -> '105.000'."""
    def fix(m):
        t = m.group(0)
        return t.translate(str.maketrans("OoIl", "0011")) if sum(c.isdigit() for c in t) >= 2 else t
    return re.sub(r"[\dOoIl][\dOoIl.,]{2,}", fix, line)


def parse_amount(token):
    token = token.strip(".,")
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", token):  # 1.250.000 hoặc 1,250,000
        return Decimal(re.sub(r"[.,]", "", token))
    if re.fullmatch(r"\d+[.,]\d{1,2}", token):  # 12,50
        return Decimal(token.replace(",", "."))
    if re.fullmatch(r"\d+", token):
        return Decimal(token)
    return None


def amounts_in(line):
    text = fold(_fix_ocr_digits(line))
    for rx, _ in DATE_PATTERNS:
        text = rx.sub(" ", text)  # bỏ ngày để '2026' không bị tính là tiền
    text = TIME_RE.sub(" ", text)
    out = []
    for tok in TOKEN_RE.findall(text):
        if len(re.sub(r"\D", "", tok)) >= 10:  # số điện thoại, mã số thuế, mã vạch
            continue
        value = parse_amount(tok)
        if value is not None and 0 < value < 1_000_000_000:
            out.append(value)
    return out


STRONG = ("tong thanh toan", "phai thanh toan", "tong cong", "tong tien",
          "tong so tien", "grand total", "amount due", "total")
WEAK = ("thanh toan", "phai tra")
EXCLUDE = ("tam tinh", "subtotal", "sub total", "tien thua", "tra lai", "khach dua",
           "tien khach", "chua vat", "truoc thue", "tien thue", "thue gtgt",
           "giam gia", "chiet khau", "diem tich", "tich luy")


def extract_total(lines):
    """Trả (số tiền, độ tin cậy). Lấy số lớn nhất trong các dòng có từ khóa tổng tiền."""
    candidates = []
    for i, line in enumerate(lines):
        key = fold(line)
        if any(k in key for k in EXCLUDE):
            continue
        strength = 2 if any(k in key for k in STRONG) else 1 if any(k in key for k in WEAK) else 0
        if not strength:
            continue
        values = amounts_in(line)
        # Nhãn và số tiền đôi khi bị OCR tách thành hai dòng
        if not values and i + 1 < len(lines) and not any(k in fold(lines[i + 1]) for k in EXCLUDE):
            values = amounts_in(lines[i + 1])[:1]
        if values:
            candidates.append((values[-1], strength))  # số ngoài cùng bên phải

    if candidates:
        best = max(v for v, _ in candidates)
        same = [s for v, s in candidates if v == best]
        if len(same) > 1:
            return best, 0.95  # nhiều dòng cùng cho một số
        return best, 0.85 if same[0] == 2 else 0.65

    # Không có từ khóa: lấy số lớn nhất ở 60% dưới của hóa đơn, độ tin cậy thấp
    pool = [v for l in lines[int(len(lines) * 0.4):]
            if not any(k in fold(l) for k in EXCLUDE) for v in amounts_in(l)]
    return (max(pool), 0.4) if pool else (None, 0.0)


# ---------- Tên cửa hàng ----------
SKIP_RE = re.compile(
    r"hoa don|phieu|receipt|invoice|dia chi|\b(?:sdt|tel|dt|mst|hotline)\b"
    r"|ma so thue|www|http|thu ngan|so hd"
)


def extract_merchant(lines):
    for line in lines[:6]:
        text = " ".join(line.split())
        key = fold(text)
        letters = sum(c.isalpha() for c in text)
        digits = sum(c.isdigit() for c in text)
        if letters < 3 or digits > letters or SKIP_RE.search(key):
            continue
        if any(rx.search(key) for rx, _ in DATE_PATTERNS):
            continue
        return text[:100]
    return None


def parse_receipt(lines, today):
    total, conf = extract_total(lines)
    return {
        "merchant": extract_merchant(lines),
        "total": total,
        "total_confidence": conf,
        "date": extract_date(lines, today),
    }
