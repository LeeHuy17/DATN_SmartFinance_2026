from django.contrib import admin

from .models import Notification, NotificationSetting


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "type", "title", "read_at")
    list_filter = ("type", "tone")
    search_fields = ("title", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "created_at"


@admin.register(NotificationSetting)
class NotificationSettingAdmin(admin.ModelAdmin):
    list_display = ("user", "budget", "reminder", "banner", "push", "email", "last_digest_month")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
