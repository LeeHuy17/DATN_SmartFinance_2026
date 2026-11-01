from decimal import Decimal

from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services as s

CENTS = Decimal("0.01")


def money_to_str(value):
    """
    Decimal -> "65000.50" (đệ quy trong dict / list). Response không qua serializer nên nếu để nguyên,
    DRF đổi Decimal thành số thực; trả chuỗi cho cùng dạng với amount / balance ở các API khác.
    """
    if isinstance(value, Decimal):
        return str(value.quantize(CENTS))
    if isinstance(value, dict):
        return {k: money_to_str(v) for k, v in value.items()}
    if isinstance(value, list):
        return [money_to_str(v) for v in value]
    return value


class ReportView(APIView):
    """Lớp cha: dựng queryset giao dịch của người dùng, có lọc ví."""

    def qs(self, request):
        return s.user_transactions(request.user, s.parse_wallet(request.query_params))

    def with_currency(self, request, data):
        return Response({**money_to_str(data), "currency": request.user.currency})


class MonthlyReportView(ReportView):
    def get(self, request):
        year = s.parse_year(request.query_params)
        return self.with_currency(request, s.monthly(self.qs(request), year))


class CategoryReportView(ReportView):
    def get(self, request):
        kind = request.query_params.get("kind", "expense")
        if kind not in ("income", "expense"):
            raise ValidationError({"kind": "Chỉ nhận income hoặc expense."})
        start, end = s.resolve_range(request.query_params)
        data = s.by_category(self.qs(request), start, end, kind)
        data["from"], data["to"] = start.isoformat(), (end - s.timedelta(days=1)).isoformat()
        return self.with_currency(request, data)


class DailyReportView(ReportView):
    def get(self, request):
        start = s.parse_month(request.query_params.get("month"))
        return self.with_currency(request, s.daily(self.qs(request), start))


class OverviewReportView(ReportView):
    def get(self, request):
        start = s.parse_month(request.query_params.get("month"))
        return self.with_currency(request, s.overview(self.qs(request), start))