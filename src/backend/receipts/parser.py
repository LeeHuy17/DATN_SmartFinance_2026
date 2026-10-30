import difflib
import re
import unicodedata
from collections import Counter
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


SPACED_THOUSANDS_RE = re.compile(r"(?<![\d.,])(\d{1,3}) (\d{3})(?![\d])")


def amounts_in(line, loose=False):
    """loose: coi '95 844' (OCR đọc dấu chấm thành khoảng trắng) là 95.844. Chỉ dùng ở dòng tổng tiền."""
    text = fold(_fix_ocr_digits(line))
    if loose:
        text = SPACED_THOUSANDS_RE.sub(r"\1.\2", text)
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


TOTAL_KEYS = ("tong thanh toan", "phai thanh toan", "tong cong", "tong tien",
              "tong so tien", "grand total", "amount due", "total")
PAY_KEYS = ("thanh toan", "chuyen khoan", "quet the", "the tin dung",
            "the ngan hang", "momo", "zalopay", "vnpay")
EXCLUDE = ("tam tinh", "subtotal", "sub total", "tien thua", "tra lai", "khach dua",
           "tien khach", "chua vat", "truoc thue", "tien thue", "thue gtgt",
           "giam gia", "chiet khau", "diem tich", "tich luy",
           "tong tien hang", "tong so luong", "tong sl", "tong thanh tien",
           # "Total Discount" không phải tổng tiền; mã giao dịch ví / QR chứa dãy số dài
           "discount", "txn", "qr code", "ma giao dich")
# Dòng tiêu đề như "HÓA ĐƠN THANH TOÁN" chứa chữ "thanh toán" nhưng không phải dòng tiền
TITLE_KEYS = ("hoa don", "phieu", "invoice", "receipt")


def _key(line):
    """Chữ thường, bỏ dấu và ký tự lạ: 'Tong [thanh tien' -> 'tong thanh tien'."""
    return " ".join(re.sub(r"[^a-z0-9]+", " ", fold(line)).split())


def _mostly_numeric(line):
    """Dòng chỉ gồm số tiền (vd 'VND 95.944'), không phải dòng chữ như số hóa đơn 'HD010222-0134'."""
    return sum(c.isalpha() for c in line) <= 3 and any(c.isdigit() for c in line)


def _fuzzy_total_label(key):
    """OCR làm hỏng 'Tổng cộng' thành 'Tono-' hay 'Jcong': khớp gần đúng từng từ."""
    for token in key.split():
        for word, threshold in (("cong", 0.8), ("tong", 0.75)):
            if difflib.SequenceMatcher(None, token, word).ratio() >= threshold:
                return True
    return False


def _value_at(lines, i, use_next_line=True):
    values = amounts_in(lines[i], loose=True)
    # Nhãn và số tiền đôi khi bị OCR tách thành hai dòng
    if (not values and use_next_line and i + 1 < len(lines) and _mostly_numeric(lines[i + 1])
            and not any(k in _key(lines[i + 1]) for k in EXCLUDE)):
        values = amounts_in(lines[i + 1], loose=True)[:1]
    return values[-1] if values else None


def extract_total(lines):
    """Trả (số tiền, độ tin cậy). Dòng 'tổng' là gốc, dòng thanh toán dùng để đối chiếu."""
    totals, pays, fuzzy = [], [], []
    for i, line in enumerate(lines):
        key = _key(line)
        if any(k in key for k in EXCLUDE):
            continue
        title = any(k in key for k in TITLE_KEYS)
        if any(k in key for k in TOTAL_KEYS):
            bucket = totals
        elif title:
            continue
        elif any(k in key for k in PAY_KEYS):
            bucket = pays
        elif _fuzzy_total_label(key):
            values = amounts_in(line, loose=True)  # nhãn đã hỏng nên chỉ tin số ngay trên dòng đó
            if values:
                fuzzy.append(values[-1])
            continue
        else:
            continue
        value = _value_at(lines, i, use_next_line=not title)
        if value:
            bucket.append(value)

    if not totals and fuzzy:
        # Nhãn tổng bị OCR đọc sai: chỉ khi có dòng thanh toán trùng số mới tin hơn
        return fuzzy[-1], 0.8 if fuzzy[-1] in pays else 0.6

    if totals:
        confirmed = [v for v in totals if v in pays]
        if confirmed:  # dòng tổng được dòng thanh toán xác nhận
            return confirmed[-1], 0.95
        if pays:  # tổng và thanh toán lệch nhau: nghi OCR đọc sai một chữ số
            common, n = Counter(pays).most_common(1)[0]
            return (common, 0.6) if n >= 2 else (totals[-1], 0.5)
        return totals[-1], 0.85 if len(set(totals)) == 1 else 0.6

    if pays:
        common, n = Counter(pays).most_common(1)[0]
        return common, 0.7 if n >= 2 else 0.55

    # Không có từ khóa: lấy số lớn nhất ở 60% dưới của hóa đơn, độ tin cậy thấp
    pool = [v for line in lines[int(len(lines) * 0.4):]
            if not any(k in _key(line) for k in EXCLUDE) for v in amounts_in(line)]
    return (max(pool), 0.4) if pool else (None, 0.0)


# ---------- Tên cửa hàng ----------
SKIP_RE = re.compile(
    r"hoa don|phieu|receipt|invoice|dia chi|\b(?:sdt|tel|dt|mst|hotline)\b"
    r"|ma so thue|www|http|thu ngan|so hd"
)
# Dòng địa chỉ: bắt đầu bằng số nhà hoặc có từ chỉ đơn vị hành chính
ADDRESS_RE = re.compile(
    r"^\d+[a-z]?(?:[/-]\d+)*\s|phuong|\bquan\b|duong|thanh pho|\btp\b|\btinh\b"
    r"|\bq\.?\s?\d+\b|\bp\.?\s?\d+\b|ward|district|street"
    # "ĐC:" hay bị đọc thành "OC;" / "0C:"; số nhà dạng 543/1; tên thành phố phổ biến
    r"|^[do0]c\s*[:;.]|\b\d{1,4}/\d{1,4}\b|\bhcm\b|\btphcm\b|ha noi|da nang|go vap"
)


def extract_merchant(lines, meta=None):
    """meta: danh sách dict song song với lines, có conf, x0, x1, cx (từ ocr.group_lines)."""
    if meta and not all("cx" in m for m in meta):
        meta = None
    center = width = None
    if meta:
        xs = sorted(m["cx"] for m in meta)
        center = xs[len(xs) // 2]
        width = (max(m["x1"] for m in meta) - min(m["x0"] for m in meta)) or 1

    best, best_score = None, 0.0
    for i, line in enumerate(lines[:6]):
        text = " ".join(line.split())
        key = fold(text)
        letters = sum(c.isalpha() for c in text)
        digits = sum(c.isdigit() for c in text)
        if letters < 3 or digits > letters or SKIP_RE.search(key) or ADDRESS_RE.search(key):
            continue
        if any(rx.search(key) for rx, _ in DATE_PATTERNS):
            continue
        score = 1.0 - i * 0.1  # ưu tiên các dòng trên cùng
        if meta:
            score *= meta[i]["conf"]
            if abs(meta[i]["cx"] - center) > 0.2 * width:
                score *= 0.3  # lệch khỏi trục giữa: nhiều khả năng là chữ ở nền ảnh
        if score > best_score:
            best, best_score = text[:100], score
    # Không chắc thì để trống: ô trống được tô vàng, tốt hơn ô sai
    return best if best_score >= 0.35 else None


def parse_receipt(lines, today, meta=None):
    total, conf = extract_total(lines)
    return {
        "merchant": extract_merchant(lines, meta),
        "total": total,
        "total_confidence": conf,
        "date": extract_date(lines, today),
    }
