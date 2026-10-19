from decimal import Decimal

from rest_framework import serializers

from .models import Budget
from .services import ZERO, current_month, describe, set_amount, with_amount


class BudgetSerializer(serializers.ModelSerializer):
    # Hạn mức của tháng đang xem (gắn bằng with_amount). Khi ghi, luôn áp dụng từ tháng hiện tại.
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0.01"))

    class Meta:
        model = Budget
        fields = ("id", "category", "amount", "alert_threshold", "is_active", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_category(self, category):
        inst = self.instance
        # Đổi danh mục sẽ làm lịch sử các tháng trước mang tên danh mục mới
        if inst and category != inst.category:
            raise serializers.ValidationError(
                "Không đổi được danh mục của ngân sách. Hãy tạo ngân sách mới cho danh mục khác."
            )
        return category

    def validate(self, attrs):
        user = self.context["request"].user
        inst = self.instance
        if inst:
            return attrs

        category = attrs.get("category")
        if category is not None:
            if category.user_id != user.id:
                raise serializers.ValidationError({"category": "Danh mục không tồn tại."})
            if category.kind != "expense":
                raise serializers.ValidationError({"category": "Chỉ đặt ngân sách cho danh mục chi."})

        # Ngân sách đã ngừng theo dõi thì được đặt lại (dùng tiếp bản ghi cũ, xem create);
        # còn đang theo dõi ở tháng này thì là trùng
        existing = Budget.objects.filter(user=user, category=category)
        if with_amount(existing, current_month()).exists():
            msg = "Danh mục này đã có ngân sách." if category else "Bạn đã có ngân sách tổng."
            raise serializers.ValidationError({"category": msg})
        return attrs

    def create(self, validated_data):
        amount = validated_data.pop("amount")
        user, category = validated_data["user"], validated_data.get("category")
        budget = Budget.objects.filter(user=user, category=category).first()
        if budget:
            # Theo dõi lại ngân sách đã ngừng: giữ nguyên lịch sử các tháng trước
            for field, value in validated_data.items():
                setattr(budget, field, value)
            budget.save()
        else:
            budget = super().create(validated_data)
        set_amount(budget, amount)
        budget.amount = amount
        return budget

    def update(self, instance, validated_data):
        amount = validated_data.pop("amount", None)
        instance = super().update(instance, validated_data)
        if amount is not None:
            set_amount(instance, amount)
            instance.amount = amount
        return instance

    def to_representation(self, obj):
        data = super().to_representation(obj)
        ctx = self.context
        spent = (
            ctx["total_spent"] if obj.category_id is None
            else ctx["spent_map"].get(obj.category_id, ZERO)
        )
        info = describe(obj, spent)
        cat = obj.category
        data.update(
            # Ngân sách tổng: icon Ionicons và màu chính của app, giống mặc định của ví
            category_name=cat.name if cat else "Tổng chi tiêu",
            category_icon=cat.icon if cat else "wallet-outline",
            category_color=cat.color if cat else "#0F6B4F",
            month=ctx["month"],
            # Chỉ sửa được hạn mức của tháng hiện tại; tháng đã qua chỉ xem
            editable=ctx["month"] == current_month().strftime("%Y-%m"),
            spent=str(info["spent"]),
            remaining=str(info["remaining"]),
            percent=float(info["percent"]),
            status=info["status"],
        )
        return data
