from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("categories.urls")),
    path("api/", include("wallets.urls")),
    path("api/", include("transactions.urls")),
    path("api/", include("budgets.urls")),
    path("api/", include("reports.urls")),
]
