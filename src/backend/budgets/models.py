from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


class Budget(models.Model):
    """Ngân sách lặp lại mỗi tháng. Hạn mức theo từng tháng nằm ở BudgetAmount."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets"
    )
    # None = ngân sách tổng cho mọi khoản chi
    category = models.ForeignKey(
        "categories.Category", on_delete=models.CASCADE,
        null=True, blank=True, related_name="budgets",
    )
    alert_threshold = models.PositiveSmallIntegerField(
        default=80, validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("category__name", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "category"), condition=Q(category__isnull=False),
                name="uniq_budget_user_category",
            ),
            models.UniqueConstraint(
                fields=("user",), condition=Q(category__isnull=True),
                name="uniq_budget_user_overall",
            ),
        ]

    def __str__(self):
        return f"{self.category or 'Tổng'}"


class BudgetAmount(models.Model):
    """
    Hạn mức áp dụng từ `month` trở đi, cho tới dòng kế tiếp của cùng ngân sách.
    Hạn mức của tháng M = dòng có month gần nhất mà không sau M (xem services.with_amount).
    Sửa hạn mức chỉ ghi vào tháng hiện tại nên các tháng đã qua giữ nguyên lịch sử.
    """

    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="amounts")
    # Luôn là ngày 1 của tháng
    month = models.DateField()
    # None = ngừng theo dõi từ tháng này (các tháng trước vẫn giữ hạn mức cũ)
    amount = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("budget", "month")
        constraints = [
            models.UniqueConstraint(fields=("budget", "month"), name="uniq_budget_amount_month"),
        ]

    def __str__(self):
        return f"{self.budget} từ {self.month:%m/%Y}: {self.amount or 'ngừng'}"
