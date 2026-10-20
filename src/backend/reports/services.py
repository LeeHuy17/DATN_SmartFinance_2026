from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from transactions.models import Transaction

ZERO = Decimal("0")
_ZERO_EXPR = Value(ZERO, output_field=DecimalField(max_digits=18, decimal_places=2))


# ---------- Đọc và kiểm tra tham số ----------
def parse_month(value):
    """'2026-10' -> date(2026, 10, 1). Rỗng thì lấy tháng hiện tại."""
    if not value:
        return timezone.localdate().replace(day=1)
    try:
        year, month = map(int, value.split("-"))
        return date(year, month, 1)
    except (ValueError, AttributeError):
        raise ValidationError({"month": "Định dạng phải là YYYY-MM."})


def parse_day(params, key):
    raw = params.get(key)
    if not raw:
        raise ValidationError({key: "Bắt buộc khi lọc theo khoảng ngày."})
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise ValidationError({key: "Định dạng phải là YYYY-MM-DD."})


def parse_year(params):
    raw = params.get("year")
    if not raw:
        return timezone.localdate().year
    if not raw.isdigit() or not 2000 <= int(raw) <= 2100:
        raise ValidationError({"year": "Năm phải nằm trong khoảng 2000 đến 2100."})
    return int(raw)


def parse_wallet(params):
    raw = params.get("wallet")
    if not raw:
        return None
    if not raw.isdigit():
        raise ValidationError({"wallet": "Ví không hợp lệ."})
    return int(raw)


def next_month(start):
    return date(start.year + (start.month == 12), start.month % 12 + 1, 1)


def prev_month(start):
    return date(start.year - (start.month == 1), (start.month - 2) % 12 + 1, 1)


def resolve_range(params):
    """Trả về (đầu kỳ, đầu kỳ kế tiếp). Ưu tiên khoảng ngày, nếu không thì theo tháng."""
    if params.get("date_from") or params.get("date_to"):
        start, end = parse_day(params, "date_from"), parse_day(params, "date_to")
        if end < start:
            raise ValidationError({"date_to": "Phải sau hoặc bằng date_from."})
        return start, end + timedelta(days=1)
    start = parse_month(params.get("month"))
    return start, next_month(start)


# ---------- Truy vấn ----------
def user_transactions(user, wallet_id=None):
    qs = Transaction.objects.filter(user=user)
    return qs.filter(wallet_id=wallet_id) if wallet_id else qs


def _sum(kind):
    return Coalesce(Sum("amount", filter=Q(kind=kind)), _ZERO_EXPR)


def totals(qs, start, end):
    agg = qs.filter(date__gte=start, date__lt=end).aggregate(
        income=_sum("income"), expense=_sum("expense")
    )
    return {**agg, "net": agg["income"] - agg["expense"]}


def monthly(qs, year):
    rows = (
        qs.filter(date__year=year)
        .annotate(m=TruncMonth("date"))
        .order_by()
        .values("m")
        .annotate(income=_sum("income"), expense=_sum("expense"))
    )
    by_month = {r["m"].month: r for r in rows}
    months = []
    for m in range(1, 13):
        r = by_month.get(m)
        income = r["income"] if r else ZERO
        expense = r["expense"] if r else ZERO
        months.append({
            "month": f"{year}-{m:02d}",
            "income": income, "expense": expense, "net": income - expense,
        })
    total_income = sum((x["income"] for x in months), ZERO)
    total_expense = sum((x["expense"] for x in months), ZERO)
    return {
        "year": year, "months": months,
        "total_income": total_income, "total_expense": total_expense,
        "net": total_income - total_expense,
    }


def by_category(qs, start, end, kind):
    rows = list(
        qs.filter(kind=kind, date__gte=start, date__lt=end)
        .order_by()
        .values("category_id", "category__name", "category__icon", "category__color")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total", "category__name")
    )
    grand = sum((r["total"] for r in rows), ZERO)
    items = [{
        "category": r["category_id"],
        "category_name": r["category__name"],
        "category_icon": r["category__icon"],
        "category_color": r["category__color"],
        "total": r["total"],
        "count": r["count"],
        "percent": float((r["total"] / grand * 100).quantize(Decimal("0.1"))),
    } for r in rows]
    return {"kind": kind, "total": grand, "items": items}


def daily(qs, start):
    end = next_month(start)
    rows = (
        qs.filter(date__gte=start, date__lt=end)
        .order_by()
        .values("date")
        .annotate(income=_sum("income"), expense=_sum("expense"))
    )
    by_day = {r["date"]: r for r in rows}
    days = []
    for d in range(1, monthrange(start.year, start.month)[1] + 1):
        day = start.replace(day=d)
        r = by_day.get(day)
        days.append({
            "date": day.isoformat(),
            "income": r["income"] if r else ZERO,
            "expense": r["expense"] if r else ZERO,
        })
    return {"month": start.strftime("%Y-%m"), "days": days}


def change_percent(current, previous):
    """Phần trăm thay đổi; None khi kỳ trước bằng 0."""
    if previous == 0:
        return None
    return float(((current - previous) / previous * 100).quantize(Decimal("0.1")))


def overview(qs, start):
    end, prev = next_month(start), prev_month(start)
    cur, old = totals(qs, start, end), totals(qs, prev, start)
    top = by_category(qs, start, end, "expense")["items"][:5]
    return {
        "month": start.strftime("%Y-%m"),
        **cur,
        "previous_month": prev.strftime("%Y-%m"),
        "previous": old,
        "income_change_percent": change_percent(cur["income"], old["income"]),
        "expense_change_percent": change_percent(cur["expense"], old["expense"]),
        "top_expense_categories": top,
    }