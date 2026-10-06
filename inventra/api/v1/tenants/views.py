"""View for tenant creation and management."""

from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()

from api.permissions import IsPlatformAdmin, IsTenantMember, IsTenantOwnerOrPlatformAdmin
from apps.tenants.models import Tenant
from apps.tenants.services import TenantService, TenantServiceError
from .serializers import (
    TenantCreateSerializer,
    TenantAdminSerializer,
    TenantChangeOwnerSerializer,
    TenantOwnerSerializer,
    TenantStaffSerializer
)


class TenantListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/tenants/ -- list all tenants (platform_admin only).
    POST /api/v1/tenants/ -- create a new tenant with its owner (platform_admin only).
    """
    queryset = Tenant.objects.all().select_related('owner').order_by('-id')
    serializer_class = TenantCreateSerializer
    permission_classes = [IsPlatformAdmin]

    def get_serializer_class(self):
        return TenantCreateSerializer if self.request.method == 'POST' else TenantAdminSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            tenant = TenantService.create_with_owner(
                name=serializer.validated_data['name'],
                owner_phone_number=serializer.validated_data.get('owner_phone_number'),
                owner_email=serializer.validated_data.get('owner_email'),
                owner_user=serializer.validated_data.get('owner'),
                created_by=request.user,
                description=serializer.validated_data.get('description', ""),
            )
        except TenantServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TenantAdminSerializer(tenant).data, status=status.HTTP_201_CREATED)


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/v1/tenants/<tenant_pk>/ -- view, edit, or delete a single tenant.
    Access and edit rights depend on the requesting user's role.
    DELETE is strictly restricted to platform_admin.
    """

    queryset = Tenant.objects.all()
    permission_classes = [IsTenantMember]

    def get_serializer_class(self):
        role = self.request.user.role
        if role == "platform_admin":
            return TenantAdminSerializer
        elif role == "owner":
            return TenantOwnerSerializer
        return TenantStaffSerializer

    def update(self, request, *args, **kwargs):
        if request.user.role == "staff":
            return Response(
                {"detail": "Staff cannot edit tenant information."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != "platform_admin":
            return Response(
                {"detail": "Faqat platform_admin do‘konni (tenant) butunlay o‘chira oladi."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance = self.get_object()
        with transaction.atomic():
            self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TenantChangeOwnerView(APIView):
    """POST /api/v1/tenants/<tenant_pk>/change-owner/ -- platform_admin only."""

    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        tenant = get_object_or_404(Tenant, pk=pk)
        serializer = TenantChangeOwnerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_owner = serializer.validated_data.get('new_owner_id')
        new_phone = serializer.validated_data.get('new_owner_phone_number')
        new_email = serializer.validated_data.get('new_owner_email')

        if new_phone:
            defaults = {"role": "owner", "profile_completed": False}
            if new_email:
                defaults["email"] = new_email
            new_owner, created = User.objects.get_or_create(
                phone_number=new_phone,
                defaults=defaults
            )
            if not created and new_email and new_owner.email != new_email:
                new_owner.email = new_email
                new_owner.save(update_fields=["email"])
        elif new_owner and new_email and new_owner.email != new_email:
            new_owner.email = new_email
            new_owner.save(update_fields=["email"])

        try:
            TenantService.change_owner(
                tenant=tenant,
                new_owner=new_owner,
                changed_by=request.user,
            )
        except TenantServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TenantAdminSerializer(tenant).data)


class TenantDeactivateView(APIView):
    """POST /api/v1/tenants/<tenant_pk>/deactivate/ -- platform_admin (any) oe owner (own)"""

    permission_classes = [IsTenantOwnerOrPlatformAdmin]

    def post(self, request, pk):
        tenant = get_object_or_404(Tenant, pk=pk)
        self.check_object_permissions(request, tenant)
        tenant.is_active = False
        tenant.save(update_fields=["is_active"])
        return Response({"id": tenant.id, "is_active": tenant.is_active})


class TenantActivateView(APIView):
    """POST /api/v1/tenants/{id}/activate/ — platform_admin (any) or owner (own)."""

    permission_classes = [IsTenantOwnerOrPlatformAdmin]

    def post(self, request, pk):
        tenant = get_object_or_404(Tenant, pk=pk)
        self.check_object_permissions(request, tenant)
        tenant.is_active = True
        tenant.save(update_fields=["is_active"])
        return Response({"id": tenant.id, "is_active": tenant.is_active})
