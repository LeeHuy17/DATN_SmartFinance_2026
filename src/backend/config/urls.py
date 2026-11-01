from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.index_title = "Tổng quan"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("categories.urls")),
    path("api/", include("wallets.urls")),
    path("api/", include("transactions.urls")),
    path("api/", include("budgets.urls")),
    path("api/", include("reports.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("advisor.urls")),
    path("api/", include("receipts.urls")),
]

# Phục vụ ảnh người dùng tải lên (avatar, hóa đơn) cả khi DEBUG=0. Helper static() của Django
# chỉ chạy lúc DEBUG nên khi deploy ảnh sẽ 404; lưu lượng đồ án nhỏ nên để Django phục vụ là đủ.
urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
