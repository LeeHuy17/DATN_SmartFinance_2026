import django_filters as filters
from django.db.models import Q
from rest_framework.filters import OrderingFilter

from .models import Transaction


class NumberInFilter(filters.BaseInFilter, filters.NumberFilter):
    """?wallet=3 hoặc ?wallet=3,5 (bảng Bộ lọc trên app cho chọn nhiều ví / danh mục)"""


class TransactionFilter(filters.FilterSet):
    kind = filters.ChoiceFilter(choices=Transaction.Kind.choices)
    wallet = NumberInFilter(method="filter_wallet")
    category = NumberInFilter(field_name="category_id")
    date_from = filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = filters.DateFilter(field_name="date", lookup_expr="lte")
    min_amount = filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = filters.NumberFilter(field_name="amount", lookup_expr="lte")
    search = filters.CharFilter(method="filter_search")

    class Meta:
        model = Transaction
        fields = []

    def filter_search(self, queryset, _name, value):
        # Tìm trong ghi chú và tên danh mục ("ăn" ra cả giao dịch danh mục Ăn uống không ghi chú)
        return queryset.filter(Q(note__icontains=value) | Q(category__name__icontains=value))

    def filter_wallet(self, queryset, _name, value):
        return queryset.filter(Q(wallet_id__in=value) | Q(to_wallet_id__in=value)).distinct()


class StableOrderingFilter(OrderingFilter):
    """Luôn thêm -id để các trang không bị trùng hoặc sót dòng khi trùng giá trị sắp xếp."""

    def get_ordering(self, request, queryset, view):
        ordering = list(super().get_ordering(request, queryset, view) or [])
        if "id" not in [o.lstrip("-") for o in ordering]:
            ordering.append("-id")
        return ordering
