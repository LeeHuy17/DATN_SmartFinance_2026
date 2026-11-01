from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Wallet


@admin.register(Wallet)
class WalletAdmin(ModelAdmin):
    list_display = ("name", "kind", "user", "initial_balance", "include_in_total", "is_archived")
    list_filter = ("kind", "include_in_total", "is_archived")
    search_fields = ("name", "user__email")
