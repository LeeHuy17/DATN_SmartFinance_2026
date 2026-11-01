from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import AdvisorReport


@admin.register(AdvisorReport)
class AdvisorReportAdmin(ModelAdmin):
    list_display = ("user", "month", "source", "model_name", "updated_at")
    list_filter = ("source", "month")
    raw_id_fields = ("user",)