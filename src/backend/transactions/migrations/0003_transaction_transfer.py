from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0002_transaction_receipt"),
    ]

    operations = [
        migrations.AlterField(
            model_name="transaction",
            name="kind",
            field=models.CharField(
                choices=[("income", "Thu"), ("expense", "Chi"), ("transfer", "Chuyển khoản")],
                editable=False,
                max_length=8,
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="transactions",
                to="categories.category",
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="fee",
            field=models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=18),
        ),
        migrations.AddField(
            model_name="transaction",
            name="to_wallet",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="received_transfers",
                to="wallets.wallet",
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="transfer_parent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="fee_items",
                to="transactions.transaction",
            ),
        ),
    ]
