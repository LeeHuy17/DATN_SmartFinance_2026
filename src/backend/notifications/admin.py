from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Notification, NotificationSetting


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ("created_at", "user", "type", "title", "read_at")
    list_filter = ("type", "tone")
    search_fields = ("title", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "created_at"


@admin.register(NotificationSetting)
class NotificationSettingAdmin(ModelAdmin):
    list_display = ("user", "budget", "reminder", "banner", "push", "email", "last_digest_month")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
