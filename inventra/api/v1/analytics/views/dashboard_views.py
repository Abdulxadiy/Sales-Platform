from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied

from api.permissions import IsOwner
from apps.analytics.services.analytics_service import AnalyticsService, AnalyticsServiceError


class DashboardView(APIView):
    """
    Savdo Analitikasi va Boshqaruv Paneli (Dashboard).
    Faqat do'kon egasi (owner) ko'rishi mumkin.
    Platforma administratori uchun do'konning ichki tijorat va moliyaviy ma'lumotlari
    maxfiylik siyosatiga muvofiq qat'iy cheklangan (403 Forbidden).
    """
    permission_classes = [IsOwner]

    def get(self, request):
        user = request.user
        if user.role == "platform_admin":
            raise PermissionDenied(
                "Do'konning tijorat sirlari va moliyaviy hisobotlari platforma administratori uchun yopiq."
            )

        tenant = user.tenant
        if not tenant or not tenant.is_active:
            raise PermissionDenied("Do'kon faol emas yoki mavjud emas.")

        requested_tenant_id = request.query_params.get("tenant_id")
        if requested_tenant_id and str(tenant.id) != str(requested_tenant_id):
            raise PermissionDenied("Siz faqat o'zingizning do'koningiz analitikasini ko'ra olasiz.")

        if not tenant or not tenant.is_active:
            raise PermissionDenied("Do'kon faol emas.")

        period = request.query_params.get("period", "today")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        try:
            summary = AnalyticsService.get_dashboard_summary(
                tenant=tenant,
                period=period,
                start_date_str=start_date,
                end_date_str=end_date,
            )
            return Response(summary, status=status.HTTP_200_OK)
        except AnalyticsServiceError as exc:
            return Response(
                {
                    "error": {
                        "code": "invalid_parameters",
                        "message": str(exc),
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
