from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Category


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ("name", "kind", "user", "icon", "color")
    list_filter = ("kind",)
    search_fields = ("name", "user__email")
