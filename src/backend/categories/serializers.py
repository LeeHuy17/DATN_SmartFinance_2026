from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    color = serializers.RegexField(r"^#[0-9A-Fa-f]{6}$", required=False)
    # Số giao dịch đang dùng danh mục: app dựa vào đây để cho xóa hay chỉ cho ẩn
    transaction_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = (
            "id", "name", "kind", "icon", "color", "is_hidden", "transaction_count", "created_at",
        )
        read_only_fields = ("id", "created_at")

    def get_transaction_count(self, obj):
        # Danh sách đã annotate sẵn (CategoryViewSet); bản vừa tạo / sửa thì đếm riêng
        count = getattr(obj, "transaction_count", None)
        return obj.transactions.count() if count is None else count

    def validate(self, attrs):
        # Trùng tên chỉ tính trong cùng loại: "Khác" có thể vừa là chi tiêu vừa là thu nhập
        name = attrs.get("name", getattr(self.instance, "name", None))
        kind = attrs.get("kind", getattr(self.instance, "kind", Category.Kind.EXPENSE))
        qs = Category.objects.filter(
            user=self.context["request"].user, kind=kind, name__iexact=name
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"name": "Bạn đã có danh mục với tên này."})
        # Giao dịch lưu kind theo danh mục lúc tạo; đổi loại sẽ làm lệch số dư ví
        if self.instance and kind != self.instance.kind and self.instance.transactions.exists():
            raise serializers.ValidationError(
                {"kind": "Danh mục đã có giao dịch nên không thể đổi giữa Chi và Thu."}
            )
        # Ngân sách chỉ đặt cho danh mục chi; đổi sang Thu thì ngân sách luôn báo đã chi 0đ
        if self.instance and kind != self.instance.kind and self.instance.budgets.exists():
            raise serializers.ValidationError(
                {"kind": "Danh mục đang có ngân sách nên không thể đổi sang Thu. Hãy xóa ngân sách trước."}
            )
        return attrs
