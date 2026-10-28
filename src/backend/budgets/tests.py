from datetime import date
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from transactions.models import Transaction
from wallets.models import Wallet

from .models import Budget, BudgetAmount

User = get_user_model()

TODAY = date(2026, 10, 19)


class BudgetTestBase(APITestCase):
    def setUp(self):
        # Cố định "hôm nay" để tháng mặc định của ngân sách không phụ thuộc ngày chạy test
        patcher = mock.patch("django.utils.timezone.localdate", return_value=TODAY)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.user = User.objects.create_user(email="an@example.com", password="StrongPass123!")
        self.other = User.objects.create_user(email="binh@example.com", password="StrongPass123!")
        self.client.force_authenticate(self.user)
        self.wallet = Wallet.objects.create(user=self.user, name="Tiền mặt")
        self.food = self.user.categories.get(name="Ăn uống")
        self.transport = self.user.categories.get(name="Di chuyển")
        self.salary = self.user.categories.get(name="Lương")

    def _tx(self, amount, category=None, day=TODAY, wallet=None):
        return Transaction.objects.create(
            user=self.user, wallet=wallet or self.wallet, category=category or self.food,
            amount=Decimal(amount), date=day,
        )

    def _budget(self, amount, category=None, since=date(2026, 1, 1), user=None, **kwargs):
        """Ngân sách có hạn mức `amount` áp dụng từ tháng `since` (mặc định đầu năm, để test tháng cũ)"""
        budget = Budget.objects.create(user=user or self.user, category=category, **kwargs)
        BudgetAmount.objects.create(budget=budget, month=since, amount=Decimal(amount))
        return budget

    def _list(self, **params):
        return self.client.get(reverse("budget-list"), params).data


class BudgetCrudTests(BudgetTestBase):
    def test_create_category_and_overall_budget(self):
        res = self.client.post(reverse("budget-list"), {"category": self.food.pk, "amount": "350000"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["category_name"], "Ăn uống")
        self.assertEqual(res.data["alert_threshold"], 80)
        self.assertEqual(res.data["spent"], "0.00")
        self.assertEqual(res.data["status"], "ok")
        self.assertEqual(res.data["month"], "2026-10")

        res = self.client.post(reverse("budget-list"), {"amount": "5000000"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(res.data["category"])
        self.assertEqual(res.data["category_name"], "Tổng chi tiêu")
        self.assertEqual(res.data["category_icon"], "wallet-outline")

    def test_duplicate_category_budget_rejected(self):
        self._budget("100000", self.food)
        res = self.client.post(reverse("budget-list"), {"category": self.food.pk, "amount": "200000"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["category"], ["Danh mục này đã có ngân sách."])

    def test_only_one_overall_budget(self):
        self._budget("1000000")
        res = self.client.post(reverse("budget-list"), {"amount": "2000000"}, format="json")
        self.assertEqual(res.data["category"], ["Bạn đã có ngân sách tổng."])

    def test_db_constraint_blocks_second_overall_budget(self):
        self._budget("1000000")
        with self.assertRaises(IntegrityError):
            self._budget("2000000")

    def test_income_category_rejected(self):
        res = self.client.post(reverse("budget-list"), {"category": self.salary.pk, "amount": "1000"})
        self.assertEqual(res.data["category"], ["Chỉ đặt ngân sách cho danh mục chi."])

    def test_other_users_category_rejected(self):
        res = self.client.post(
            reverse("budget-list"), {"category": self.other.categories.first().pk, "amount": "1000"}
        )
        self.assertEqual(res.data["category"], ["Danh mục không tồn tại."])

    def test_amount_and_threshold_validation(self):
        url = reverse("budget-list")
        self.assertIn("amount", self.client.post(url, {"category": self.food.pk, "amount": "0"}).data)
        res = self.client.post(url, {"category": self.food.pk, "amount": "1000", "alert_threshold": 101})
        self.assertIn("alert_threshold", res.data)

    def test_update_keeps_category_when_omitted(self):
        budget = self._budget("100000", self.food)
        res = self.client.patch(reverse("budget-detail", args=[budget.pk]), {"amount": "150000"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["category"], self.food.pk)

    def test_cannot_touch_other_users_budget(self):
        budget = self._budget("1000", user=self.other)
        url = reverse("budget-detail", args=[budget.pk])
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_deleting_category_deletes_its_budget(self):
        cat = self.user.categories.create(name="Thú cưng", kind="expense")
        self._budget("100000", cat)
        cat.delete()
        self.assertFalse(Budget.objects.filter(category_id=cat.pk).exists())

    def test_cannot_switch_budgeted_category_to_income(self):
        self._budget("100000", self.transport)
        res = self.client.patch(reverse("category-detail", args=[self.transport.pk]), {"kind": "income"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("kind", res.data)

    def test_filter_is_active(self):
        self._budget("100000", self.food)
        self._budget("100000", self.transport, is_active=False)
        self.assertEqual(len(self._list(is_active="1")), 1)
        self.assertEqual(len(self._list(is_active="0")), 1)
        self.assertEqual(len(self._list()), 2)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("budget-list")).status_code, 401)


class BudgetSpendingTests(BudgetTestBase):
    def test_spent_and_status_thresholds(self):
        self._budget("100000", self.food)
        cases = [("79999", "ok"), ("1", "warning"), ("20000", "warning"), ("0.01", "exceeded")]
        total = Decimal("0")
        for amount, expected in cases:
            self._tx(amount)
            total += Decimal(amount)
            data = self._list()[0]
            self.assertEqual(data["status"], expected, f"đã chi {total}")
        self.assertEqual(data["spent"], "100000.01")
        self.assertEqual(data["remaining"], "-0.01")
        self.assertEqual(data["amount"], "100000.00")

    def test_exactly_100_percent_is_warning(self):
        self._budget("100000", self.food)
        self._tx("100000")
        data = self._list()[0]
        self.assertEqual(data["status"], "warning")
        self.assertEqual(data["percent"], 100.0)

    def test_custom_threshold(self):
        self._budget("100000", self.food, alert_threshold=50)
        self._tx("50000")
        self.assertEqual(self._list()[0]["status"], "warning")

    def test_overall_budget_counts_all_expense_categories(self):
        self._budget("1000000")
        self._tx("100000", self.food)
        self._tx("50000", self.transport)
        self._tx("9999999", self.salary)  # khoản thu không tính
        self.assertEqual(self._list()[0]["spent"], "150000.00")

    def test_counts_archived_and_excluded_wallets(self):
        hidden = Wallet.objects.create(
            user=self.user, name="Ví cũ", is_archived=True, include_in_total=False
        )
        self._budget("100000", self.food)
        self._tx("30000", wallet=hidden)
        self.assertEqual(self._list()[0]["spent"], "30000.00")

    def test_month_param(self):
        self._budget("100000", self.food)
        self._tx("40000", day=date(2026, 9, 30))
        self._tx("10000", day=date(2026, 10, 1))
        self._tx("70000", day=date(2026, 11, 1))
        self.assertEqual(self._list()[0]["spent"], "10000.00")
        sept = self._list(month="2026-09")[0]
        self.assertEqual((sept["spent"], sept["month"]), ("40000.00", "2026-09"))
        self.assertEqual(self._list(month="2026-11")[0]["spent"], "70000.00")

    def test_december_rolls_over_to_next_year(self):
        self._budget("100000", self.food)
        self._tx("20000", day=date(2026, 12, 31))
        self._tx("50000", day=date(2027, 1, 1))
        self.assertEqual(self._list(month="2026-12")[0]["spent"], "20000.00")

    def test_invalid_month_returns_400(self):
        for value in ("2026-13", "abc", "2026"):
            res = self.client.get(reverse("budget-list"), {"month": value})
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, value)
            self.assertIn("month", res.data)

    def test_other_users_spending_not_counted(self):
        self._budget("100000", self.food)
        other_wallet = Wallet.objects.create(user=self.other, name="Ví B")
        Transaction.objects.create(
            user=self.other, wallet=other_wallet, category=self.other.categories.get(name="Ăn uống"),
            amount=Decimal("90000"), date=TODAY,
        )
        self.assertEqual(self._list()[0]["status"], "ok")

    def test_list_query_count_does_not_grow_with_budgets(self):
        for cat in self.user.categories.filter(kind="expense")[:6]:
            self._budget("100000", cat)
            self._tx("1000", cat)
        self._budget("1000000")
        # xác thực bỏ qua (force_authenticate): 1 truy vấn gom chi tiêu + 1 truy vấn danh sách
        with self.assertNumQueries(2):
            data = self._list()
        self.assertEqual(len(data), 7)


class BudgetAlertTests(BudgetTestBase):
    def test_alerts_endpoint_only_warning_and_exceeded_sorted(self):
        self._budget("100000", self.food)
        self._budget("100000", self.transport)
        self._budget("1000000")
        self._budget("100000", self.user.categories.get(name="Mua sắm"), is_active=False)
        self._tx("150000", self.food)       # 150% exceeded
        self._tx("85000", self.transport)   # 85% warning
        self._tx("200000", self.user.categories.get(name="Mua sắm"))  # ngân sách đang tắt
        res = self.client.get(reverse("budget-alerts"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [(d["category_name"], d["status"]) for d in res.data],
            [("Ăn uống", "exceeded"), ("Di chuyển", "warning")],
        )

    def _post_tx(self, **data):
        payload = {"wallet": self.wallet.pk, "category": self.food.pk, "amount": "50000",
                   "date": TODAY.isoformat()} | data
        return self.client.post(reverse("transaction-list"), payload)

    def test_expense_response_includes_budget_alerts(self):
        self._budget("100000", self.food)
        self._budget("1000000")
        res = self._post_tx(amount="50000")
        self.assertEqual(res.data["budget_alerts"], [])

        res = self._post_tx(amount="40000")  # 90% của Ăn uống, 9% của tổng
        alerts = res.data["budget_alerts"]
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["category_name"], "Ăn uống")
        self.assertEqual(alerts[0]["status"], "warning")
        self.assertEqual(alerts[0]["spent"], "90000.00")
        self.assertEqual(alerts[0]["percent"], 90.0)

    def test_alerts_only_for_affected_budgets(self):
        self._budget("10000", self.transport)
        self._tx("50000", self.transport)  # Di chuyển đã vượt
        res = self._post_tx(category=self.food.pk)
        self.assertEqual(res.data["budget_alerts"], [])

    def test_alerts_use_month_of_transaction(self):
        self._budget("100000", self.food)
        self._tx("95000", day=date(2026, 9, 10))
        res = self._post_tx(amount="1000", date="2026-09-20")
        self.assertEqual(res.data["budget_alerts"][0]["status"], "warning")
        res = self._post_tx(amount="1000")  # tháng 10 mới chi 1.000
        self.assertEqual(res.data["budget_alerts"], [])

    def test_patch_includes_alerts(self):
        self._budget("100000", self.food)
        tx = self._tx("10000")
        res = self.client.patch(reverse("transaction-detail", args=[tx.pk]), {"amount": "120000"})
        self.assertEqual(res.data["budget_alerts"][0]["status"], "exceeded")

    def test_income_response_has_no_budget_alerts(self):
        self._budget("1000000")
        res = self._post_tx(category=self.salary.pk)
        self.assertNotIn("budget_alerts", res.data)

    def test_validation_error_has_no_budget_alerts(self):
        res = self._post_tx(amount="0")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("budget_alerts", res.data)


class BudgetHistoryTests(BudgetTestBase):
    """Hạn mức lặp lại mỗi tháng; sửa chỉ áp dụng từ tháng hiện tại, tháng đã qua giữ nguyên"""

    def _amounts(self, budget):
        return list(budget.amounts.order_by("month").values_list("month", "amount"))

    def test_user_example_september_500k_october_1m(self):
        # Tháng 9 đặt 500.000
        budget = self._budget("500000", self.food, since=date(2026, 9, 1))
        self._tx("450000", day=date(2026, 9, 15))
        # Sang tháng 10: tự dùng lại 500.000
        self.assertEqual(self._list()[0]["amount"], "500000.00")
        # Sửa tháng 10 thành 1.000.000
        res = self.client.patch(reverse("budget-detail", args=[budget.pk]), {"amount": "1000000"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["amount"], "1000000.00")
        # Tháng 9 vẫn là 500.000, trạng thái tính theo hạn mức cũ
        sept = self._list(month="2026-09")[0]
        self.assertEqual((sept["amount"], sept["spent"], sept["status"]), ("500000.00", "450000.00", "warning"))
        self.assertEqual(self._list()[0]["amount"], "1000000.00")
        # Các tháng sau dùng mức mới
        self.assertEqual(self._list(month="2026-12")[0]["amount"], "1000000.00")
        self.assertEqual(self._amounts(budget), [
            (date(2026, 9, 1), Decimal("500000")), (date(2026, 10, 1), Decimal("1000000")),
        ])

    def test_editing_twice_in_same_month_keeps_one_row(self):
        budget = self._budget("500000", self.food, since=date(2026, 9, 1))
        url = reverse("budget-detail", args=[budget.pk])
        self.client.patch(url, {"amount": "700000"})
        self.client.patch(url, {"amount": "800000"})
        self.assertEqual(len(self._amounts(budget)), 2)
        self.assertEqual(self._amounts(budget)[-1], (date(2026, 10, 1), Decimal("800000")))

    def test_editing_threshold_only_does_not_add_amount_row(self):
        budget = self._budget("500000", self.food, since=date(2026, 9, 1))
        self.client.patch(reverse("budget-detail", args=[budget.pk]), {"alert_threshold": 90})
        self.assertEqual(len(self._amounts(budget)), 1)

    def test_new_budget_starts_from_current_month(self):
        res = self.client.post(reverse("budget-list"), {"category": self.food.pk, "amount": "300000"})
        self.assertTrue(res.data["editable"])
        self.assertEqual(len(self._list()), 1)
        self.assertEqual(self._list(month="2026-09"), [])

    def test_past_month_is_read_only(self):
        budget = self._budget("500000", self.food, since=date(2026, 9, 1))
        self.assertFalse(self._list(month="2026-09")[0]["editable"])
        url = reverse("budget-detail", args=[budget.pk]) + "?month=2026-09"
        res = self.client.patch(url, {"amount": "1"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("month", res.data)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.post(reverse("budget-list") + "?month=2026-09", {"amount": "1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._amounts(budget), [(date(2026, 9, 1), Decimal("500000"))])

    def test_delete_with_history_stops_from_this_month(self):
        budget = self._budget("500000", self.food, since=date(2026, 9, 1))
        self._tx("100000", day=date(2026, 9, 3))
        res = self.client.delete(reverse("budget-detail", args=[budget.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self._list(), [])
        self.assertEqual(self._list(month="2026-11"), [])
        sept = self._list(month="2026-09")[0]
        self.assertEqual((sept["amount"], sept["spent"]), ("500000.00", "100000.00"))
        self.assertTrue(Budget.objects.filter(pk=budget.pk).exists())

    def test_delete_without_history_removes_budget(self):
        budget = self._budget("500000", self.food, since=date(2026, 10, 1))
        self.client.delete(reverse("budget-detail", args=[budget.pk]))
        self.assertFalse(Budget.objects.filter(pk=budget.pk).exists())

    def test_recreate_after_stop_continues_old_budget(self):
        budget = self._budget("500000", self.food, since=date(2026, 9, 1))
        self.client.delete(reverse("budget-detail", args=[budget.pk]))
        res = self.client.post(reverse("budget-list"), {"category": self.food.pk, "amount": "600000"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["id"], budget.pk)
        self.assertEqual(self._list(month="2026-09")[0]["amount"], "500000.00")
        self.assertEqual(self._list()[0]["amount"], "600000.00")

    def test_stopped_in_past_then_recreated(self):
        budget = self._budget("500000", self.food, since=date(2026, 7, 1))
        BudgetAmount.objects.create(budget=budget, month=date(2026, 8, 1), amount=None)
        self.assertEqual(self._list(month="2026-09"), [])
        res = self.client.post(reverse("budget-list"), {"category": self.food.pk, "amount": "200000"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self._list(month="2026-07")[0]["amount"], "500000.00")
        self.assertEqual(self._list(month="2026-09"), [])
        self.assertEqual(self._list()[0]["amount"], "200000.00")

    def test_cannot_change_category_of_budget(self):
        budget = self._budget("500000", self.food, since=date(2026, 9, 1))
        res = self.client.patch(reverse("budget-detail", args=[budget.pk]), {"category": self.transport.pk})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", res.data)

    def test_alerts_use_amount_of_transaction_month(self):
        budget = self._budget("100000", self.food, since=date(2026, 9, 1))
        BudgetAmount.objects.create(budget=budget, month=date(2026, 10, 1), amount=Decimal("1000000"))
        self._tx("85000", day=date(2026, 9, 5))
        self._tx("85000")
        payload = {"wallet": self.wallet.pk, "category": self.food.pk, "amount": "1000"}
        res = self.client.post(reverse("transaction-list"), payload | {"date": "2026-09-20"})
        self.assertEqual(res.data["budget_alerts"][0]["amount"], "100000.00")
        res = self.client.post(reverse("transaction-list"), payload | {"date": TODAY.isoformat()})
        self.assertEqual(res.data["budget_alerts"], [])

    def test_list_query_count_with_history(self):
        for cat in self.user.categories.filter(kind="expense")[:5]:
            b = self._budget("100000", cat, since=date(2026, 3, 1))
            BudgetAmount.objects.create(budget=b, month=date(2026, 6, 1), amount=Decimal("200000"))
        with self.assertNumQueries(2):
            self.assertEqual(len(self._list()), 5)
