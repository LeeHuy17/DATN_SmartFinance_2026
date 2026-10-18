from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("date", "user", "wallet", "category", "kind", "amount")
    list_filter = ("kind", "date")
    search_fields = ("note", "user__email")
    date_hierarchy = "date"
    raw_id_fields = ("user", "wallet", "category")
