from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from api.permissions import IsOwnerOrPlatformAdmin
from apps.tenants.models import Tenant
from apps.analytics.services.analytics_service import AnalyticsService, AnalyticsServiceError


class DashboardView(APIView):
    """
    Savdo Analitikasi va Boshqaruv Paneli (Dashboard).
    Faqat do'kon egasi (owner) va platform_admin ko'rishi mumkin.
    """
    permission_classes = [IsOwnerOrPlatformAdmin]

    def get(self, request):
        user = request.user
        if user.role == "platform_admin":
            tenant_id = request.query_params.get("tenant_id")
            if not tenant_id:
                return Response(
                    {
                        "error": {
                            "code": "tenant_required",
                            "message": "platform_admin uchun 'tenant_id' parametri talab qilinadi.",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            tenant = get_object_or_404(Tenant, pk=tenant_id)
        else:
            tenant = user.tenant
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
