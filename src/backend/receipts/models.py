import uuid

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


def receipt_path(instance, filename):
    return f"receipts/{instance.user_id}/{uuid.uuid4().hex}.jpg"


class Receipt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="receipts"
    )
    image = models.ImageField(upload_to=receipt_path)
    raw_text = models.TextField(blank=True)
    merchant = models.CharField(max_length=255, blank=True)
    total = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    total_confidence = models.FloatField(default=0)
    receipt_date = models.DateField(null=True, blank=True)
    suggested_category = models.ForeignKey(
        "categories.Category", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
    )
    # Trung bình độ tin cậy OCR của các dòng
    confidence = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)


@receiver(post_delete, sender=Receipt)
def remove_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)
