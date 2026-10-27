"""Số liệu cho trang Tổng quan của admin (UNFOLD["DASHBOARD_CALLBACK"])"""

import json
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.urls import reverse
from django.utils import timezone

from transactions.models import Transaction

CHART_DAYS = 30


def format_vnd(value):
    return f"{int(value or 0):,}".replace(",", ".") + " ₫"


def percent_change(current, previous):
    if not previous:
        return None
    return round((current - previous) * 100 / previous)


def dashboard_callback(request, context):
    User = get_user_model()
    today = timezone.localdate()
    month_start = today.replace(day=1)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # Mỗi người dùng chọn đơn vị tiền riêng, chỉ cộng tiền của tài khoản VND để tổng có nghĩa
    vnd_tx = Transaction.objects.filter(user__currency="VND")

    month_tx = Transaction.objects.filter(date__gte=month_start, date__lte=today)
    tx_count = month_tx.count()
    # So với cùng số ngày của tháng trước để không thiệt cho tháng đang chạy
    prev_tx_count = Transaction.objects.filter(
        date__gte=prev_month_start, date__lte=prev_month_start + (today - month_start)
    ).count()

    month_totals = vnd_tx.filter(date__gte=month_start, date__lte=today).aggregate(
        income=Sum("amount", filter=Q(kind=Transaction.Kind.INCOME)),
        expense=Sum("amount", filter=Q(kind=Transaction.Kind.EXPENSE)),
    )

    new_users = User.objects.filter(date_joined__date__gte=month_start).count()

    kpis = [
        {
            "title": "Người dùng",
            "icon": "person",
            "value": User.objects.count(),
            "footer": f"+{new_users} trong tháng này",
            "href": reverse("admin:accounts_user_changelist"),
        },
        {
            "title": "Giao dịch tháng này",
            "icon": "receipt_long",
            "value": tx_count,
            "change": percent_change(tx_count, prev_tx_count),
            "footer": "so với cùng kỳ tháng trước",
            "href": reverse("admin:transactions_transaction_changelist")
            + f"?date_from={month_start.isoformat()}",
        },
        {
            "title": "Tổng thu tháng này",
            "icon": "trending_up",
            "value": format_vnd(month_totals["income"]),
            "footer": "tài khoản dùng VND",
        },
        {
            "title": "Tổng chi tháng này",
            "icon": "trending_down",
            "value": format_vnd(month_totals["expense"]),
            "footer": "tài khoản dùng VND",
        },
    ]

    # Thu/chi theo ngày trong 30 ngày gần nhất
    chart_start = today - timedelta(days=CHART_DAYS - 1)
    daily = {
        row["date"]: row
        for row in vnd_tx.filter(date__gte=chart_start, date__lte=today)
        .values("date")
        .annotate(
            income=Sum("amount", filter=Q(kind=Transaction.Kind.INCOME)),
            expense=Sum("amount", filter=Q(kind=Transaction.Kind.EXPENSE)),
        )
    }
    days = [chart_start + timedelta(days=i) for i in range(CHART_DAYS)]
    # Unfold mặc định vẽ các cột chồng lên nhau (grouped: false), bật lại theo từng dataset
    bar_style = {"grouped": True, "maxBarThickness": 8, "barPercentage": 0.8}
    chart = {
        "labels": [d.strftime("%d/%m") for d in days],
        "datasets": [
            {
                "label": "Thu",
                "data": [float(daily.get(d, {}).get("income") or 0) for d in days],
                "backgroundColor": "var(--sf-income)",
                **bar_style,
            },
            {
                "label": "Chi",
                "data": [float(daily.get(d, {}).get("expense") or 0) for d in days],
                "backgroundColor": "var(--sf-expense)",
                **bar_style,
            },
        ],
    }

    # Danh mục do từng người dùng tự tạo nên gộp theo tên
    top_categories = (
        vnd_tx.filter(kind=Transaction.Kind.EXPENSE, date__gte=month_start, date__lte=today)
        .values("category__name")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")[:5]
    )
    month_expense = month_totals["expense"] or Decimal("0")

    recent_users = User.objects.order_by("-date_joined")[:5]

    context.update(
        {
            "kpis": kpis,
            "chart_data": json.dumps(chart),
            "chart_description": f"Tổng của các tài khoản dùng VND, {CHART_DAYS} ngày gần nhất",
            "top_categories": {
                "headers": ["Danh mục", "Số giao dịch", "Tổng chi", "Tỷ trọng"],
                "rows": [
                    [
                        row["category__name"],
                        row["count"],
                        format_vnd(row["total"]),
                        f"{round(row['total'] * 100 / month_expense)}%" if month_expense else "–",
                    ]
                    for row in top_categories
                ],
            },
            "recent_users": {
                "headers": ["Email", "Họ tên", "Ngày tham gia"],
                "rows": [
                    [
                        u.email,
                        u.full_name or "–",
                        timezone.localtime(u.date_joined).strftime("%d/%m/%Y %H:%M"),
                    ]
                    for u in recent_users
                ],
            },
        }
    )
    return context
