from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from reports.services import parse_month

from . import service


class InsightsView(APIView):
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "advisor"

    def get_throttles(self):
        # Chỉ POST (có thể gọi Groq) bị giới hạn 20 lần/giờ. GET chỉ đọc kết quả đã lưu,
        # app gọi mỗi lần mở màn hình nên không được tính vào hạn mức
        return super().get_throttles() if self.request.method == "POST" else []

    def get(self, request):
        """Chỉ đọc kết quả đã lưu, không gọi Groq."""
        start = parse_month(request.query_params.get("month"))
        return Response(service.cached(request.user, start) or {"status": "none"})

    def post(self, request):
        start = parse_month(request.data.get("month"))
        force = bool(request.data.get("force"))
        return Response(service.generate(request.user, start, force=force))