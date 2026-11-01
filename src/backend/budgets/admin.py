from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import Budget, BudgetAmount


class BudgetAmountInline(TabularInline):
    """Lịch sử hạn mức: mỗi dòng áp dụng từ tháng đó trở đi"""

    model = BudgetAmount
    extra = 0
    fields = ("month", "amount", "updated_at")
    readonly_fields = ("updated_at",)
    ordering = ("-month",)


@admin.register(Budget)
class BudgetAdmin(ModelAdmin):
    list_display = ("user", "category", "alert_threshold", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("user__email",)
    raw_id_fields = ("user", "category")
    inlines = (BudgetAmountInline,)
