from django.contrib import admin

from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "user", "icon", "color")
    list_filter = ("kind",)
    search_fields = ("name", "user__email")
