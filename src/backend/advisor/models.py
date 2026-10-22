from django.conf import settings
from django.db import models


class AdvisorReport(models.Model):
    class Source(models.TextChoices):
        LLM = "llm", "AI"
        RULES = "rules", "Luật dự phòng"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="advisor_reports"
    )
    month = models.DateField()                       # ngày 1 của tháng
    input_hash = models.CharField(max_length=64)     # băm của số liệu đã gửi
    insights = models.JSONField()
    source = models.CharField(max_length=5, choices=Source.choices)
    model_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("user", "month"), name="uniq_advisor_user_month")
        ]
