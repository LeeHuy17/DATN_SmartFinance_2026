from decimal import Decimal

from django.conf import settings
from django.db import models


class Wallet(models.Model):
    class Kind(models.TextChoices):
        CASH = "cash", "Tiền mặt"
        BANK = "bank", "Tài khoản ngân hàng"
        EWALLET = "ewallet", "Ví điện tử"
        CREDIT = "credit", "Thẻ tín dụng"
        SAVINGS = "savings", "Tiết kiệm"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallets"
    )
    name = models.CharField(max_length=60)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.CASH)
    initial_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0"))
    include_in_total = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    icon = models.CharField(max_length=50, default="wallet-outline")  # tên Ionicons
    color = models.CharField(max_length=7, default="#0F6B4F")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        constraints = [
            models.UniqueConstraint(fields=("user", "name"), name="uniq_wallet_user_name")
        ]

    @property
    def current_balance(self):
        # Nhánh feature/transactions sẽ sửa: initial_balance + thu - chi
        return self.initial_balance

    def __str__(self):
        return self.name
