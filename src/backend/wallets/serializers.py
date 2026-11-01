from rest_framework import serializers

from .models import Wallet


class WalletSerializer(serializers.ModelSerializer):
    color = serializers.RegexField(r"^#[0-9A-Fa-f]{6}$", required=False)
    balance = serializers.DecimalField(
        max_digits=18, decimal_places=2, source="current_balance", read_only=True
    )
    currency = serializers.CharField(source="user.currency", read_only=True)

    class Meta:
        model = Wallet
        fields = (
            "id", "name", "kind", "initial_balance", "balance", "currency",
            "include_in_total", "is_archived", "icon", "color", "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_name(self, value):
        qs = Wallet.objects.filter(user=self.context["request"].user, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Bạn đã có ví với tên này.")
        return value
