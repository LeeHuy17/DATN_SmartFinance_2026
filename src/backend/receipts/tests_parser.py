from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase

from .ocr import group_lines
from .parser import (amounts_in, extract_date, extract_merchant, extract_total,
                     fold, parse_amount, parse_receipt)

TODAY = date(2026, 10, 23)
RECEIPT = [
    "CỬA HÀNG TIỆN LỢI ABC", "Địa chỉ: 12 Nguyễn Huệ, Q1", "SĐT: 0901234567",
    "Ngày: 05/10/2026 14:32", "Cà phê sữa 2 x 29.000 58.000", "Bánh mì 1 x 25.000 25.000",
    "Tạm tính 83.000", "VAT 8% 6.640", "Tổng cộng 89.640",
    "Tiền khách đưa 100.000", "Tiền thừa 10.360",
]


class ParserTests(SimpleTestCase):
    def test_fold(self):
        self.assertEqual(fold("Tổng CỘNG Đồng"), "tong cong dong")

    def test_parse_amount(self):
        self.assertEqual(parse_amount("125.000"), Decimal("125000"))
        self.assertEqual(parse_amount("1,250,000"), Decimal("1250000"))
        self.assertEqual(parse_amount("125000"), Decimal("125000"))
        self.assertEqual(parse_amount("12,50"), Decimal("12.50"))
        self.assertIsNone(parse_amount("1.2.3"))

    def test_amounts_ignore_dates_times_and_phone(self):
        self.assertEqual(amounts_in("Ngày 05/10/2026 14:32"), [])
        self.assertEqual(amounts_in("SĐT 0901234567"), [])
        self.assertEqual(amounts_in("Cà phê 2 x 29.000 58.000")[-1], Decimal("58000"))

    def test_ocr_digit_confusion(self):
        self.assertEqual(amounts_in("Tong cong 1O5.OOO"), [Decimal("105000")])

    def test_full_receipt(self):
        r = parse_receipt(RECEIPT, TODAY)
        self.assertEqual(r["total"], Decimal("89640"))
        self.assertGreaterEqual(r["total_confidence"], 0.7)
        self.assertEqual(r["date"], date(2026, 10, 5))
        self.assertEqual(r["merchant"], "CỬA HÀNG TIỆN LỢI ABC")

    def test_total_on_next_line(self):
        total, _ = extract_total(["Tổng cộng", "89.640"])
        self.assertEqual(total, Decimal("89640"))

    def test_total_and_payment_disagree_is_low_confidence(self):
        # Dòng "tổng" là gốc; thanh toán lệch thì không đủ tin để đổi, nên hạ độ tin cậy
        total, conf = extract_total(["Tổng cộng 100.000", "Thanh toán 110.000"])
        self.assertEqual(total, Decimal("100000"))
        self.assertLess(conf, 0.7)

    def test_goods_total_is_not_the_amount_due(self):
        # Hóa đơn HMK Eyewear: "Tổng tiền hàng" lệch "Tổng cộng", dòng thanh toán xác nhận Tổng cộng
        lines = ["Tổng tiền hàng: 899,100", "Chiết khấu: 0", "VAT: 71,928", "Tổng cộng: 899,000",
                 "Đã thanh toán: 899,000", "Chuyển khoản: 899,000", "Còn lại: 0"]
        total, conf = extract_total(lines)
        self.assertEqual(total, Decimal("899000"))
        self.assertGreaterEqual(conf, 0.9)

    def test_misread_digit_on_total_line_is_fixed_by_payment_lines(self):
        lines = ["Tổng cộng: 999,000", "Đã thanh toán: 899,000", "Chuyển khoản: 899,000"]
        total, conf = extract_total(lines)
        self.assertEqual(total, Decimal("899000"))
        self.assertLess(conf, 0.7)  # vẫn tô vàng để người dùng kiểm tra

    def test_fallback_without_keywords_is_low_confidence(self):
        total, conf = extract_total(["Quán A", "Phở 45.000", "Trà đá 5.000", "50.000"])
        self.assertEqual(total, Decimal("50000"))
        self.assertLess(conf, 0.7)

    def test_no_amount_at_all(self):
        self.assertEqual(extract_total(["Xin cảm ơn"]), (None, 0.0))

    def test_date_formats(self):
        for text in ("05/10/2026", "2026-10-05", "05.10.26", "Ngày 05 tháng 10 năm 2026"):
            self.assertEqual(extract_date([text], TODAY), date(2026, 10, 5), text)

    def test_date_rejects_future_and_invalid(self):
        self.assertIsNone(extract_date(["05/10/2030"], TODAY))
        self.assertIsNone(extract_date(["31/02/2026"], TODAY))

    def test_merchant_skips_address_and_phone_lines(self):
        self.assertEqual(
            extract_merchant(["Hóa đơn bán hàng", "Địa chỉ: 12 ABC", "HIGHLANDS COFFEE"]),
            "HIGHLANDS COFFEE")
        self.assertIsNone(extract_merchant(["SĐT 0901234567", "12/10/2026"]))

    def test_merchant_skips_address_line(self):
        lines = ["112 Lê Duẩn - Phường Hải Châu - Thành phố Đà Nẵng", "HÓA ĐƠN ĐẶT HÀNG"]
        self.assertIsNone(extract_merchant(lines))

    def test_merchant_ignores_off_center_background_text(self):
        def meta(cx, conf=0.9):
            return {"conf": conf, "x0": cx - 40, "x1": cx + 40, "cx": cx}

        lines = ["Tab", "HMK EYEWEAR", "Cảm ơn quý khách", "Tổng cộng 899.000"]
        centered = [meta(700), meta(700), meta(700), meta(700)]
        self.assertEqual(extract_merchant(lines, centered), "Tab")  # không có tọa độ lệch thì vẫn chọn dòng đầu
        # "Tab" nằm sát rìa trái (chữ trên bàn phím phía sau): bị phạt nên dòng giữa thắng
        off = [meta(80), meta(700), meta(700), meta(700)]
        self.assertEqual(extract_merchant(lines, off), "HMK EYEWEAR")

    def test_merchant_low_confidence_returns_none(self):
        self.assertIsNone(extract_merchant(["Tab"], [{"conf": 0.2, "x0": 0, "x1": 10, "cx": 5}]))

    def test_group_lines_joins_same_row_left_to_right(self):
        def box(t, x0, y0):
            return {"text": t, "conf": 0.9, "x0": x0, "x1": x0 + 50, "y0": y0, "y1": y0 + 20}

        lines = group_lines([box("58.000", 300, 102), box("Cà phê", 10, 100),
                             box("Tổng cộng", 10, 160)])
        self.assertEqual([l["text"] for l in lines], ["Cà phê 58.000", "Tổng cộng"])
