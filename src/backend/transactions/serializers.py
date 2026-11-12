from decimal import Decimal

from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(
        max_digits=18, decimal_places=2, min_value=Decimal("0.01")
    )
    fee = serializers.DecimalField(
        max_digits=18, decimal_places=2, min_value=Decimal("0"), required=False
    )
    wallet_name = serializers.CharField(source="wallet.name", read_only=True)
    to_wallet_name = serializers.CharField(source="to_wallet.name", read_only=True, allow_null=True)
    category_name = serializers.CharField(source="category.name", read_only=True, allow_null=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True, allow_null=True)
    category_color = serializers.CharField(source="category.color", read_only=True, allow_null=True)
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            "id", "wallet", "wallet_name", "to_wallet", "to_wallet_name", "fee",
            "category", "category_name", "category_icon", "category_color",
            "kind", "amount", "note", "source", "date", "receipt", "receipt_image_url",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "kind", "created_at", "updated_at")

    def validate(self, attrs):
        instance = self.instance
        to_wallet = attrs.get(
            "to_wallet",
            instance.to_wallet if instance and instance.kind == Transaction.Kind.TRANSFER else None,
        )
        category = attrs.get("category", instance.category if instance else None)

        if to_wallet:
            source_wallet = attrs.get("wallet", instance.wallet if instance else None)
            if source_wallet is None:
                raise serializers.ValidationError({"wallet": "Chọn ví nguồn."})
            if to_wallet.pk == source_wallet.pk:
                raise serializers.ValidationError({"to_wallet": "Ví nguồn và ví đích phải khác nhau."})
            if to_wallet.user_id != self.context["request"].user.id:
                raise serializers.ValidationError({"to_wallet": "Ví không tồn tại."})
            changed = instance is None or instance.to_wallet_id != to_wallet.pk
            if to_wallet.is_archived and changed:
                raise serializers.ValidationError({"to_wallet": "Ví đã được lưu trữ."})
            if source_wallet.is_archived and (instance is None or instance.wallet_id != source_wallet.pk):
                raise serializers.ValidationError({"wallet": "Ví đã được lưu trữ."})
            if "category" in attrs and category is not None:
                raise serializers.ValidationError({"category": "Chuyển khoản không có danh mục."})
            attrs["category"] = None
            attrs["to_wallet"] = to_wallet
        elif category is None:
            raise serializers.ValidationError({"category": "Chọn một danh mục."})

        if not to_wallet and attrs.get("fee", Decimal("0")):
            raise serializers.ValidationError({"fee": "Phí chỉ áp dụng cho giao dịch chuyển khoản."})
        return attrs

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
        if category is None:
            return None
        user = self.context["request"].user
        if category.user_id != user.id:
            raise serializers.ValidationError("Danh mục không tồn tại.")
        changed = self.instance is None or self.instance.category_id != category.pk
        if category.is_hidden and changed:
            raise serializers.ValidationError("Danh mục đang bị ẩn.")
        return category
