from django.urls import path

from .views import (
    CategoryReportView, DailyReportView, MonthlyReportView, OverviewReportView,
)

urlpatterns = [
    path("reports/overview/", OverviewReportView.as_view(), name="report_overview"),
    path("reports/monthly/", MonthlyReportView.as_view(), name="report_monthly"),
    path("reports/by-category/", CategoryReportView.as_view(), name="report_by_category"),
    path("reports/daily/", DailyReportView.as_view(), name="report_daily"),
]