import logging
import threading
from datetime import timedelta

import requests
from django.db import close_old_connections
from django.utils import timezone

from .local import activity, get_state, next_operation, runtime_lock, set_state, wake_worker
from .models import LocalOperation
from .snapshots import import_snapshot
from .transport import cloud_request

log = logging.getLogger(__name__)


def sync_once():
    device = get_state("device")
    if not device:
        return False
    with runtime_lock:
        row = next_operation()
        if row:
            row.status = "active"
            row.attempts += 1
            row.save(update_fields=["status", "attempts"])
            activity.update(active=str(row.id), progress=0, stage="uploading")
    try:
        if row:
            response = cloud_request("POST", "sync/push/", body={"protocol": 1, "device_id": device["device_id"],
                                                                   "operation": row.payload}, progress=True)
            activity["online"] = True
            with runtime_lock:
                if response.ok:
                    result = response.json()
                    if result.get("id") != str(row.id):
                        raise ValueError("Server noto‘g‘ri operatsiyani tasdiqladi.")
                    row.status, row.result, row.completed_at = "done", result, timezone.now()
                    row.error = ""
                elif response.status_code in {408, 425, 429} or response.status_code >= 500:
                    row.status = "waiting"
                    row.error = "Server vaqtincha band. Qayta yuboriladi."
                    delay = min(60, 2 ** min(row.attempts, 6))
                    row.next_attempt_at = timezone.now() + timedelta(seconds=delay)
                else:
                    row.status = "error"
                    try:
                        row.error = str(response.json())[:2000]
                    except ValueError:
                        row.error = f"Server javobi: {response.status_code}"
                row.save()
            return True
        # Never replace an optimistic local state while any unsent/conflicting
        # command exists. It remains durable and visible for resolution.
        if LocalOperation.objects.exclude(status="done").exists():
            return False
        response = cloud_request("GET", "sync/snapshot/?device_id=" + device["device_id"])
        activity["online"] = response.status_code < 500
        if response.ok:
            data = response.json()
            with runtime_lock:
                if not LocalOperation.objects.exclude(status="done").exists():
                    import_snapshot(data["snapshot"])
                    device["lease_until"] = data["lease_until"]
                    actors = get_state("actors", {})
                    for key in list(actors):
                        if key not in data.get("actors", {}):
                            del actors[key]
                        else:
                            actors[key]["actor_ticket"] = data["actors"][key]
                    set_state("actors", actors)
                    set_state("device", device)
                    set_state("last_sync", timezone.now().isoformat())
            activity["error"] = ""
        else:
            activity["error"] = "Server bilan sinxronlash tasdiqlanmadi. Hisob yoki qurilma ruxsatini tekshiring."
        return False
    except (requests.RequestException, OSError) as exc:
        activity.update(online=False, error="Serverga ulanish yo‘q. Ishlar kompyuterda saqlanmoqda.")
        if row:
            with runtime_lock:
                row.status = "waiting"
                row.error = "Aloqa tiklanganda qayta yuboriladi."
                row.next_attempt_at = timezone.now() + timedelta(seconds=5)
                row.save()
        log.info("Desktop sync connection unavailable: %s", type(exc).__name__)
        return False
    finally:
        activity.update(active=None, progress=None, stage="waiting")


def run_worker(stop):
    LocalOperation.objects.filter(status="active").update(status="waiting")
    while not stop.is_set():
        close_old_connections()
        try:
            more = sync_once()
        except Exception:
            log.exception("Desktop sync paused after unexpected failure; outbox retained")
            # A failed worker must never leave a forever-active operation.
            LocalOperation.objects.filter(status="active").update(status="error", error="Sinxronlashda xatolik. Qayta urinib ko‘ring.")
            more = False
        if not more:
            wake_worker.wait(10)
            wake_worker.clear()
    close_old_connections()


def start_worker():
    stop = threading.Event()
    thread = threading.Thread(target=run_worker, args=(stop,), name="ilbi-sync", daemon=True)
    thread.start()
    return stop
