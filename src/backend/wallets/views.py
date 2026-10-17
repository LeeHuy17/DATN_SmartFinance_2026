from decimal import Decimal

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Wallet
from .serializers import WalletSerializer


class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Wallet.objects.filter(user=self.request.user).select_related("user")
        show_archived = self.request.query_params.get("include_archived") == "1"
        if self.action == "list" and not show_archived:
            qs = qs.filter(is_archived=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        wallets = list(self.get_queryset().filter(is_archived=False, include_in_total=True))
        total = sum((w.current_balance for w in wallets), Decimal("0"))
        return Response({
            # Trả chuỗi 2 chữ số thập phân giống trường balance của từng ví, tránh sai số float
            "total_balance": str(total.quantize(Decimal("0.01"))),
            "currency": request.user.currency,
            "wallet_count": len(wallets),
        })
