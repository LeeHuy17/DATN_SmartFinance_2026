from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Transaction(models.Model):
    class Kind(models.TextChoices):
        INCOME = "income", "Thu"
        EXPENSE = "expense", "Chi"
        TRANSFER = "transfer", "Chuyển khoản"

    class Source(models.TextChoices):
        MANUAL = "manual", "Nhập tay"
        OCR = "ocr", "Quét hóa đơn"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions"
    )
    # RESTRICT thay vì PROTECT: vẫn chặn xóa riêng ví/danh mục đang có giao dịch (view trả 409),
    # nhưng cho xóa user vì giao dịch của user cũng bị xóa theo trong cùng lần xóa
    wallet = models.ForeignKey(
        "wallets.Wallet", on_delete=models.RESTRICT, related_name="transactions"
    )
    category = models.ForeignKey(
        "categories.Category", null=True, blank=True,
        on_delete=models.RESTRICT, related_name="transactions",
    )
    to_wallet = models.ForeignKey(
        "wallets.Wallet", null=True, blank=True, on_delete=models.RESTRICT,
        related_name="received_transfers",
    )
    fee = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0"))
    transfer_parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="fee_items"
    )
    # Luôn lấy theo category, xem save()
    kind = models.CharField(max_length=8, choices=Kind.choices, editable=False)
    amount = models.DecimalField(
        max_digits=18, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    note = models.CharField(max_length=255, blank=True)
    # Nhập tay hay tạo từ hóa đơn quét được (app hiện nhãn khác nhau)
    source = models.CharField(max_length=6, choices=Source.choices, default=Source.MANUAL)
    date = models.DateField(default=timezone.localdate)
    # Hóa đơn đã quét gắn với giao dịch này; mỗi hóa đơn chỉ dùng cho một giao dịch
    receipt = models.OneToOneField(
        "receipts.Receipt", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transaction",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date", "-id")
        indexes = [
            models.Index(fields=("user", "-date"), name="tx_user_date_idx"),
            models.Index(fields=("user", "wallet", "-date"), name="tx_user_wallet_date_idx"),
            models.Index(fields=("user", "category", "-date"), name="tx_user_cat_date_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.transfer_parent_id:
            self.kind = self.category.kind
        elif self.to_wallet_id:
            self.kind = self.Kind.TRANSFER
            self.category = None
        else:
            self.kind = self.category.kind
        update_fields = kwargs.get("update_fields")
        if update_fields is not None and {"category", "to_wallet"} & set(update_fields):
            kwargs["update_fields"] = {*update_fields, "kind"}
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.date} {self.kind} {self.amount}"
