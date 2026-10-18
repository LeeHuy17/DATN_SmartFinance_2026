from django.db.models import Count, RestrictedError
from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        qs = Category.objects.filter(user=self.request.user).annotate(
            transaction_count=Count("transactions")
        )
        kind = self.request.query_params.get("kind")
        if kind in Category.Kind.values:
            qs = qs.filter(kind=kind)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except RestrictedError:
            return Response(
                {"detail": "Danh mục đang có giao dịch, hãy ẩn thay vì xóa."},
                status=status.HTTP_409_CONFLICT,
            )
