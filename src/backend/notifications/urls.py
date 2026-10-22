from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import NotificationSettingView, NotificationViewSet


class NumericIdRouter(DefaultRouter):
    # Chỉ nhận id số để "notifications/settings/" không bị hiểu là chi tiết của thông báo "settings"
    def get_lookup_regex(self, viewset, lookup_prefix=""):
        return r"(?P<pk>\d+)"


router = NumericIdRouter()
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("notifications/settings/", NotificationSettingView.as_view(), name="notification_settings"),
    *router.urls,
]
