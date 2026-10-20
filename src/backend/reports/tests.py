from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from categories.models import Category
from transactions.models import Transaction
from wallets.models import Wallet

User = get_user_model()
PWD = "StrongPass123!"
BASE = "/api/reports/"


class ReportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="an@example.com", password=PWD)
        self.other = User.objects.create_user(email="binh@example.com", password=PWD)
        self.client.force_authenticate(self.user)
        self.w1 = Wallet.objects.create(user=self.user, name="Tiền mặt")
        self.w2 = Wallet.objects.create(user=self.user, name="Ngân hàng")
        expenses = Category.objects.filter(user=self.user, kind="expense")
        self.food, self.car = expenses[0], expenses[1]
        self.salary = Category.objects.filter(user=self.user, kind="income").first()

    def _tx(self, amount, day, category=None, wallet=None):
        Transaction.objects.create(
            user=self.user, wallet=wallet or self.w1, category=category or self.food,
            amount=Decimal(str(amount)), date=day,
        )

    def _other_tx(self):
        w = Wallet.objects.create(user=self.other, name="X")
        c = Category.objects.filter(user=self.other, kind="expense").first()
        Transaction.objects.create(user=self.other, wallet=w, category=c,
                                   amount=Decimal("999999"), date="2026-10-05")

    def _get(self, name, **params):
        return self.client.get(f"{BASE}{name}/", params)

    # ---- Chung ----
    def test_requires_auth(self):
        self.client.force_authenticate(None)
        for name in ("overview", "monthly", "by-category", "daily"):
            self.assertEqual(self._get(name).status_code, status.HTTP_401_UNAUTHORIZED, name)

    def test_response_has_currency(self):
        self.assertEqual(self._get("overview").data["currency"], "VND")

    # ---- Theo tháng ----
    def test_monthly_fills_12_months_and_sums(self):
        self._tx(100, "2026-01-15")
        self._tx(50, "2026-01-20", category=self.car)
        self._tx(1000, "2026-01-01", category=self.salary)
        self._tx(70, "2026-03-31")
        self._tx(5, "2025-12-31")          # năm khác
        self._other_tx()                   # người khác
        res = self._get("monthly", year=2026)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        months = res.data["months"]
        self.assertEqual(len(months), 12)
        self.assertEqual(months[0]["month"], "2026-01")
        self.assertEqual(Decimal(months[0]["income"]), Decimal("1000"))
        self.assertEqual(Decimal(months[0]["expense"]), Decimal("150"))
        self.assertEqual(Decimal(months[0]["net"]), Decimal("850"))
        self.assertEqual(Decimal(months[1]["expense"]), Decimal("0"))   # tháng trống
        self.assertEqual(Decimal(months[2]["expense"]), Decimal("70"))
        self.assertEqual(Decimal(res.data["total_expense"]), Decimal("220"))
        self.assertEqual(Decimal(res.data["net"]), Decimal("780"))

    def test_monthly_wallet_filter(self):
        self._tx(100, "2026-02-01", wallet=self.w1)
        self._tx(40, "2026-02-02", wallet=self.w2)
        res = self._get("monthly", year=2026, wallet=self.w2.pk)
        self.assertEqual(Decimal(res.data["months"][1]["expense"]), Decimal("40"))

    def test_monthly_defaults_to_current_year_and_validates(self):
        self.assertEqual(self._get("monthly").status_code, status.HTTP_200_OK)
        for bad in ("abc", "1999", "2101", "-1"):
            self.assertEqual(self._get("monthly", year=bad).status_code,
                             status.HTTP_400_BAD_REQUEST, bad)
        self.assertEqual(self._get("monthly", wallet="x").status_code,
                         status.HTTP_400_BAD_REQUEST)

    # ---- Theo danh mục ----
    def test_by_category_sorted_with_percent(self):
        self._tx(30000, "2026-10-05")
        self._tx(20000, "2026-10-06")
        self._tx(25000, "2026-10-07", category=self.car)
        self._tx(70000, "2026-10-08", category=self.salary)   # là thu, không lẫn vào chi
        self._tx(999, "2026-09-30")                           # tháng trước
        self._tx(999, "2026-11-01")                           # tháng sau
        self._other_tx()
        res = self._get("by-category", month="2026-10")
        self.assertEqual(Decimal(res.data["total"]), Decimal("75000"))
        items = res.data["items"]
        self.assertEqual([i["category"] for i in items], [self.food.pk, self.car.pk])
        self.assertEqual(Decimal(items[0]["total"]), Decimal("50000"))
        self.assertEqual(items[0]["count"], 2)
        self.assertEqual(items[0]["percent"], 66.7)
        self.assertEqual(items[1]["percent"], 33.3)
        self.assertEqual(items[0]["category_name"], self.food.name)

    def test_by_category_income_kind(self):
        self._tx(70000, "2026-10-08", category=self.salary)
        self._tx(5000, "2026-10-09")
        res = self._get("by-category", month="2026-10", kind="income")
        self.assertEqual(len(res.data["items"]), 1)
        self.assertEqual(res.data["items"][0]["percent"], 100.0)

    def test_by_category_empty(self):
        res = self._get("by-category", month="2026-10")
        self.assertEqual(res.data["items"], [])
        self.assertEqual(Decimal(res.data["total"]), Decimal("0"))

    def test_by_category_date_range_is_inclusive(self):
        self._tx(1, "2026-10-04")
        self._tx(10, "2026-10-05")
        self._tx(20, "2026-10-06")
        self._tx(1, "2026-10-07")
        res = self._get("by-category", date_from="2026-10-05", date_to="2026-10-06")
        self.assertEqual(Decimal(res.data["total"]), Decimal("30"))
        self.assertEqual((res.data["from"], res.data["to"]), ("2026-10-05", "2026-10-06"))

    def test_by_category_validation(self):
        bad_params = [
            {"month": "2026-13"}, {"month": "abc"}, {"kind": "all"},
            {"date_from": "2026-10-05"},                               # thiếu date_to
            {"date_from": "abc", "date_to": "2026-10-06"},
            {"date_from": "2026-10-06", "date_to": "2026-10-05"},      # ngược
        ]
        for p in bad_params:
            self.assertEqual(self._get("by-category", **p).status_code,
                             status.HTTP_400_BAD_REQUEST, p)

    # ---- Theo ngày ----
    def test_daily_fills_every_day(self):
        self._tx(100, "2026-10-05")
        self._tx(50, "2026-10-05")
        self._tx(300, "2026-10-31", category=self.salary)
        days = self._get("daily", month="2026-10").data["days"]
        self.assertEqual(len(days), 31)
        self.assertEqual(Decimal(days[4]["expense"]), Decimal("150"))
        self.assertEqual(Decimal(days[30]["income"]), Decimal("300"))
        self.assertEqual(Decimal(days[0]["expense"]), Decimal("0"))

    def test_daily_handles_short_months(self):
        self.assertEqual(len(self._get("daily", month="2027-02").data["days"]), 28)
        self.assertEqual(len(self._get("daily", month="2028-02").data["days"]), 29)

    # ---- Tổng quan ----
    def test_overview_compares_with_previous_month(self):
        self._tx(40000, "2026-09-10")
        self._tx(60000, "2026-10-10")
        self._tx(100000, "2026-10-01", category=self.salary)
        self._tx(20000, "2026-10-11", category=self.car)
        res = self._get("overview", month="2026-10")
        self.assertEqual(Decimal(res.data["expense"]), Decimal("80000"))
        self.assertEqual(Decimal(res.data["income"]), Decimal("100000"))
        self.assertEqual(Decimal(res.data["net"]), Decimal("20000"))
        self.assertEqual(res.data["previous_month"], "2026-09")
        self.assertEqual(Decimal(res.data["previous"]["expense"]), Decimal("40000"))
        self.assertEqual(res.data["expense_change_percent"], 100.0)
        self.assertIsNone(res.data["income_change_percent"])    # tháng trước không có thu
        top = res.data["top_expense_categories"]
        self.assertEqual(top[0]["category"], self.food.pk)

    def test_overview_previous_month_across_year(self):
        self._tx(100, "2026-12-15")
        res = self._get("overview", month="2027-01")
        self.assertEqual(res.data["previous_month"], "2026-12")
        self.assertEqual(Decimal(res.data["previous"]["expense"]), Decimal("100"))

    def test_overview_top_categories_limited_to_five(self):
        expenses = Category.objects.filter(user=self.user, kind="expense")[:7]
        for i, c in enumerate(expenses, start=1):
            self._tx(i * 1000, "2026-10-05", category=c)
        res = self._get("overview", month="2026-10")
        self.assertEqual(len(res.data["top_expense_categories"]), 5)

    def test_overview_empty_month(self):
        res = self._get("overview", month="2026-10")
        self.assertEqual(Decimal(res.data["expense"]), Decimal("0"))
        self.assertIsNone(res.data["expense_change_percent"])
        self.assertEqual(res.data["top_expense_categories"], [])
    def test_money_sent_as_string_in_json(self):
        # Response không qua serializer: số tiền phải là chuỗi trong JSON, không phải số thực
        self._tx(65000.5, "2026-10-05")
        body = self._get("overview", month="2026-10").json()
        self.assertEqual(body["expense"], "65000.50")
        self.assertEqual(body["income"], "0.00")
        self.assertEqual(body["previous"]["net"], "0.00")
        self.assertEqual(body["top_expense_categories"][0]["total"], "65000.50")
        self.assertEqual(body["top_expense_categories"][0]["percent"], 100.0)
        months = self._get("monthly", year=2026).json()["months"]
        self.assertEqual(months[9]["expense"], "65000.50")
        self.assertEqual(self._get("daily", month="2026-10").json()["days"][4]["expense"], "65000.50")
