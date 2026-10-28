from django.contrib import admin

from .models import Receipt


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "merchant", "total", "receipt_date", "confidence")
    raw_id_fields = ("user", "suggested_category")
