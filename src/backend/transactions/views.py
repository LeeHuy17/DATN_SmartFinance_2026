from datetime import date
from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from budgets.services import alerts_for
from categories.models import Category
from notifications.services import notify_budget_alerts
from wallets.models import Wallet

from .filters import StableOrderingFilter, TransactionFilter
from .models import Transaction
from .pagination import TransactionPagination
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    pagination_class = TransactionPagination
    filter_backends = (DjangoFilterBackend, StableOrderingFilter)
    filterset_class = TransactionFilter
    ordering_fields = ("date", "amount", "created_at")
    ordering = ("-date",)

    def get_queryset(self):
        return Transaction.objects.filter(
            user=self.request.user, transfer_parent__isnull=True
        ).select_related(
            "wallet", "to_wallet", "category", "receipt"
        )

    def _locked_wallets(self, source, destination=None, previous=None):
        ids = {source.pk}
        if destination:
            ids.add(destination.pk)
        if previous:
            ids.update((previous.wallet_id, previous.to_wallet_id))
        return {
            wallet.pk: wallet
            for wallet in Wallet.objects.select_for_update().filter(pk__in=ids).order_by("pk")
        }

    def _check_transfer_balance(self, source, amount, fee, previous, locked):
        source = locked[source.pk]
        if source.kind == Wallet.Kind.CREDIT:
            return
        available = source.current_balance
        if previous and previous.wallet_id == source.pk:
            if previous.kind == Transaction.Kind.TRANSFER:
                available += previous.amount + previous.fee
            elif previous.kind == Transaction.Kind.EXPENSE:
                available += previous.amount
            elif previous.kind == Transaction.Kind.INCOME:
                available -= previous.amount
        if amount + fee > available:
            raise ValidationError({"amount": "Số dư ví nguồn không đủ cho khoản chuyển và phí."})

    def _sync_transfer_fee(self, transfer):
        fee_item = transfer.fee_items.first()
        if transfer.fee <= 0:
            if fee_item:
                fee_item.delete()
            return

        category = Category.objects.filter(
            user=transfer.user, kind=Category.Kind.EXPENSE, name="Chi tiêu khác"
        ).first()
        if category is None:
            category = Category.objects.filter(
                user=transfer.user, kind=Category.Kind.EXPENSE
            ).order_by("id").first()
        if category is None:
            raise ValidationError({"fee": "Cần có danh mục chi tiêu để ghi nhận phí chuyển."})

        values = {
            "user": transfer.user,
            "wallet": transfer.wallet,
            "category": category,
            "amount": transfer.fee,
            "date": transfer.date,
            "note": f"Phí chuyển tiền{f': {transfer.note}' if transfer.note else ''}"[:255],
            "source": Transaction.Source.MANUAL,
        }
        if fee_item:
            for field, value in values.items():
                setattr(fee_item, field, value)
            fee_item.save()
        else:
            Transaction.objects.create(transfer_parent=transfer, **values)

    def perform_create(self, serializer):
        with db_transaction.atomic():
            source = serializer.validated_data["wallet"]
            destination = serializer.validated_data.get("to_wallet")
            locked = self._locked_wallets(source, destination)
            if destination:
                self._check_transfer_balance(
                    source, serializer.validated_data["amount"],
                    serializer.validated_data.get("fee", Decimal("0")), None, locked,
                )
            item = serializer.save(user=self.request.user)
            if destination:
                self._sync_transfer_fee(item)

    def perform_update(self, serializer):
        previous = serializer.instance
        with db_transaction.atomic():
            source = serializer.validated_data.get("wallet", previous.wallet)
            destination = serializer.validated_data.get(
                "to_wallet", previous.to_wallet if previous.kind == Transaction.Kind.TRANSFER else None
            )
            locked = self._locked_wallets(source, destination, previous)
            if destination:
                self._check_transfer_balance(
                    source, serializer.validated_data.get("amount", previous.amount),
                    serializer.validated_data.get("fee", previous.fee), previous, locked,
                )
            item = serializer.save()
            if item.kind == Transaction.Kind.TRANSFER:
                self._sync_transfer_fee(item)

    def _with_alerts(self, response):
        data = response.data
        if response.status_code in (200, 201) and data.get("kind") in ("expense", "transfer"):
            category_id = data["category"]
            if data.get("kind") == "transfer":
                if Decimal(data.get("fee", "0")) <= 0:
                    return response
                fee_item = Transaction.objects.get(transfer_parent_id=data["id"])
                category_id = fee_item.category_id
            tx_date = date.fromisoformat(data["date"])
            alerts = alerts_for(self.request.user, tx_date, category_id)
            data["budget_alerts"] = alerts
            # Lưu vào Hộp thư; mỗi mốc của mỗi ngân sách chỉ báo một lần trong tháng
            notify_budget_alerts(self.request.user, alerts, tx_date.strftime("%Y-%m"))
        return response

    def create(self, request, *args, **kwargs):
        return self._with_alerts(super().create(request, *args, **kwargs))

    def update(self, request, *args, **kwargs):
        return self._with_alerts(super().update(request, *args, **kwargs))

    def perform_destroy(self, instance):
        with db_transaction.atomic():
            instance.delete()

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Tổng thu/chi của đúng tập đã lọc, dùng cùng tham số với danh sách."""
        qs = self.filter_queryset(self.get_queryset())
        zero = Value(Decimal("0"), output_field=DecimalField(max_digits=18, decimal_places=2))
        agg = qs.aggregate(
            income=Coalesce(Sum("amount", filter=Q(kind="income")), zero),
            expense=Coalesce(Sum("amount", filter=Q(kind="expense")), zero),
        )
        cents = Decimal("0.01")
        # Trả chuỗi 2 chữ số thập phân giống amount và /wallets/summary/, tránh sai số float
        return Response({
            "income": str(agg["income"].quantize(cents)),
            "expense": str(agg["expense"].quantize(cents)),
            "net": str((agg["income"] - agg["expense"]).quantize(cents)),
            "count": qs.count(),
            "currency": request.user.currency,
        })
