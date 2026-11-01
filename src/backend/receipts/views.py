from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from accounts.avatar import InvalidImage

from . import service
from .models import Receipt
from .ocr import OCRUnavailable
from .serializers import ReceiptSerializer


class ReceiptViewSet(mixins.RetrieveModelMixin, mixins.DestroyModelMixin,
                     viewsets.GenericViewSet):
    serializer_class = ReceiptSerializer
    parser_classes = (MultiPartParser, FormParser)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "receipt_scan"

    def get_throttles(self):
        # Chỉ lần quét (tốn CPU) bị giới hạn 30 lần/giờ; xem và xóa hóa đơn thì không
        return super().get_throttles() if self.action == "scan" else []

    def get_queryset(self):
        return Receipt.objects.filter(user=self.request.user).select_related("suggested_category")

    @action(detail=False, methods=["post"])
    def scan(self, request):
        upload = request.FILES.get("image")
        if not upload:
            raise ValidationError({"image": "Chưa chọn ảnh."})
        try:
            receipt = service.scan(request.user, upload)
        except InvalidImage as e:
            raise ValidationError({"image": str(e)})
        except service.NoTextFound:
            return Response(
                {"detail": "Không đọc được chữ trên ảnh. Hãy chụp lại rõ hơn."}, status=422)
        except OCRUnavailable:
            return Response(
                {"detail": "Quét hóa đơn tạm thời không khả dụng, hãy nhập tay."}, status=503)
        return Response(self.get_serializer(receipt).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        if hasattr(self.get_object(), "transaction"):
            return Response({"detail": "Hóa đơn đã gắn với một giao dịch."},
                            status=status.HTTP_409_CONFLICT)
        return super().destroy(request, *args, **kwargs)
