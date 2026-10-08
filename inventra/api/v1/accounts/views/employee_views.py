"""Views for hiring and firing employees within a tenant."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.mixins import TenantContextMixin
from apps.accounts.services.employee_service import EmployeeService, EmployeeServiceError
from api.v1.accounts.serializers import EmployeeHireSerializer, EmployeeFireSerializer, EmployeeOutputSerializer


class EmployeeHireView(TenantContextMixin, APIView):
    """POST /api/v1/tenants/{tenant_id}/employees/hire/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, tenant_id):
        # Tenant authority + active-tenant check are centralized in
        # TenantContextMixin.resolve_tenant_from_url() -- see api/mixins.py
        # for the 8-bosqich design rationale.
        tenant = self.resolve_tenant_from_url(request, tenant_id)

        serializer = EmployeeHireSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        branch_id = serializer.validated_data.get('branch_id')
        branch = None
        if branch_id:
            from apps.tenants.models import Branch
            branch = Branch.objects.filter(pk=branch_id, tenant=tenant).first()

        try:
            employee = EmployeeService.hire(
                target_user=serializer.validated_data.get('target_user'),
                phone_number=serializer.validated_data.get('phone_number'),
                tenant=tenant,
                branch=branch,
                hired_by=request.user,
                position=serializer.validated_data.get('position', ''),
                permissions=serializer.validated_data.get('permissions'),
                role="staff",
            )
        except EmployeeServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Dispatch onboarding invitation if employee has email and hasn't set a password yet
        if employee.user.email and not employee.user.has_usable_password():
            from apps.accounts.services.password_reset_service import request_password_reset
            import logging
            _logger = logging.getLogger(__name__)
            try:
                request_password_reset(
                    employee.user.email,
                    purpose="new_employee",
                    extra_context={"position": employee.position, "tenant_name": tenant.name},
                )
            except Exception as exc:
                _logger.warning("Failed to dispatch employee onboarding email to %s: %s", employee.user.email, exc)

        return Response(EmployeeOutputSerializer(employee).data, status=status.HTTP_201_CREATED)


class EmployeeFireView(TenantContextMixin, APIView):
    """POST /api/v1/tenants/{tenant_id}/employees/fire/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, tenant_id):
        # Same centralized authority + active-tenant check as hire above.
        self.resolve_tenant_from_url(request, tenant_id)

        serializer = EmployeeFireSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            employee = EmployeeService.fire(
                target_user=serializer.validated_data["target_user"],
                fired_by=request.user
            )
        except EmployeeServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(EmployeeOutputSerializer(employee).data)