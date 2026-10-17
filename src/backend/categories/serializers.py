from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    color = serializers.RegexField(r"^#[0-9A-Fa-f]{6}$", required=False)

    class Meta:
        model = Category
        fields = ("id", "name", "kind", "icon", "color", "is_hidden", "created_at")
        read_only_fields = ("id", "created_at")

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
        return attrs
