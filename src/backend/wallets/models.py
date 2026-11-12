from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce


def _zero():
    return Value(Decimal("0"), output_field=DecimalField(max_digits=18, decimal_places=2))


class WalletQuerySet(models.QuerySet):
    def with_balance(self):
        """Tính số dư trong một câu SQL, tránh N+1 khi liệt kê nhiều ví."""
        from transactions.models import Transaction

        incoming = (
            Transaction.objects.filter(to_wallet_id=OuterRef("pk"), kind="transfer")
            .order_by()
            .values("to_wallet_id")
            .annotate(total=Sum("amount"))
            .values("total")[:1]
        )
        return self.annotate(
            income_total=Coalesce(
                Sum("transactions__amount", filter=Q(transactions__kind="income")), _zero()
            ),
            expense_total=Coalesce(
                Sum("transactions__amount", filter=Q(transactions__kind="expense")), _zero()
            ),
            transfer_out_total=Coalesce(
                Sum("transactions__amount", filter=Q(transactions__kind="transfer")), _zero()
            ),
            transfer_in_total=Coalesce(Subquery(incoming), _zero()),
        )


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

    objects = WalletQuerySet.as_manager()

    class Meta:
        ordering = ("created_at",)
        constraints = [
            models.UniqueConstraint(fields=("user", "name"), name="uniq_wallet_user_name")
        ]

    @property
    def current_balance(self):
        if hasattr(self, "income_total"):
            income, expense = self.income_total, self.expense_total
            transfer_out = self.transfer_out_total
            transfer_in = self.transfer_in_total
        else:
            agg = self.transactions.aggregate(
                income=Coalesce(Sum("amount", filter=Q(kind="income")), _zero()),
                expense=Coalesce(Sum("amount", filter=Q(kind="expense")), _zero()),
                transfer_out=Coalesce(Sum("amount", filter=Q(kind="transfer")), _zero()),
            )
            incoming = self.received_transfers.filter(kind="transfer").aggregate(
                total=Coalesce(Sum("amount"), _zero())
            )["total"]
            income, expense = agg["income"], agg["expense"]
            transfer_out, transfer_in = agg["transfer_out"], incoming
        return self.initial_balance + income - expense - transfer_out + transfer_in

    def __str__(self):
        return self.name
