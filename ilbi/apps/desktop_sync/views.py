from datetime import timedelta
from uuid import UUID, uuid4

from django.core import signing
from django.db import transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .cloud import apply_operation, device_for, device_uuid
from .models import SyncActor, SyncDevice
from .protocol import PROTOCOL
from .revisions import revision_for
from .snapshots import authorize, export_snapshot


def actor_ticket(device, actor):
    return signing.dumps(
        {
            "device_id": str(device.pk),
            "user_id": actor.user_id,
            "token_version": actor.token_version,
            "lease_until": device.lease_until.isoformat(),
        },
        salt="ilbi-offline-actor",
        compress=True,
    )


@extend_schema(tags=["Desktop sync"], request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
class DeviceEnrollView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if request.data.get("protocol") != PROTOCOL:
            raise ValidationError("Dastur versiyasini yangilang.")
        tenant = authorize(request.user, request.data.get("tenant_id"))
        type(tenant).objects.select_for_update().get(pk=tenant.pk)
        try:
            installation_id = UUID(str(request.data.get("installation_id", uuid4())))
        except ValueError as exc:
            raise ValidationError("Qurilma identifikatori noto‘g‘ri.") from exc
        existing = SyncDevice.objects.filter(
            pk=installation_id, user_id=request.user.pk, tenant_id=tenant.pk, revoked_at__isnull=True
        ).first()
        if not existing and SyncDevice.objects.filter(tenant_id=tenant.pk, revoked_at__isnull=True).exists():
            raise ValidationError(
                "Bu do‘konda offline qurilma bor. Bir nechta kassa uchun umumiy mahalliy server kerak."
            )
        device = existing or SyncDevice.objects.create(
            id=installation_id,
            user_id=request.user.pk,
            tenant_id=tenant.pk,
            name=str(request.data.get("name", "ILBI Desktop"))[:100],
            token_version=request.user.token_version,
            lease_until=timezone.now() + timedelta(days=7),
        )
        if existing:
            device.token_version = request.user.token_version
            device.lease_until = timezone.now() + timedelta(days=7)
            device.save(update_fields=["token_version", "lease_until"])
        actor, _ = SyncActor.objects.update_or_create(
            device=device, user_id=request.user.pk, defaults={"token_version": request.user.token_version}
        )
        return Response(
            {
                "device_id": str(device.pk),
                "user_id": request.user.pk,
                "actor_ticket": actor_ticket(device, actor),
                "lease_until": device.lease_until,
                "snapshot": export_snapshot(tenant),
            }
        )


@extend_schema(tags=["Desktop sync"], responses={200: OpenApiTypes.OBJECT})
class SnapshotView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def get(self, request):
        device = device_for(request.user, request.query_params.get("device_id"), lock=True)
        device.lease_until = timezone.now() + timedelta(days=7)
        device.save(update_fields=["lease_until"])
        from apps.accounts.models import Employee

        active = Employee.objects.filter(tenant_id=device.tenant_id, is_active=True, user__is_active=True)
        actors = {}
        for actor in SyncActor.objects.filter(device=device, user_id__in=active.values("user_id")):
            employee = active.get(user_id=actor.user_id)
            if actor.token_version == employee.user.token_version:
                actors[str(actor.user_id)] = actor_ticket(device, actor)
        return Response(
            {
                "lease_until": device.lease_until,
                "actors": actors,
                "snapshot": export_snapshot(authorize(request.user, device.tenant_id)),
            }
        )


@extend_schema(tags=["Desktop sync"], responses={200: OpenApiTypes.OBJECT})
class ChangesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        device = device_for(request.user, request.query_params.get("device_id"))
        return Response({"revision": revision_for(device.tenant_id)})


@extend_schema(tags=["Desktop sync"], request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
class ActorGrantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.accounts.services.tenant_context_service import resolve_active_context

        device = SyncDevice.objects.filter(pk=device_uuid(request.data.get("device_id")), revoked_at__isnull=True).first()
        if device is None or resolve_active_context(request.user, str(device.tenant_id)).tenant is None:
            raise ValidationError("Bu offline qurilma sizning do‘koningizga tegishli emas.")
        if request.user.pk == device.user_id:
            authorize(request.user, device.tenant_id)
            device.token_version = request.user.token_version
            device.lease_until = timezone.now() + timedelta(days=7)
            device.save(update_fields=["token_version", "lease_until"])
        elif device.lease_until <= timezone.now():
            raise ValidationError("Owner internet orqali qurilma ruxsatini yangilashi kerak.")
        actor, _ = SyncActor.objects.update_or_create(
            device=device, user_id=request.user.pk, defaults={"token_version": request.user.token_version}
        )
        return Response(
            {
                "user_id": request.user.pk,
                "actor_ticket": actor_ticket(device, actor),
                "token_version": actor.token_version,
                "lease_until": device.lease_until,
            }
        )


@extend_schema(tags=["Desktop sync"], request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
class PushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.data.get("protocol") != PROTOCOL:
            raise ValidationError("Dastur va server versiyasi mos emas.")
        from .serializers import OperationSerializer

        operation = OperationSerializer(data=request.data.get("operation", {}))
        operation.is_valid(raise_exception=True)
        return Response(apply_operation(request.user, request.data.get("device_id"), request.data.get("operation", {})))


@extend_schema(tags=["Desktop sync"], request=OpenApiTypes.OBJECT, responses={200: OpenApiTypes.OBJECT})
class DeviceRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, device_id):
        device = SyncDevice.objects.filter(pk=device_id, revoked_at__isnull=True).first()
        if device is None:
            raise ValidationError("Qurilma topilmadi.")
        authorize(request.user, device.tenant_id)
        device.revoked_at = timezone.now()
        device.save(update_fields=["revoked_at"])
        return Response({"revoked": True})
