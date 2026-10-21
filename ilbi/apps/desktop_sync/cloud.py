import re
from collections import defaultdict
from datetime import timedelta
from uuid import UUID

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction
from django.test import RequestFactory
from django.urls import resolve
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.test import force_authenticate

from apps.core.event_clock import event_time

from .files import decode_body
from .models import SyncDevice, SyncReceipt
from .protocol import LOCAL_ID_START, allowed, digest, json_value, receipt_hint, record_changes, replaying
from .snapshots import authorize


class SyncConflict(APIException):
    status_code = 409
    default_detail = "Ma’lumotlar o‘zgargan. Operatsiyani tekshirish kerak."


def device_for(user, device_id, *, lock=False):
    queryset = SyncDevice.objects.select_for_update() if lock else SyncDevice.objects
    device = queryset.filter(pk=device_id, user_id=user.pk, revoked_at__isnull=True).first()
    if device is None or device.token_version != user.token_version:
        raise PermissionDenied("Qurilma ruxsati bekor qilingan.")
    if device.lease_until <= timezone.now():
        raise PermissionDenied("Offline ruxsat muddati tugagan; qurilmani qayta tasdiqlang.")
    authorize(user, device.tenant_id)
    return device


def rewrite(value, mapping, strict=True):
    if isinstance(value, dict):
        return {
            k: rewrite(v, mapping, strict)
            if k in {"id", "category", "parent", "product", "product_variant", "counterparty", "assigned_to", "branch"}
            or k.endswith(("_id", "_ids"))
            or isinstance(v, (dict, list))
            else v
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [rewrite(v, mapping, strict) for v in value]
    if type(value) is int and value >= LOCAL_ID_START:
        if str(value) not in mapping:
            if not strict:
                return value
            raise SyncConflict("Bog‘liq operatsiya hali serverga yuborilmagan.")
        return mapping[str(value)]
    if isinstance(value, str) and value.isdecimal() and int(value) >= LOCAL_ID_START:
        if value not in mapping:
            if not strict:
                return value
            raise SyncConflict("Bog‘liq operatsiya hali serverga yuborilmagan.")
        return str(mapping[value])
    return value


@transaction.atomic
def apply_operation(user, device_id, payload):
    device = device_for(user, device_id, lock=True)
    try:
        grant = signing.loads(payload["actor_ticket"], salt="ilbi-offline-actor")
        actor = get_user_model().objects.get(pk=grant["user_id"], is_active=True, token_version=grant["token_version"])
        from apps.accounts.services.tenant_context_service import resolve_active_context

        context = resolve_active_context(actor, str(device.tenant_id))
        if grant["device_id"] != str(device.pk) or context.tenant is None:
            raise ValueError("actor scope")
    except (KeyError, ValueError, signing.BadSignature, get_user_model().DoesNotExist) as exc:
        raise PermissionDenied("Operatsiyani bajargan xodim ruxsati tasdiqlanmadi.") from exc
    try:
        operation_id = UUID(str(payload["id"]))
        path = payload["path"]
        method = payload["method"]
    except (KeyError, ValueError, TypeError) as exc:
        raise ValidationError("Operatsiya formati noto‘g‘ri.") from exc
    if not allowed(method, path):
        raise ValidationError("Bu amal uchun jonli server aloqasi kerak.")
    fingerprint = digest(payload)
    previous = SyncReceipt.objects.filter(device=device, operation_id=operation_id).first()
    if previous:
        if previous.fingerprint != fingerprint:
            raise SyncConflict("Operatsiya identifikatori boshqa ma’lumot uchun ishlatilgan.")
        return previous.result
    dependencies = payload.get("dependencies", [])
    if len(dependencies) > 5000 or SyncReceipt.objects.filter(
        device=device, operation_id__in=dependencies
    ).count() != len(set(dependencies)):
        raise SyncConflict("Bog‘liq operatsiyalar avval yuborilishi kerak.")
    mapping = {}
    for result in SyncReceipt.objects.filter(device=device).values_list("result", flat=True):
        mapping.update(result.get("id_map", {}))
    path = re.sub(r"\d+", lambda match: str(rewrite(int(match[0]), mapping)), path)
    body = rewrite(payload.get("body", {}), mapping)
    for condition in payload.get("preconditions", []):
        label = condition.get("model")
        if label not in {"catalog.category", "catalog.product", "catalog.productvariant", "sales.counterparty"}:
            raise ValidationError("Noto‘g‘ri versiya sharti.")
        obj = (
            apps.get_model(label)
            .objects.select_for_update()
            .filter(pk=rewrite(condition["id"], mapping), tenant_id=device.tenant_id)
            .first()
        )
        expected = rewrite(condition["fields"], mapping)
        if obj is None or any(json_value(getattr(obj, k, None)) != v for k, v in expected.items()):
            raise SyncConflict("Shu ma’lumot web yoki boshqa kassada o‘zgargan. Tekshirish kerak.")
    encoded, content_type = decode_body(body)
    request = RequestFactory().generic(
        method, "/api/v1/" + path, data=encoded, content_type=content_type, HTTP_X_TENANT_ID=str(device.tenant_id)
    )
    force_authenticate(request, user=actor)
    match = resolve(request.path)
    occurred = parse_datetime(payload.get("occurred_at", ""))
    if (
        occurred is None
        or timezone.is_naive(occurred)
        or occurred < device.created_at - timedelta(minutes=5)
        or occurred > timezone.now() + timedelta(minutes=5)
    ):
        raise ValidationError("Operatsiya vaqti noto‘g‘ri.")
    if grant.get("lease_until") and occurred > parse_datetime(grant["lease_until"]):
        raise PermissionDenied("Operatsiya offline ruxsat muddatidan tashqarida bajarilgan.")
    token = replaying.set(True)
    clock_token = event_time.set(occurred)
    sale_hint = next((row["fields"] for row in payload.get("created", []) if row["model"] == "sales.sale"), None)
    if sale_hint and (
        not re.fullmatch(r"O" + device.id.hex[:6] + r"-\d{8}-\d{4,}", sale_hint.get("receipt_number", ""))
        or not re.fullmatch(r"[A-Za-z0-9_-]{40,64}", sale_hint.get("public_token", ""))
    ):
        replaying.reset(token)
        event_time.reset(clock_token)
        raise ValidationError("Offline chek identifikatori noto‘g‘ri.")
    receipt_token = receipt_hint.set(sale_hint)
    try:
        with record_changes() as changes:
            response = match.func(request, *match.args, **match.kwargs)
            if response.status_code >= 400:
                detail = json_value(getattr(response, "data", {}))
                raise SyncConflict({"detail": "Server operatsiyani qabul qilmadi.", "reason": detail})
    finally:
        replaying.reset(token)
        event_time.reset(clock_token)
        receipt_hint.reset(receipt_token)
    # Match creations within each model; differences mean the local command's
    # assumptions no longer hold. Roll back the entire command and receipt.
    actual = defaultdict(list)
    for row in changes["created"]:
        actual[row["model"]].append(row["id"])
    id_map = {}
    for row in payload.get("created", []):
        candidates = actual[row["model"]]
        if not candidates:
            raise SyncConflict("Operatsiya natijasi mahalliy yozuvga mos kelmadi.")
        id_map[str(row["id"])] = candidates.pop(0)
    result = {"id": str(operation_id), "id_map": id_map, "response": json_value(getattr(response, "data", {}))}
    SyncReceipt.objects.create(device=device, operation_id=operation_id, fingerprint=fingerprint, result=result)
    return result
