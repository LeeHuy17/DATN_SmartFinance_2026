import decimal

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models
from django.utils import timezone


def copy_amounts(apps, schema_editor):
    """Hạn mức cũ thành dòng đầu tiên, áp dụng từ tháng tạo ngân sách."""
    Budget = apps.get_model("budgets", "Budget")
    BudgetAmount = apps.get_model("budgets", "BudgetAmount")
    BudgetAmount.objects.bulk_create(
        BudgetAmount(
            budget_id=b.pk,
            month=timezone.localtime(b.created_at).date().replace(day=1),
            amount=b.amount,
        )
        for b in Budget.objects.all()
    )


def restore_amounts(apps, schema_editor):
    """Quay lại: lấy hạn mức mới nhất (khác null) làm Budget.amount."""
    Budget = apps.get_model("budgets", "Budget")
    BudgetAmount = apps.get_model("budgets", "BudgetAmount")
    for b in Budget.objects.all():
        latest = (
            BudgetAmount.objects.filter(budget_id=b.pk, amount__isnull=False).order_by("-month").first()
        )
        b.amount = latest.amount if latest else decimal.Decimal("0.01")
        b.save(update_fields=["amount"])


class Migration(migrations.Migration):

    dependencies = [
        ("budgets", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="BudgetAmount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("month", models.DateField()),
                (
                    "amount",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=18, null=True,
                        validators=[django.core.validators.MinValueValidator(decimal.Decimal("0.01"))],
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "budget",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="amounts", to="budgets.budget"
                    ),
                ),
            ],
            options={
                "ordering": ("budget", "month"),
                "constraints": [
                    models.UniqueConstraint(fields=("budget", "month"), name="uniq_budget_amount_month")
                ],
            },
        ),
        # Cho cột cũ tạm nhận null: khi quay lại migration, cột được thêm lại ở dạng này,
        # restore_amounts điền giá trị rồi mới đặt lại NOT NULL
        migrations.AlterField(
            model_name="budget",
            name="amount",
            field=models.DecimalField(
                decimal_places=2, max_digits=18, null=True,
                validators=[django.core.validators.MinValueValidator(decimal.Decimal("0.01"))],
            ),
        ),
        migrations.RunPython(copy_amounts, restore_amounts),
        migrations.RemoveField(model_name="budget", name="amount"),
    ]
