from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from categories.models import Category
from wallets.models import Wallet

from .models import Transaction

User = get_user_model()


class TransactionTestBase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="an@example.com", password="StrongPass123!")
        self.other = User.objects.create_user(email="binh@example.com", password="StrongPass123!")
        self.client.force_authenticate(self.user)

        self.wallet = Wallet.objects.create(
            user=self.user, name="Tiền mặt", initial_balance=Decimal("1000000")
        )
        self.food = self.user.categories.get(name="Ăn uống")
        self.salary = self.user.categories.get(name="Lương")

    def _tx(self, category=None, amount="50000", wallet=None, user=None, **kwargs):
        return Transaction.objects.create(
            user=user or self.user,
            wallet=wallet or self.wallet,
            category=category or self.food,
            amount=Decimal(amount),
            **kwargs,
        )

    def _post(self, **data):
        payload = {"wallet": self.wallet.pk, "category": self.food.pk, "amount": "50000"} | data
        return self.client.post(reverse("transaction-list"), payload)


class TransactionCrudTests(TransactionTestBase):
    def test_create_sets_kind_from_category(self):
        res = self._post(category=self.salary.pk, amount="15000000", note="Lương tháng 10")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["kind"], "income")
        self.assertEqual(res.data["category_name"], "Lương")
        self.assertEqual(res.data["wallet_name"], "Tiền mặt")
        self.assertEqual(res.data["amount"], "15000000.00")

    def test_client_cannot_set_kind(self):
        res = self._post(kind="income")  # danh mục Ăn uống là chi
        self.assertEqual(res.data["kind"], "expense")

    def test_default_date_is_today(self):
        res = self._post()
        self.assertEqual(res.data["date"], date.today().isoformat())

    def test_amount_must_be_positive(self):
        for amount in ("0", "-1000"):
            res = self._post(amount=amount)
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("amount", res.data)

    def test_update_category_changes_kind(self):
        tx = self._tx()
        res = self.client.patch(
            reverse("transaction-detail", args=[tx.pk]), {"category": self.salary.pk}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["kind"], "income")

    def test_save_with_update_fields_keeps_kind_in_sync(self):
        tx = self._tx()
        tx.category = self.salary
        tx.save(update_fields=["category"])
        tx.refresh_from_db()
        self.assertEqual(tx.kind, "income")

    def test_delete(self):
        tx = self._tx()
        res = self.client.delete(reverse("transaction-detail", args=[tx.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transaction.objects.filter(pk=tx.pk).exists())

    def test_other_users_wallet_or_category_rejected(self):
        other_wallet = Wallet.objects.create(user=self.other, name="Ví B")
        other_cat = self.other.categories.first()
        res = self._post(wallet=other_wallet.pk)
        self.assertEqual(res.data["wallet"], ["Ví không tồn tại."])
        res = self._post(category=other_cat.pk)
        self.assertEqual(res.data["category"], ["Danh mục không tồn tại."])

    def test_archived_wallet_and_hidden_category_rejected_for_new(self):
        archived = Wallet.objects.create(user=self.user, name="Ví cũ", is_archived=True)
        hidden = Category.objects.create(user=self.user, name="Ẩn", kind="expense", is_hidden=True)
        self.assertIn("wallet", self._post(wallet=archived.pk).data)
        self.assertIn("category", self._post(category=hidden.pk).data)

    def test_old_transaction_editable_after_archive_and_hide(self):
        tx = self._tx()
        self.wallet.is_archived = True
        self.wallet.save()
        self.food.is_hidden = True
        self.food.save()
        res = self.client.patch(reverse("transaction-detail", args=[tx.pk]), {
            "wallet": self.wallet.pk, "category": self.food.pk, "amount": "70000",
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cannot_see_or_touch_other_users_transaction(self):
        other_wallet = Wallet.objects.create(user=self.other, name="Ví B")
        tx = self._tx(user=self.other, wallet=other_wallet, category=self.other.categories.first())
        url = reverse("transaction-detail", args=[tx.pk])
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse("transaction-list")).data["count"], 0)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        res = self.client.get(reverse("transaction-list"))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class WalletBalanceTests(TransactionTestBase):
    def test_balance_reflects_transactions(self):
        self._tx(category=self.salary, amount="500000")
        self._tx(amount="120000.50")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.current_balance, Decimal("1379999.50"))

        res = self.client.get(reverse("wallet-list"))
        self.assertEqual(res.data[0]["balance"], "1379999.50")
        res = self.client.get(reverse("wallet-summary"))
        self.assertEqual(res.data["total_balance"], "1379999.50")

    def test_balance_follows_update_and_delete(self):
        tx = self._tx(amount="100000")
        self.client.patch(reverse("transaction-detail", args=[tx.pk]), {"amount": "300000"})
        self.assertEqual(Wallet.objects.get(pk=self.wallet.pk).current_balance, Decimal("700000"))
        self.client.delete(reverse("transaction-detail", args=[tx.pk]))
        self.assertEqual(Wallet.objects.get(pk=self.wallet.pk).current_balance, Decimal("1000000"))

    def test_with_balance_does_not_double_count_across_wallets(self):
        second = Wallet.objects.create(user=self.user, name="Ngân hàng", initial_balance=Decimal("0"))
        self._tx(amount="10000")
        self._tx(amount="20000", wallet=second)
        self._tx(category=self.salary, amount="5000", wallet=second)
        balances = {w.name: w.current_balance for w in Wallet.objects.with_balance()}
        self.assertEqual(balances["Tiền mặt"], Decimal("990000"))
        self.assertEqual(balances["Ngân hàng"], Decimal("-15000"))

    def test_wallet_list_uses_fixed_number_of_queries(self):
        for i in range(5):
            w = Wallet.objects.create(user=self.user, name=f"Ví {i}")
            self._tx(wallet=w)
        # Xác thực + danh sách ví kèm số dư; không tăng theo số ví
        with self.assertNumQueries(1):
            list(Wallet.objects.filter(user=self.user).with_balance().values_list("id"))
        res = self.client.get(reverse("wallet-list"))
        self.assertEqual(len(res.data), 6)


class TransferTests(TransactionTestBase):
    def setUp(self):
        super().setUp()
        self.destination = Wallet.objects.create(user=self.user, name="MoMo")

    def _transfer(self, **payload):
        return self.client.post(reverse("transaction-list"), {
            "wallet": self.wallet.pk,
            "to_wallet": self.destination.pk,
            "amount": "100000",
            "date": "2026-11-10",
        } | payload)

    def test_create_transfer_moves_balance_without_income_or_expense(self):
        response = self._transfer(fee="5000", note="Nạp ví")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["kind"], "transfer")
        self.assertIsNone(response.data["category"])
        self.assertEqual(response.data["to_wallet_name"], "MoMo")
        self.assertEqual(Wallet.objects.get(pk=self.wallet.pk).current_balance, Decimal("895000"))
        self.assertEqual(Wallet.objects.get(pk=self.destination.pk).current_balance, Decimal("100000"))

        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 2)
        history = self.client.get(reverse("transaction-list")).data
        self.assertEqual(history["count"], 1)
        summary = self.client.get(reverse("transaction-summary")).data
        self.assertEqual(summary["income"], "0.00")
        self.assertEqual(summary["expense"], "0.00")
        overview = self.client.get(reverse("report_overview"), {"month": "2026-11"}).data
        self.assertEqual(overview["income"], "0.00")
        self.assertEqual(overview["expense"], "5000.00")

    def test_transfer_requires_distinct_active_owned_wallets_and_sufficient_balance(self):
        self.assertIn("to_wallet", self._transfer(to_wallet=self.wallet.pk).data)
        archived = Wallet.objects.create(user=self.user, name="Ví cũ", is_archived=True)
        self.assertIn("to_wallet", self._transfer(to_wallet=archived.pk).data)
        self.assertIn("amount", self._transfer(amount="2000000").data)
        self.assertIn("category", self._transfer(category=self.food.pk).data)

    def test_transfer_can_overdraw_credit_source(self):
        credit = Wallet.objects.create(user=self.user, name="Thẻ", kind=Wallet.Kind.CREDIT)
        response = self._transfer(wallet=credit.pk, amount="2000000")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_transfer_filter_matches_destination_and_kind(self):
        self.assertEqual(self._transfer().status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            self.client.get(reverse("transaction-list"), {"wallet": self.destination.pk}).data["count"],
            1,
        )
        self.assertEqual(
            self.client.get(reverse("transaction-list"), {"kind": "transfer"}).data["count"],
            1,
        )

    def test_update_and_delete_transfer_keep_fee_and_both_wallets_linked(self):
        created = self._transfer(fee="5000")
        transfer_id = created.data["id"]
        response = self.client.patch(reverse("transaction-detail", args=[transfer_id]), {
            "amount": "150000", "fee": "3000", "to_wallet": self.destination.pk,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(Wallet.objects.get(pk=self.wallet.pk).current_balance, Decimal("847000"))
        self.assertEqual(Wallet.objects.get(pk=self.destination.pk).current_balance, Decimal("150000"))
        fee_item = Transaction.objects.get(transfer_parent_id=transfer_id)
        self.assertEqual(fee_item.amount, Decimal("3000"))

        response = self.client.delete(reverse("transaction-detail", args=[transfer_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Wallet.objects.get(pk=self.wallet.pk).current_balance, Decimal("1000000"))
        self.assertEqual(Wallet.objects.get(pk=self.destination.pk).current_balance, Decimal("0"))
        self.assertFalse(Transaction.objects.filter(transfer_parent_id=transfer_id).exists())

    def test_transfer_changes_total_only_for_excluded_destination_wallet(self):
        self.destination.include_in_total = False
        self.destination.save()
        self.assertEqual(self._transfer().status_code, status.HTTP_201_CREATED)
        summary = self.client.get(reverse("wallet-summary")).data
        self.assertEqual(summary["total_balance"], "900000.00")


class ProtectTests(TransactionTestBase):
    def test_delete_wallet_with_transactions_returns_409(self):
        self._tx()
        res = self.client.delete(reverse("wallet-detail", args=[self.wallet.pk]))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("lưu trữ", res.data["detail"])
        self.assertTrue(Wallet.objects.filter(pk=self.wallet.pk).exists())

    def test_delete_category_with_transactions_returns_409(self):
        self._tx()
        res = self.client.delete(reverse("category-detail", args=[self.food.pk]))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("ẩn", res.data["detail"])

    def test_delete_unused_wallet_and_category_still_works(self):
        empty = Wallet.objects.create(user=self.user, name="Ví trống")
        res = self.client.delete(reverse("wallet-detail", args=[empty.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        res = self.client.delete(reverse("category-detail", args=[self.salary.pk]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_change_kind_of_used_category(self):
        self._tx()
        res = self.client.patch(reverse("category-detail", args=[self.food.pk]), {"kind": "income"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("kind", res.data)

    def test_can_change_kind_of_unused_category(self):
        res = self.client.patch(reverse("category-detail", args=[self.food.pk]), {"kind": "income"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class FilterPaginationTests(TransactionTestBase):
    def setUp(self):
        super().setUp()
        self.bank = Wallet.objects.create(user=self.user, name="Ngân hàng")
        self._tx(amount="30000", date=date(2026, 9, 5), note="Phở bò")
        self._tx(amount="250000", date=date(2026, 9, 20), note="Siêu thị", wallet=self.bank)
        self._tx(category=self.salary, amount="15000000", date=date(2026, 10, 1), note="Lương")
        self._tx(amount="45000", date=date(2026, 10, 2), note="Cơm tấm")

    def _list(self, **params):
        return self.client.get(reverse("transaction-list"), params).data

    def test_paginated_shape_and_default_order(self):
        data = self._list()
        self.assertEqual(set(data), {"count", "next", "previous", "results"})
        self.assertEqual(data["count"], 4)
        self.assertEqual([t["date"] for t in data["results"]], [
            "2026-10-02", "2026-10-01", "2026-09-20", "2026-09-05",
        ])

    def test_filters(self):
        self.assertEqual(self._list(kind="income")["count"], 1)
        self.assertEqual(self._list(wallet=self.bank.pk)["count"], 1)
        self.assertEqual(self._list(category=self.food.pk)["count"], 3)
        self.assertEqual(self._list(date_from="2026-10-01")["count"], 2)
        self.assertEqual(self._list(date_from="2026-09-01", date_to="2026-09-30")["count"], 2)
        self.assertEqual(self._list(min_amount="40000", max_amount="300000")["count"], 2)
        self.assertEqual(self._list(search="PHỞ")["count"], 1)

    def test_invalid_filter_value_returns_400(self):
        res = self.client.get(reverse("transaction-list"), {"kind": "unknown"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ordering_by_amount(self):
        data = self._list(ordering="amount")
        self.assertEqual(data["results"][0]["amount"], "30000.00")

    def test_page_size_and_max(self):
        data = self._list(page_size=3)
        self.assertEqual(len(data["results"]), 3)
        self.assertIsNotNone(data["next"])
        for i in range(120):
            self._tx(amount="1000", date=date(2026, 8, 1))
        self.assertEqual(len(self._list(page_size=500)["results"]), 100)

    def test_pages_do_not_overlap_when_dates_tie(self):
        for i in range(25):
            self._tx(amount="1000", date=date(2026, 8, 1))
        ids = []
        for page in (1, 2, 3):
            ids += [t["id"] for t in self._list(page=page, page_size=10)["results"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), 29)

    def test_summary_uses_same_filters(self):
        res = self.client.get(reverse("transaction-summary"), {"date_from": "2026-10-01"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["income"], "15000000.00")
        self.assertEqual(res.data["expense"], "45000.00")
        self.assertEqual(res.data["net"], "14955000.00")
        self.assertEqual(res.data["count"], 2)
        self.assertEqual(res.data["currency"], "VND")

    def test_summary_empty(self):
        res = self.client.get(reverse("transaction-summary"), {"date_from": "2030-01-01"})
        self.assertEqual(res.data["income"], "0.00")
        self.assertEqual(res.data["count"], 0)

    def test_delete_user_with_transactions(self):
        self._tx()
        self.user.delete()
        self.assertFalse(Transaction.objects.exists())
        self.assertFalse(Wallet.objects.filter(pk=self.wallet.pk).exists())

    def test_filter_multiple_wallets_and_categories(self):
        self.assertEqual(self._list(wallet=f"{self.wallet.pk},{self.bank.pk}")["count"], 4)
        self.assertEqual(self._list(category=f"{self.food.pk},{self.salary.pk}")["count"], 4)

    def test_search_matches_category_name(self):
        self._tx(amount="10000", date=date(2026, 8, 1))  # không có ghi chú
        self.assertEqual(self._list(search="ăn uống")["count"], 4)


class SourceAndCountTests(TransactionTestBase):
    def test_source_defaults_to_manual_and_accepts_ocr(self):
        self.assertEqual(self._post().data["source"], "manual")
        self.assertEqual(self._post(source="ocr").data["source"], "ocr")
        self.assertEqual(self._post(source="bank").status_code, status.HTTP_400_BAD_REQUEST)

    def test_category_transaction_count(self):
        self._tx()
        self._tx()
        data = self.client.get(reverse("category-list"), {"kind": "expense"}).data
        counts = {c["name"]: c["transaction_count"] for c in data}
        self.assertEqual(counts["Ăn uống"], 2)
        self.assertEqual(counts["Di chuyển"], 0)
        detail = self.client.patch(reverse("category-detail", args=[self.food.pk]), {"color": "#0F6B4F"})
        self.assertEqual(detail.data["transaction_count"], 2)
