import json
from datetime import timedelta
from uuid import UUID, uuid4

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import DesktopJWTAuthentication
from .files import cache_media
from .local import get_state, prioritize, queue_status, set_state, wake_worker
from .models import LocalOperation
from .snapshots import import_snapshot
from .transport import Vault, server_url


def local_tokens(user, device):
    token = RefreshToken.for_user(user)
    token["desktop_device"] = device["device_id"]
    token["token_version"] = user.token_version
    return {"access": str(token.access_token), "refresh": str(token)}


def authenticated(request):
    result = DesktopJWTAuthentication().authenticate(request)
    if result is None:
        raise ValueError("Avval hisobga kiring.")
    return result[0]


def can_manage_queue(user):
    from apps.accounts.models import Employee

    device = get_state("device") or {}
    return Employee.objects.filter(user=user, tenant_id=device.get("tenant_id"), is_active=True, is_owner=True).exists()


def endpoint(request, path):
    try:
        data = json.loads(request.body or b"{}") if request.method == "POST" else {}
        device = get_state("device")
        if path == "status/" and request.method == "GET":
            # No account names, operations or credentials in the pre-login status.
            return JsonResponse({"desktop": True, "enrolled": bool(device), "server": settings.DESKTOP_SERVER})
        if path == "unlock/" and request.method == "POST":
            actors = get_state("actors", {})
            blocked_until = parse_datetime(get_state("unlock_blocked_until", ""))
            if blocked_until and blocked_until > timezone.now():
                return JsonResponse({"detail": "Ko‘p urinish. Birozdan keyin qayta urinib ko‘ring."}, status=429)
            selected = next((actor for actor in actors.values() if actor["username"] == data.get("username")), None)
            valid = selected and check_password(str(data.get("pin", "")), selected["pin_hash"])
            if not valid:
                failures = int(get_state("unlock_failures", 0)) + 1
                set_state("unlock_failures", failures)
                if failures >= 5:
                    set_state("unlock_blocked_until", (timezone.now() + timedelta(minutes=5)).isoformat())
                return JsonResponse({"detail": "Login yoki offline parol noto‘g‘ri."}, status=401)
            if not device or timezone.now() >= parse_datetime(device["lease_until"]):
                return JsonResponse(
                    {"detail": "Offline ruxsat muddati tugadi. Internet orqali qayta tasdiqlang."}, status=401
                )
            user = get_user_model().objects.get(pk=selected["user_id"], is_active=True)
            set_state("unlock_failures", 0)
            set_state("unlock_blocked_until", "")
            return JsonResponse(local_tokens(user, device))
        if path in {"enroll/", "actor/", "reconnect/"} and request.method == "POST":
            pin = str(data.get("pin", ""))
            if path != "reconnect/" and len(pin) < 8:
                raise ValueError("Offline parol kamida 8 belgidan iborat bo‘lsin.")
            server = server_url(settings.DESKTOP_SERVER)
            access = request.headers.get("Authorization", "")
            headers = {"Authorization": access}
            profile = requests.get(server + "/api/v1/auth/me/", headers=headers, timeout=(5, 20), allow_redirects=False)
            if not profile.ok:
                return JsonResponse({"detail": "Avval internet orqali hisobingizni tasdiqlang."}, status=401)
            user_data = profile.json()
            if path == "enroll/":
                if device:
                    raise ValueError("Bu kompyuter allaqachon tayyorlangan. Offline parol bilan kiring.")
                installation_id = get_state("installation_id") or str(uuid4())
                set_state("installation_id", installation_id)
                response = requests.post(
                    server + "/api/v1/sync/devices/",
                    headers=headers,
                    json={
                        "protocol": 1,
                        "tenant_id": data.get("tenant_id"),
                        "name": "ILBI Desktop",
                        "installation_id": installation_id,
                    },
                    timeout=(5, 90),
                    allow_redirects=False,
                )
            elif path == "actor/":
                if not device:
                    raise ValueError("Avval do‘kon egasi offline bazani tayyorlasin.")
                response = requests.post(
                    server + "/api/v1/sync/actors/",
                    headers=headers,
                    json={"device_id": device["device_id"]},
                    timeout=(5, 20),
                    allow_redirects=False,
                )
            else:
                if not device or user_data["id"] != device["user_id"]:
                    raise ValueError("Ushbu qurilmani ulagan owner hisobi kerak.")
                renewed = requests.post(
                    server + "/api/v1/sync/actors/",
                    headers=headers,
                    json={"device_id": device["device_id"]},
                    timeout=(5, 20),
                    allow_redirects=False,
                )
                if not renewed.ok:
                    return JsonResponse({"detail": "Qurilma ruxsatini yangilab bo‘lmadi."}, status=renewed.status_code)
                grant = renewed.json()
                with transaction.atomic():
                    device["lease_until"] = grant["lease_until"]
                    set_state("device", device)
                    actors = get_state("actors", {})
                    if str(user_data["id"]) in actors:
                        actors[str(user_data["id"])]["actor_ticket"] = grant["actor_ticket"]
                        set_state("actors", actors)
                Vault().put_user(
                    user_data["id"],
                    {"server": server, "access": access.removeprefix("Bearer "), "refresh": data.get("refresh")},
                    primary=True,
                )
                wake_worker.set()
                return JsonResponse({"connected": True})
            if not response.ok:
                return JsonResponse({"detail": response.text[:2000]}, status=response.status_code)
            result = response.json()
            if path == "enroll/":
                cache_media(result["snapshot"], server)
            with transaction.atomic():
                if path == "enroll/":
                    import_snapshot(result["snapshot"])
                    device = {k: result[k] for k in ("device_id", "user_id", "lease_until")}
                    device["tenant_id"] = result["snapshot"]["tenant_id"]
                    set_state("device", device)
                    set_state("revision", result["snapshot"].get("revision", 0))
                user = get_user_model().objects.filter(pk=result["user_id"]).first()
                if user is None:
                    raise ValueError("Xodim yangi qo‘shilgan. Owner navbatni sinxronlab bo‘lgach qayta urinib ko‘ring.")
                actors = get_state("actors", {})
                actors[str(user.pk)] = {
                    "user_id": user.pk,
                    "username": user.username,
                    "pin_hash": make_password(pin),
                    "actor_ticket": result["actor_ticket"],
                }
                set_state("actors", actors)
                Vault().put_user(
                    user.pk,
                    {"server": server, "access": access.removeprefix("Bearer "), "refresh": data.get("refresh")},
                    primary=user.pk == device["user_id"],
                )
                if path == "actor/" and user.pk == device["user_id"]:
                    device["lease_until"] = result["lease_until"]
                    set_state("device", device)
            wake_worker.set()
            return JsonResponse(local_tokens(user, device))
        user = authenticated(request)
        if path == "queue/" and request.method == "GET":
            status = queue_status()
            # A cashier sees only their own work; owners can inspect the whole store.
            if not can_manage_queue(user):
                ids = set(
                    str(i)
                    for i in LocalOperation.objects.filter(user_id=user.pk)
                    .exclude(status="done")
                    .values_list("id", flat=True)
                )
                status["operations"] = [row for row in status["operations"] if row["id"] in ids]
            return JsonResponse(status)
        if request.method == "POST" and path in {"priority/", "retry/"}:
            row = LocalOperation.objects.get(id=UUID(str(data.get("id"))))
            if row.user_id != user.pk and not can_manage_queue(user):
                return JsonResponse({"detail": "Bu operatsiya sizga tegishli emas."}, status=403)
            if path == "priority/":
                prioritize(row.id)
            elif row.status not in {"active", "done"}:
                row.status, row.next_attempt_at, row.error = "waiting", None, ""
                row.save(update_fields=["status", "next_attempt_at", "error"])
                wake_worker.set()
            return JsonResponse({"accepted": True})
        return JsonResponse({"detail": "Amal topilmadi."}, status=404)
    except APIException as exc:
        return JsonResponse({"detail": str(exc.detail)}, status=exc.status_code)
    except (ValueError, KeyError, TypeError, LocalOperation.DoesNotExist) as exc:
        return JsonResponse({"detail": str(exc)}, status=400)
    except requests.RequestException:
        return JsonResponse({"detail": "Serverga ulanish yo‘q. Offline parol bilan kiring."}, status=503)
