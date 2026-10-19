from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Budget
from .serializers import BudgetSerializer
from .services import current_month, month_range, set_amount, spent_by_category, with_amount


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    pagination_class = None

    def _month(self):
        """Tháng đang xem (?month=YYYY-MM, mặc định tháng này): (ngày đầu tháng, ngày đầu tháng sau)."""
        return month_range(self.request.query_params.get("month"))

    def get_queryset(self):
        start, _ = self._month()
        qs = Budget.objects.filter(user=self.request.user).select_related("category")
        active = self.request.query_params.get("is_active")
        if active in ("0", "1"):
            qs = qs.filter(is_active=active == "1")
        # Chỉ ngân sách có hạn mức ở tháng đang xem, kèm hạn mức của đúng tháng đó
        return with_amount(qs, start)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        start, end = self._month()
        spent_map, total = spent_by_category(self.request.user, start, end)
        ctx.update(spent_map=spent_map, total_spent=total, month=start.strftime("%Y-%m"))
        return ctx

    def _only_current_month(self):
        """Hạn mức các tháng đã qua là lịch sử, không cho sửa / ngừng."""
        start, _ = self._month()
        if start != current_month():
            raise ValidationError({"month": "Chỉ sửa được ngân sách của tháng hiện tại."})

    def perform_create(self, serializer):
        self._only_current_month()
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        self._only_current_month()
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """
        Ngừng theo dõi từ tháng này: các tháng trước vẫn giữ hạn mức và số đã chi.
        Ngân sách chưa có lịch sử (mới đặt trong tháng này) thì xóa hẳn.
        """
        self._only_current_month()
        budget = self.get_object()
        if budget.amounts.filter(month__lt=current_month()).exists():
            set_amount(budget, None)
        else:
            budget.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        """Các ngân sách đang đạt ngưỡng hoặc vượt mức, nặng nhất lên đầu."""
        qs = self.get_queryset().filter(is_active=True)
        data = [d for d in self.get_serializer(qs, many=True).data if d["status"] != "ok"]
        data.sort(key=lambda d: d["percent"], reverse=True)
        return Response(data)
