from rest_framework import viewsets

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        qs = Category.objects.filter(user=self.request.user)
        kind = self.request.query_params.get("kind")
        if kind in Category.Kind.values:
            qs = qs.filter(kind=kind)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
