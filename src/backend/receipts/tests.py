import os
import tempfile
from datetime import timedelta
from decimal import Decimal
from io import BytesIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase

from categories.models import Category
from wallets.models import Wallet

from .models import Receipt
from .ocr import OCRUnavailable

User = get_user_model()
SCAN = "/api/receipts/scan/"
PWD = "StrongPass123!"
LINES = [{"text": t, "conf": 0.9, "y": i * 20, "x0": 100, "x1": 300, "cx": 200} for i, t in enumerate(
    ["HIGHLANDS COFFEE", "Ngày: 05/10/2026 14:32", "Cà phê sữa 58.000", "Tổng cộng 89.640"])]


def make_image():
    buf = BytesIO()
    Image.new("RGB", (600, 900), "white").save(buf, "PNG")
    return SimpleUploadedFile("r.png", buf.getvalue(), content_type="image/png")


class ReceiptTests(APITestCase):
    def setUp(self):
        cache.clear()
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        override = override_settings(MEDIA_ROOT=tmp.name)
        override.enable()
        self.addCleanup(override.disable)
        self.user = User.objects.create_user(email="an@example.com", password=PWD)
        self.other = User.objects.create_user(email="binh@example.com", password=PWD)
        self.client.force_authenticate(self.user)
        self.wallet = Wallet.objects.create(user=self.user, name="Tiền mặt")
        self.food = Category.objects.get(user=self.user, name="Ăn uống")

    def _scan(self, lines=LINES, **kw):
        with mock.patch("receipts.service.read_lines", return_value=lines):
            return self.client.post(SCAN, {"image": make_image()}, format="multipart", **kw)

    def _tx(self, receipt_id):
        return self.client.post("/api/transactions/", {
            "wallet": self.wallet.pk, "category": self.food.pk, "amount": "89640",
            "date": "2026-10-05", "receipt": receipt_id}, format="json")

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self._scan().status_code, 401)

    def test_scan_success(self):
        res = self._scan()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(res.data["total"]), Decimal("89640"))
        self.assertEqual(res.data["receipt_date"], "2026-10-05")
        self.assertEqual(res.data["merchant"], "HIGHLANDS COFFEE")
        self.assertEqual(res.data["suggested_category_name"], "Ăn uống")
        self.assertEqual(res.data["needs_review"], [])
        self.assertTrue(os.path.exists(Receipt.objects.get().image.path))

    def _lines(self, texts):
        return [{"text": t, "conf": 0.9, "y": i * 20, "x0": 100, "x1": 300, "cx": 200}
                for i, t in enumerate(texts)]

    def test_category_not_guessed_from_address_line(self):
        # "Thành phố" (bỏ dấu: "thanh pho") không được khớp từ khóa "phở" của Ăn uống
        res = self._scan(self._lines(["CỬA HÀNG ABC", "112 Lê Duẩn - Thành phố Đà Nẵng",
                                      "Tổng cộng 899.000", "Đã thanh toán 899.000"]))
        self.assertIsNone(res.data["suggested_category"])
        self.assertIn("category", res.data["needs_review"])

    def test_retail_receipt_suggests_shopping(self):
        res = self._scan(self._lines(["HMK EYEWEAR", "112 Lê Duẩn - Thành phố Đà Nẵng",
                                      "20/10/2026 21:31", "Tổng cộng 899.000",
                                      "Đã thanh toán 899.000"]))
        self.assertEqual(res.data["suggested_category_name"], "Mua sắm")
        self.assertEqual(res.data["needs_review"], [])

    def test_scan_without_total_needs_review(self):
        res = self._scan([{"text": "Xin cảm ơn", "conf": 0.9, "y": 0}])
        self.assertIn("total", res.data["needs_review"])

    def test_scan_no_text_returns_422_and_saves_nothing(self):
        self.assertEqual(self._scan(lines=[]).status_code, 422)
        self.assertEqual(Receipt.objects.count(), 0)

    def test_scan_ocr_unavailable_returns_503(self):
        with mock.patch("receipts.service.read_lines", side_effect=OCRUnavailable("x")):
            res = self.client.post(SCAN, {"image": make_image()}, format="multipart")
        self.assertEqual(res.status_code, 503)

    def test_scan_rejects_non_image_and_missing_file(self):
        fake = SimpleUploadedFile("a.png", b"not an image", content_type="image/png")
        self.assertEqual(self.client.post(SCAN, {"image": fake}, format="multipart").status_code, 400)
        self.assertEqual(self.client.post(SCAN, {}, format="multipart").status_code, 400)

    def test_cannot_read_other_users_receipt(self):
        rid = self._scan().data["id"]
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/receipts/{rid}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/receipts/{rid}/").status_code, 404)

    def test_delete_unused_receipt_removes_file(self):
        rid = self._scan().data["id"]
        path = Receipt.objects.get().image.path
        self.assertEqual(self.client.delete(f"/api/receipts/{rid}/").status_code, 204)
        self.assertFalse(os.path.exists(path))

    def test_transaction_links_receipt_and_blocks_delete(self):
        rid = self._scan().data["id"]
        res = self._tx(rid)
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["receipt_image_url"])
        self.assertEqual(self.client.delete(f"/api/receipts/{rid}/").status_code, 409)

    def test_receipt_cannot_be_reused_or_stolen(self):
        rid = self._scan().data["id"]
        self._tx(rid)
        self.assertEqual(self._tx(rid).status_code, 400)
        self.client.force_authenticate(self.other)
        other_wallet = Wallet.objects.create(user=self.other, name="X")
        other_cat = Category.objects.filter(user=self.other, kind="expense").first()
        res = self.client.post("/api/transactions/", {
            "wallet": other_wallet.pk, "category": other_cat.pk, "amount": "1",
            "date": "2026-10-05", "receipt": rid}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_cleanup_removes_only_old_unused(self):
        old_unused = self._scan().data["id"]
        old_used = self._scan().data["id"]
        fresh = self._scan().data["id"]
        self._tx(old_used)
        old = timezone.now() - timedelta(hours=25)
        Receipt.objects.filter(pk__in=[old_unused, old_used]).update(created_at=old)
        call_command("cleanup_receipts")
        remaining = set(Receipt.objects.values_list("pk", flat=True))
        self.assertEqual(remaining, {old_used, fresh})
