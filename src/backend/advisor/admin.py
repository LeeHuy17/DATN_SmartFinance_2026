from django.contrib import admin

from .models import AdvisorReport


@admin.register(AdvisorReport)
class AdvisorReportAdmin(admin.ModelAdmin):
    list_display = ("user", "month", "source", "model_name", "updated_at")
    list_filter = ("source", "month")
    raw_id_fields = ("user",)