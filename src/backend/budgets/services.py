from datetime import date
from decimal import Decimal

from django.db.models import OuterRef, Q, Subquery, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from transactions.models import Transaction

from .models import Budget, BudgetAmount

ZERO = Decimal("0.00")  # str() ra "0.00", cùng dạng với các số tiền khác


def current_month():
    """Ngày 1 của tháng hiện tại theo giờ địa phương."""
    return timezone.localdate().replace(day=1)


def month_range(value=None):
    """'2026-10' -> (2026-10-01, 2026-11-01). Không truyền thì lấy tháng hiện tại."""
    if value:
        try:
            year, month = map(int, value.split("-"))
            start = date(year, month, 1)
        except (ValueError, TypeError):
            raise ValidationError({"month": "Định dạng phải là YYYY-MM."})
    else:
        start = current_month()
    end = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
    return start, end


def with_amount(queryset, month_start):
    """
    Gắn `amount` = hạn mức áp dụng cho tháng `month_start`: dòng BudgetAmount gần nhất
    không sau tháng đó. Bỏ ngân sách chưa tồn tại ở tháng đó hoặc đã ngừng (amount null).
    Một subquery trong cùng câu SQL nên danh sách không bị N+1.
    """
    latest = BudgetAmount.objects.filter(budget=OuterRef("pk"), month__lte=month_start).order_by("-month")
    return queryset.annotate(amount=Subquery(latest.values("amount")[:1])).filter(amount__isnull=False)


def set_amount(budget, amount):
    """
    Ghi hạn mức (None = ngừng theo dõi) cho tháng hiện tại. Sửa nhiều lần trong tháng chỉ cập nhật
    một dòng; các tháng trước có dòng riêng hoặc kế thừa dòng cũ hơn nên không bị đổi theo.
    """
    BudgetAmount.objects.update_or_create(
        budget=budget, month=current_month(), defaults={"amount": amount}
    )


def spent_by_category(user, start, end):
    """Một truy vấn: ({category_id: tổng chi}, tổng chi cả tháng)."""
    rows = (
        Transaction.objects.filter(user=user, kind="expense", date__gte=start, date__lt=end)
        .order_by()
        .values("category_id")
        .annotate(total=Sum("amount"))
    )
    by_cat = {r["category_id"]: r["total"] for r in rows}
    return by_cat, sum(by_cat.values(), ZERO)


def describe(budget, spent):
    """budget.amount là hạn mức của tháng đang tính (gắn bằng with_amount)."""
    amount = budget.amount
    if spent > amount:
        status = "exceeded"
    elif spent * 100 >= amount * budget.alert_threshold:
        status = "warning"
    else:
        status = "ok"
    return {
        "spent": spent,
        "remaining": amount - spent,
        "percent": (spent / amount * 100).quantize(Decimal("0.1")),
        "status": status,
    }


def alerts_for(user, tx_date, category_id):
    """Cảnh báo của các ngân sách bị ảnh hưởng bởi một giao dịch chi (theo hạn mức của tháng giao dịch)."""
    start, end = month_range(tx_date.strftime("%Y-%m"))
    budgets = list(
        with_amount(Budget.objects.filter(user=user, is_active=True), start)
        .filter(Q(category_id=category_id) | Q(category__isnull=True))
        .select_related("category")
    )
    if not budgets:
        return []
    by_cat, total = spent_by_category(user, start, end)
    alerts = []
    for b in budgets:
        spent = total if b.category_id is None else by_cat.get(b.category_id, ZERO)
        info = describe(b, spent)
        if info["status"] != "ok":
            alerts.append({
                "budget": b.pk,
                "category": b.category_id,
                "category_name": b.category.name if b.category else "Tổng chi tiêu",
                "amount": str(b.amount),
                "spent": str(info["spent"]),
                "percent": float(info["percent"]),
                "status": info["status"],
            })
    return alerts
