from rest_framework import serializers

from .models import Receipt


class ReceiptSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    suggested_category_name = serializers.CharField(
        source="suggested_category.name", read_only=True, default=None
    )
    needs_review = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = (
            "id", "image_url", "merchant", "total", "receipt_date",
            "suggested_category", "suggested_category_name",
            "confidence", "total_confidence", "needs_review", "raw_text", "created_at",
        )
        read_only_fields = fields

    def get_image_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url

    def get_needs_review(self, obj):
        fields = []
        if obj.total is None or obj.total_confidence < 0.7:
            fields.append("total")
        if obj.receipt_date is None:
            fields.append("date")
        if not obj.merchant:
            fields.append("merchant")
        if obj.suggested_category_id is None:
            fields.append("category")
        return fields
