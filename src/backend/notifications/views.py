from django.utils import timezone
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer, NotificationSettingSerializer
from .services import get_settings


class NotificationPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Hộp thư: chỉ đọc và đánh dấu đã đọc. Thông báo do server tạo theo nghiệp vụ (services.py)."""

    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        params = self.request.query_params
        if params.get("unread") == "1":
            qs = qs.filter(read_at__isnull=True)
        if params.get("type") in Notification.Type.values:
            qs = qs.filter(type=params["type"])
        return qs

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        updated = Notification.objects.filter(user=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({"updated": updated})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, read_at__isnull=True).count()
        return Response({"count": count})


class NotificationSettingView(generics.RetrieveUpdateAPIView):
    """Cài đặt thông báo của người đang đăng nhập (tạo mặc định ở lần đầu)."""

    serializer_class = NotificationSettingSerializer

    def get_object(self):
        return get_settings(self.request.user)
