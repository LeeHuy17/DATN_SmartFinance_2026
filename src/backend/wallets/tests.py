from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Wallet

User = get_user_model()


class WalletTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="an@example.com", password="StrongPass123!")
        self.other = User.objects.create_user(email="binh@example.com", password="StrongPass123!")
        self.client.force_authenticate(self.user)

    def _wallet(self, user=None, **kwargs):
        data = {"name": "Tiền mặt", "initial_balance": Decimal("100000")} | kwargs
        return Wallet.objects.create(user=user or self.user, **data)

    def test_create_wallet(self):
        res = self.client.post(reverse("wallet-list"), {
            "name": "Vietcombank", "kind": "bank", "initial_balance": "2500000.50",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["balance"], "2500000.50")
        self.assertEqual(res.data["currency"], "VND")

    def test_duplicate_name_rejected(self):
        self._wallet()
        res = self.client.post(reverse("wallet-list"), {"name": "tiền mặt"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", res.data)

    def test_same_name_for_other_user_allowed(self):
        self._wallet(user=self.other)
        res = self.client.post(reverse("wallet-list"), {"name": "Tiền mặt"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_invalid_kind_rejected(self):
        res = self.client.post(reverse("wallet-list"), {"name": "X", "kind": "crypto"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_hides_archived_unless_requested(self):
        self._wallet()
        self._wallet(name="Ví cũ", is_archived=True)
        res = self.client.get(reverse("wallet-list"))
        self.assertEqual([w["name"] for w in res.data], ["Tiền mặt"])
        res = self.client.get(reverse("wallet-list"), {"include_archived": "1"})
        self.assertEqual(len(res.data), 2)

    def test_archived_wallet_still_reachable_by_id(self):
        wallet = self._wallet(is_archived=True)
        res = self.client.patch(reverse("wallet-detail", args=[wallet.pk]), {"is_archived": False})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cannot_touch_other_users_wallet(self):
        wallet = self._wallet(user=self.other)
        url = reverse("wallet-detail", args=[wallet.pk])
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_summary_counts_only_active_included_wallets(self):
        self._wallet(initial_balance=Decimal("100000"))
        self._wallet(name="Ngân hàng", initial_balance=Decimal("250000.50"))
        self._wallet(name="Tiết kiệm", initial_balance=Decimal("9000000"), include_in_total=False)
        self._wallet(name="Ví cũ", initial_balance=Decimal("500"), is_archived=True)
        self._wallet(user=self.other, initial_balance=Decimal("777"))

        res = self.client.get(reverse("wallet-summary"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_balance"], "350000.50")
        self.assertEqual(res.data["wallet_count"], 2)
        self.assertEqual(res.data["currency"], "VND")

    def test_summary_without_wallets(self):
        res = self.client.get(reverse("wallet-summary"))
        self.assertEqual(res.data["total_balance"], "0.00")
        self.assertEqual(res.data["wallet_count"], 0)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        res = self.client.get(reverse("wallet-list"))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
