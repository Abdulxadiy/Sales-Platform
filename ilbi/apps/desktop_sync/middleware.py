import hmac
import json
import re

import requests
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone

from .cloud import rewrite
from .desktop_api import endpoint
from .files import encode_request
from .local import enqueue, get_state, runtime_lock
from .protocol import allowed, preconditions, record_changes, title_for


class DesktopMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not hmac.compare_digest(request.headers.get("X-ILBI-Desktop-Key", ""), settings.DESKTOP_BRIDGE_KEY):
            return JsonResponse({"detail": "Desktop ulanishi tasdiqlanmadi."}, status=403)
        if request.path.startswith("/desktop/"):
            with runtime_lock:
                return endpoint(request, request.path[len("/desktop/") :])
        if not request.path.startswith("/api/v1/"):
            return self.get_response(request)
        path = request.path[len("/api/v1/") :]
        with runtime_lock:
            device = get_state("device")
            if request.headers.get("X-ILBI-Cloud-Session") == "true":
                if request.method not in {"GET", "HEAD", "OPTIONS"} and not path.startswith("auth/"):
                    return JsonResponse({"detail": "Avval hisobingizni offline kassaga ulang."}, status=409)
                return self.proxy(request, path)
            if not device:
                return self.proxy(request, path)
            aliases = get_state("aliases", {})
            if aliases:
                # Forms and open receipts may retain their local IDs after a pull.
                # Translate only identifiers already acknowledged and imported.
                path = re.sub(r"\d+", lambda match: str(aliases.get(match[0], match[0])), path)
                request.path = request.path_info = "/api/v1/" + path
                query = request.GET.copy()
                for key in query:
                    if key == "id" or key.endswith(("_id", "_ids")):
                        query.setlist(
                            key,
                            [
                                re.sub(r"\d+", lambda match: str(aliases.get(match[0], match[0])), value)
                                for value in query.getlist(key)
                            ],
                        )
                request.GET = query
            if path.startswith("auth/admin-login") or path.startswith("auth/password-reset"):
                return self.proxy(request, path)
            if path == "auth/token/refresh/":
                from rest_framework_simplejwt.tokens import RefreshToken

                from .authentication import DesktopJWTAuthentication
                from .desktop_api import local_tokens

                try:
                    token = RefreshToken(json.loads(request.body)["refresh"])
                    user = DesktopJWTAuthentication().get_user(token)
                    return JsonResponse(local_tokens(user, device))
                except Exception:
                    return JsonResponse({"detail": "Offline sessiya muddati tugagan."}, status=401)
            # Cross-store actions and external services require live confirmation.
            remote_only = path.startswith(("support/", "platform/", "inventory/transfers/", "sales/b2b/", "internal/"))
            if remote_only or (request.method not in {"GET", "HEAD", "OPTIONS"} and not allowed(request.method, path)):
                from .models import LocalOperation

                if LocalOperation.objects.exclude(status="done").exists():
                    return JsonResponse(
                        {"detail": "Bu amal jonli serverda bajariladi. Avval mahalliy navbatni sinxronlang."},
                        status=409,
                    )
                return self.proxy(request, path, enrolled=True)
            if request.method in {"GET", "HEAD", "OPTIONS"}:
                return self.get_response(request)
            try:
                body = encode_request(request)
                if aliases and request.content_type == "application/json":
                    body = rewrite(body, aliases, strict=False)
                    request._body = json.dumps(body).encode()
                    request.META["CONTENT_LENGTH"] = str(len(request._body))
            except ValueError as exc:
                return JsonResponse({"detail": str(exc)}, status=400)
            if path == "sales/" and body.get("counterparty_id"):
                from apps.sales.models import Counterparty

                if Counterparty.objects.filter(pk=body["counterparty_id"], target_tenant__isnull=False).exists():
                    return JsonResponse({"detail": "B2B savdo uchun ikki do‘konning jonli tasdig‘i kerak."}, status=409)
            with transaction.atomic(), record_changes() as changes:
                response = self.get_response(request)
                if response.status_code >= 400:
                    transaction.set_rollback(True)
                    return response
                actors = get_state("actors", {})
                actor = actors.get(str(getattr(request.user, "pk", "")))
                if not actor:
                    transaction.set_rollback(True)
                    return JsonResponse({"detail": "Offline xodim tasdiqlanmadi."}, status=401)
                row = enqueue(
                    user_id=request.user.pk,
                    tenant_id=device["tenant_id"],
                    title=title_for(path, request.method),
                    resources=changes["resources"],
                    references=changes["references"],
                    payload={
                        "method": request.method,
                        "path": path,
                        "body": body,
                        "created": changes["created"],
                        "preconditions": preconditions(changes),
                        "occurred_at": timezone.now().isoformat(),
                        "actor_ticket": actor["actor_ticket"],
                    },
                )
                response["X-ILBI-Operation-ID"] = str(row.id)
                response["X-ILBI-Sync-Status"] = "waiting"
                return response

    def proxy(self, request, path, enrolled=False):
        try:
            if enrolled:
                # Never substitute the owner's cloud credentials for a cashier's
                # privileged live action. Each user must log in online for it.
                return JsonResponse(
                    {"detail": "Bu amal uchun web orqali hisobingizga kiring. Offline ishlar saqlangan."}, status=409
                )
            base = settings.DESKTOP_SERVER.rstrip("/")
            headers = {
                key: value
                for key, value in request.headers.items()
                if key.lower() in {"authorization", "content-type", "x-tenant-id"}
            }
            remote = requests.request(
                request.method,
                base + request.get_full_path(),
                data=request.body,
                headers=headers,
                timeout=(5, 30),
                allow_redirects=False,
            )
            response = HttpResponse(
                remote.content,
                status=remote.status_code,
                content_type=remote.headers.get("Content-Type", "application/json"),
            )
            return response
        except requests.RequestException:
            return JsonResponse(
                {"detail": "Internet yo‘q. Tayyorlangan hisobga offline parol bilan kiring."}, status=503
            )
