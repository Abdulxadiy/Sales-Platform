from datetime import timedelta

from django.db import transaction
from django.core import signing
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .cloud import apply_operation, device_for
from .models import SyncActor, SyncDevice
from .protocol import PROTOCOL
from .snapshots import authorize, export_snapshot


def actor_ticket(device, actor):
    return signing.dumps({"device_id": str(device.pk), "user_id": actor.user_id,
                          "token_version": actor.token_version}, salt="ilbi-offline-actor", compress=True)


class DeviceEnrollView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if request.data.get("protocol") != PROTOCOL:
            raise ValidationError("Dastur versiyasini yangilang.")
        tenant = authorize(request.user, request.data.get("tenant_id"))
        if SyncDevice.objects.filter(tenant_id=tenant.pk, revoked_at__isnull=True, lease_until__gt=timezone.now()).exists():
            raise ValidationError("Bu do‘konda offline qurilma bor. Bir nechta kassa uchun umumiy mahalliy server kerak.")
        device = SyncDevice.objects.create(user_id=request.user.pk, tenant_id=tenant.pk,
                                          name=str(request.data.get("name", "ILBI Desktop"))[:100],
                                          token_version=request.user.token_version,
                                          lease_until=timezone.now() + timedelta(days=7))
        actor = SyncActor.objects.create(device=device, user_id=request.user.pk, token_version=request.user.token_version)
        return Response({"device_id": str(device.pk), "user_id": request.user.pk,
                         "actor_ticket": actor_ticket(device, actor),
                         "lease_until": device.lease_until, "snapshot": export_snapshot(tenant)})


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
        return Response({"lease_until": device.lease_until, "actors": actors,
                         "snapshot": export_snapshot(authorize(request.user, device.tenant_id))})


class ActorGrantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.accounts.services.tenant_context_service import resolve_active_context
        device = SyncDevice.objects.filter(pk=request.data.get("device_id"), revoked_at__isnull=True,
                                            lease_until__gt=timezone.now()).first()
        if device is None or resolve_active_context(request.user, str(device.tenant_id)).tenant is None:
            raise ValidationError("Bu offline qurilma sizning do‘koningizga tegishli emas.")
        actor, _ = SyncActor.objects.update_or_create(device=device, user_id=request.user.pk,
                                                      defaults={"token_version": request.user.token_version})
        return Response({"user_id": request.user.pk, "actor_ticket": actor_ticket(device, actor),
                         "token_version": actor.token_version, "lease_until": device.lease_until})


class PushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.data.get("protocol") != PROTOCOL:
            raise ValidationError("Dastur va server versiyasi mos emas.")
        return Response(apply_operation(request.user, request.data.get("device_id"), request.data.get("operation", {})))


class DeviceRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, device_id):
        device = device_for(request.user, device_id)
        device.revoked_at = timezone.now()
        device.save(update_fields=["revoked_at"])
        return Response({"revoked": True})
