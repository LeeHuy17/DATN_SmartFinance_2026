from django.conf import settings
from django.db import models


class Category(models.Model):
    class Kind(models.TextChoices):
        EXPENSE = "expense", "Chi tiêu"
        INCOME = "income", "Thu nhập"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories"
    )
    name = models.CharField(max_length=60)
    kind = models.CharField(max_length=7, choices=Kind.choices, default=Kind.EXPENSE)
    icon = models.CharField(max_length=50, default="pricetag-outline")  # tên Ionicons
    color = models.CharField(max_length=7, default="#5E6A65")
    # Ẩn khỏi danh sách chọn khi thêm giao dịch, giao dịch cũ vẫn giữ danh mục
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Danh mục mặc định tạo bằng bulk_create cùng thời điểm nên xếp thêm theo id
        ordering = ("created_at", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "kind", "name"), name="uniq_category_user_kind_name"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.get_kind_display()})"
