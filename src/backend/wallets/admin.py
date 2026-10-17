from django.contrib import admin

from .models import Wallet


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "user", "initial_balance", "include_in_total", "is_archived")
    list_filter = ("kind", "include_in_total", "is_archived")
    search_fields = ("name", "user__email")
