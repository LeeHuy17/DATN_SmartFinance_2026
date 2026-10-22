from calendar import monthrange
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from budgets.models import Budget
from budgets.services import ZERO, describe, spent_by_category, with_amount
from reports import services as rs

MIN_TRANSACTIONS = 5


def _num(x):
    return float(Decimal(x).quantize(Decimal("0.01")))


def _by_cat(qs, start, end):
    return {
        i["category_name"]: i
        for i in rs.by_category(qs, start, end, "expense")["items"]
    }


def _budget_facts(user, start):
    """Ngân sách đang bật của tháng `start` kèm số đã chi và trạng thái.

    Dùng đúng hàm đang phục vụ /api/budgets/?month= (with_amount, spent_by_category, describe)
    nên số liệu khớp với những gì người dùng thấy trên màn Ngân sách.
    """
    budgets = with_amount(
        Budget.objects.filter(user=user, is_active=True), start
    ).select_related("category")
    spent_map, total = spent_by_category(user, start, rs.next_month(start))
    facts = []
    for b in budgets:
        spent = total if b.category_id is None else spent_map.get(b.category_id, ZERO)
        info = describe(b, spent)
        facts.append({
            "category_name": b.category.name if b.category else "Tổng chi tiêu",
            "amount": _num(b.amount),
            "spent": _num(info["spent"]),
            "percent": float(info["percent"]),
            "status": info["status"],
        })
    return facts


def build_facts(user, start):
    """Trả (facts, tx_count). Tất cả đều là số liệu đã tính, không có dữ liệu cá nhân."""
    qs = rs.user_transactions(user)
    end, prev = rs.next_month(start), rs.prev_month(start)
    cur_qs = qs.filter(date__gte=start, date__lt=end)
    tx_count = cur_qs.count()

    ov = rs.overview(qs, start)
    income, expense = ov["income"], ov["expense"]
    days_in_month = monthrange(start.year, start.month)[1]

    today = timezone.localdate()
    is_current = start == today.replace(day=1)
    days_elapsed = today.day if is_current else days_in_month

    cur_cats, prev_cats = _by_cat(qs, start, end), _by_cat(qs, prev, start)
    categories = []
    for name, c in list(cur_cats.items())[:6]:
        before = prev_cats.get(name)
        categories.append({
            "name": name,
            "total": _num(c["total"]),
            "percent_of_expense": c["percent"],
            "change_vs_previous_percent": (
                rs.change_percent(c["total"], before["total"]) if before else None
            ),
        })

    facts = {
        "month": start.strftime("%Y-%m"),
        "currency": user.currency,
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "income": _num(income),
        "expense": _num(expense),
        "net": _num(ov["net"]),
        "savings_rate_percent": (
            float(((ov["net"] / income) * 100).quantize(Decimal("0.1"))) if income else None
        ),
        "previous_month": {
            "expense": _num(ov["previous"]["expense"]),
            "income": _num(ov["previous"]["income"]),
        },
        "expense_change_vs_previous_percent": ov["expense_change_percent"],
        "income_change_vs_previous_percent": ov["income_change_percent"],
        "top_expense_categories": categories,
        "budgets": _budget_facts(user, start),
    }

    if is_current and days_elapsed:
        facts["projected_month_expense"] = _num(expense / days_elapsed * days_in_month)
        last7 = rs.totals(qs, today - timedelta(days=6), today + timedelta(days=1))
        prev7 = rs.totals(qs, today - timedelta(days=13), today - timedelta(days=6))
        facts["last_7_days_expense"] = _num(last7["expense"])
        facts["previous_7_days_expense"] = _num(prev7["expense"])
    return facts, tx_count
