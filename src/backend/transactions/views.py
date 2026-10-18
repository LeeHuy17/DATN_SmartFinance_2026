from decimal import Decimal

from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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
        return Transaction.objects.filter(user=self.request.user).select_related(
            "wallet", "category"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
