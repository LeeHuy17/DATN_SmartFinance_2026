from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter, RangeNumericFilter

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(ModelAdmin):
    list_display = ("date", "user", "wallet", "category", "kind", "amount", "source")
    list_filter = (
        "kind",
        "source",
        ("date", RangeDateFilter),
        ("amount", RangeNumericFilter),
    )
    list_filter_submit = True  # bộ lọc khoảng cần nút "Áp dụng"
    search_fields = ("note", "user__email")
    date_hierarchy = "date"
    raw_id_fields = ("user", "wallet", "category")
