"""View for tenant creation and management."""

from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
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


class CurrentTenantView(APIView):
    """
    GET /api/v1/tenants/current/ -- retrieve current tenant settings.
    PATCH /api/v1/tenants/current/ -- update settings (owner or platform_admin).
    """
    permission_classes = [IsAuthenticated]

    def _get_tenant(self, request):
        user = request.user
        if user.role == "owner":
            tenant = getattr(user, "owned_tenant", None)
            if not tenant:
                tenant = Tenant.objects.filter(owner=user).first()
            return tenant
        elif user.role == "platform_admin":
            tenant_id = request.query_params.get("tenant_id")
            if tenant_id:
                return get_object_or_404(Tenant, pk=tenant_id)
            return Tenant.objects.first()
        else:
            return getattr(user, "tenant", None)

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"detail": "Do'kon topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == "platform_admin":
            return Response(TenantAdminSerializer(tenant).data)
        elif request.user.role == "owner":
            return Response(TenantOwnerSerializer(tenant).data)
        return Response(TenantStaffSerializer(tenant).data)

    def patch(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"detail": "Do'kon topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role not in ("owner", "platform_admin"):
            return Response({"detail": "Faqat do'kon egasi sozlamalarni o'zgartira oladi."}, status=status.HTTP_403_FORBIDDEN)

        serializer_class = TenantAdminSerializer if request.user.role == "platform_admin" else TenantOwnerSerializer
        serializer = serializer_class(tenant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class TenantTestTelegramView(APIView):
    """
    POST /api/v1/tenants/current/test-telegram/ -- send test message to configured Telegram destinations.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.tg_bot.models import TelegramContact
        from apps.tg_bot.services import send_telegram_message

        user = request.user
        if user.role == "owner":
            tenant = getattr(user, "owned_tenant", None) or Tenant.objects.filter(owner=user).first()
        elif user.role == "platform_admin":
            tenant_id = request.data.get("tenant_id") or request.query_params.get("tenant_id")
            tenant = Tenant.objects.filter(pk=tenant_id).first() if tenant_id else Tenant.objects.first()
        else:
            return Response({"detail": "Ruxsat etilmagan."}, status=status.HTTP_403_FORBIDDEN)

        if not tenant:
            return Response({"detail": "Do'kon topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        dest_chat_ids = set()
        custom_group_id = request.data.get("telegram_group_id")
        group_id = custom_group_id if custom_group_id is not None else tenant.telegram_group_id
        if group_id and group_id.strip():
            dest_chat_ids.add(group_id.strip())

        contact = TelegramContact.objects.filter(phone_number=tenant.owner.phone_number).first()
        if contact and contact.chat_id:
            dest_chat_ids.add(contact.chat_id)

        if not dest_chat_ids:
            return Response({
                "success": False,
                "detail": "Hech qanday Telegram manzil topilmadi. Guruh ID sini kiriting yoki Telegram bot (@inventraa_bot) ga shaxsiy raqamingizni ulang."
            }, status=status.HTTP_400_BAD_REQUEST)

        test_msg = (
            "🔔 *Inventra Test Bildirishnomasi*\n\n"
            f"🏢 *Do'kon:* {tenant.name}\n"
            f"💵 *Ichki dollar kursi:* `{tenant.usd_rate:,.2f} UZS`\n"
            "✅ *Aloqa holati:* Telegram kanali/guruhi muvaffaqiyatli ulandi va sozlandi!"
        )

        sent_count = 0
        for chat_id in dest_chat_ids:
            ok = send_telegram_message(chat_id, test_msg)
            if ok:
                sent_count += 1

        if sent_count > 0:
            return Response({
                "success": True,
                "detail": f"Test xabari {sent_count} ta Telegram manzilga muvaffaqiyatli yuborildi."
            })
        else:
            return Response({
                "success": False,
                "detail": "Telegram bot xabarni yubora olmadi. Botni guruhga admin qilib qo'shganingizni va ID to'g'riligini tekshiring."
            }, status=status.HTTP_400_BAD_REQUEST)


class TenantSendReportNowView(APIView):
    """
    POST /api/v1/tenants/current/send-report-now/ -- trigger daily report immediately.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.cashbox.tasks import send_daily_report_for_tenant_task

        user = request.user
        if user.role == "owner":
            tenant = getattr(user, "owned_tenant", None) or Tenant.objects.filter(owner=user).first()
        elif user.role == "platform_admin":
            tenant_id = request.data.get("tenant_id") or request.query_params.get("tenant_id")
            tenant = Tenant.objects.filter(pk=tenant_id).first() if tenant_id else Tenant.objects.first()
        else:
            return Response({"detail": "Ruxsat etilmagan."}, status=status.HTTP_403_FORBIDDEN)

        if not tenant:
            return Response({"detail": "Do'kon topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        success = send_daily_report_for_tenant_task(tenant.id)
        if success:
            return Response({"success": True, "detail": "Kunlik hisobot Telegramga yuborildi."})
        return Response({
            "success": False,
            "detail": "Hisobot yuborilmadi. Sozlamalarda hisobot yoqilganini va Telegram manzil kiritilganini tekshiring."
        }, status=status.HTTP_400_BAD_REQUEST)


class TenantSendLowStockReportNowView(APIView):
    """
    POST /api/v1/tenants/current/send-low-stock-report-now/ -- trigger deficit report immediately.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.inventory.tasks import send_low_stock_report_for_tenant_task

        user = request.user
        if user.role == "owner":
            tenant = getattr(user, "owned_tenant", None) or Tenant.objects.filter(owner=user).first()
        elif user.role == "platform_admin":
            tenant_id = request.data.get("tenant_id") or request.query_params.get("tenant_id")
            tenant = Tenant.objects.filter(pk=tenant_id).first() if tenant_id else Tenant.objects.first()
        else:
            return Response({"detail": "Ruxsat etilmagan."}, status=status.HTTP_403_FORBIDDEN)

        if not tenant:
            return Response({"detail": "Do'kon topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        res = send_low_stock_report_for_tenant_task(tenant.id)
        if res.get("success"):
            count = res.get("count", 0)
            return Response({
                "success": True,
                "count": count,
                "detail": f"Kamchilik tovarlar hisoboti ({count} ta tovar) muvaffaqiyatli jo'natildi."
            })
        return Response({
            "success": False,
            "detail": res.get("detail", "Hisobot yuborilmadi. Sozlamalarni tekshiring.")
        }, status=status.HTTP_400_BAD_REQUEST)

