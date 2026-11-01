from decimal import Decimal

from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(
        max_digits=18, decimal_places=2, min_value=Decimal("0.01")
    )
    wallet_name = serializers.CharField(source="wallet.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            "id", "wallet", "wallet_name",
            "category", "category_name", "category_icon", "category_color",
            "kind", "amount", "note", "source", "date", "receipt", "receipt_image_url",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "kind", "created_at", "updated_at")

    def get_receipt_image_url(self, obj):
        if not obj.receipt_id:
            return None
        request = self.context.get("request")
        url = obj.receipt.image.url
        return request.build_absolute_uri(url) if request else url

    def validate_receipt(self, receipt):
        if receipt is None:
            return receipt
        if receipt.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("Hóa đơn không tồn tại.")
        used = getattr(receipt, "transaction", None)
        if used and (self.instance is None or used.pk != self.instance.pk):
            raise serializers.ValidationError("Hóa đơn đã được gắn với một giao dịch.")
        return receipt

    def validate_wallet(self, wallet):
        user = self.context["request"].user
        if wallet.user_id != user.id:
            raise serializers.ValidationError("Ví không tồn tại.")
        changed = self.instance is None or self.instance.wallet_id != wallet.pk
        if wallet.is_archived and changed:
            raise serializers.ValidationError("Ví đã được lưu trữ.")
        return wallet

    def validate_category(self, category):
        user = self.context["request"].user
        if category.user_id != user.id:
            raise serializers.ValidationError("Danh mục không tồn tại.")
        changed = self.instance is None or self.instance.category_id != category.pk
        if category.is_hidden and changed:
            raise serializers.ValidationError("Danh mục đang bị ẩn.")
        return category
