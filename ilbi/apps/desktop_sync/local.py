"""Desktop-only durable outbox and dependency-aware, non-preemptive scheduler."""
import threading
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import LocalOperation, LocalState

runtime_lock = threading.RLock()
wake_worker = threading.Event()
activity = {"online": False, "active": None, "progress": None, "stage": "waiting", "error": ""}


def get_state(key, default=None):
    row = LocalState.objects.filter(pk=key).first()
    return row.value if row else default


def set_state(key, value):
    LocalState.objects.update_or_create(key=key, defaults={"value": value})


def ordered_operations(rows):
    """Promoted roots carry their dependency closure; an active row stays first."""
    rows = list(rows)
    by_id = {str(row.id): row for row in rows}
    ordered, visited, visiting = [], set(), set()

    def visit(row):
        key = str(row.id)
        if key in visiting:
            raise ValueError("Operatsiyalar bog‘liqligida sikl bor.")
        if key in visited:
            return
        visiting.add(key)
        for dependency in row.dependencies:
            if dependency in by_id:
                visit(by_id[dependency])
        visiting.remove(key)
        visited.add(key)
        ordered.append(row)

    for row in rows:
        if row.status == "active":
            visit(row)
    for row in sorted((r for r in rows if r.priority), key=lambda r: r.priority):
        visit(row)
    for row in rows:
        visit(row)
    return ordered


@transaction.atomic
def prioritize(operation_id):
    # The runtime lock also serializes worker selection, so a user's promotion
    # never changes the payload or status of an already active transmission.
    row = LocalOperation.objects.select_for_update().get(id=operation_id)
    if row.status in {"active", "done"}:
        return
    if not row.priority:
        maximum = max(LocalOperation.objects.values_list("priority", flat=True), default=0)
        row.priority = maximum + 1
    row.save(update_fields=["priority"])
    wake_worker.set()


def next_operation():
    rows = ordered_operations(LocalOperation.objects.exclude(status="done"))
    done = {str(value) for value in LocalOperation.objects.filter(status="done").values_list("id", flat=True)}
    for row in rows:
        if row.status == "waiting" and all(dependency in done for dependency in row.dependencies):
            if row.next_attempt_at is None or row.next_attempt_at <= timezone.now():
                return row
    return None


def enqueue(*, user_id, tenant_id, payload, resources, references, title):
    dependencies = []
    needed = set(resources) | set(references)
    # Latest writer per aggregate preserves cash-shift, stock and customer
    # causality without making unrelated catalog changes wait for every sale.
    seen = set()
    for previous in LocalOperation.objects.exclude(status="done").order_by("-sequence"):
        overlap = needed.intersection(previous.resources) - seen
        if overlap:
            dependencies.append(str(previous.id))
            seen.update(overlap)
    row = LocalOperation.objects.create(user_id=user_id, tenant_id=tenant_id, title=title,
                                         payload=payload, resources=sorted(resources), dependencies=dependencies)
    row.payload.update(id=str(row.id), dependencies=dependencies)
    row.save(update_fields=["payload"])
    transaction.on_commit(wake_worker.set)
    return row


def queue_status():
    rows = ordered_operations(LocalOperation.objects.exclude(status="done"))
    ids = {str(row.id): row for row in rows}
    result = []
    for row in rows:
        blocked = any(dep in ids and ids[dep].status in {"error", "blocked"} for dep in row.dependencies)
        result.append({"id": str(row.id), "title": row.title, "status": "blocked" if blocked else row.status,
                       "priority": row.priority, "sequence": row.sequence, "error": row.error,
                       "dependencies": row.dependencies, "created_at": row.created_at.isoformat(),
                       "attempts": row.attempts})
    return {**activity, "operations": result, "last_sync": get_state("last_sync"),
            "enrolled": bool(get_state("device")), "protocol": 1}
