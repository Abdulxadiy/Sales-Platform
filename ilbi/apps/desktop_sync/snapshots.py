"""A tenant replica, excluding passwords, bot tokens and unrelated store records."""

import json

from django.apps import apps
from django.core import serializers
from django.db import connection, transaction
from rest_framework.exceptions import PermissionDenied

from apps.accounts.services.tenant_context_service import resolve_active_context

from .protocol import LOCAL_ID_START, PROTOCOL

LABELS = [
    "accounts.user",
    "tenants.sellerprofile",
    "tenants.tenant",
    "permissions.permission",
    "accounts.employee",
    "tenants.cbuexchangerate",
    "catalog.category",
    "catalog.product",
    "catalog.productimage",
    "catalog.productvariant",
    "inventory.stock",
    "inventory.stockbatch",
    "sales.counterparty",
    "cashbox.cashshift",
    "sales.sale",
    "sales.saleitem",
    "sales.salerefund",
    "inventory.stockmovement",
    "inventory.batchallocation",
    "sales.debtpayment",
    "sales.salevoidlog",
    "cashbox.dailycashreport",
    "cashbox.cashexpense",
    "cashbox.cashincome",
    "sales.notification",
    "core.auditlog",
    "core.workspacereminder",
    "catalog.catalogimportjob",
    "sales.counterpartyimportjob",
]


def authorize(user, tenant_id):
    context = resolve_active_context(user, str(tenant_id))
    if context.tenant is None:
        raise PermissionDenied("Faol do‘kon a’zoligi kerak.")
    # A full local replica contains cost/accounting data. Provisioning is an owner
    # operation rather than an alternative route around employee field permissions.
    if not context.employee.is_owner:
        raise PermissionDenied("Offline bazani tayyorlash uchun do‘kon egasi kirishi kerak.")
    return context.tenant


def export_snapshot(tenant):
    from .revisions import revision_for

    snapshot_revision = revision_for(tenant.pk)
    selected = {}
    for label in LABELS:
        model = apps.get_model(label)
        names = {f.name for f in model._meta.fields}
        if label == "tenants.tenant":
            qs = model.objects.filter(pk=tenant.pk)
        elif label in {"permissions.permission", "tenants.cbuexchangerate"}:
            qs = model.objects.all()
        elif "tenant" in names:
            qs = model.objects.filter(tenant_id=tenant.pk)
        elif label == "inventory.batchallocation":
            qs = model.objects.filter(movement__tenant_id=tenant.pk)
        else:
            qs = model.objects.none()
        for obj in qs:
            selected[(label, obj.pk)] = obj
    # Include only referenced identities/partner headings, never other tenants'
    # stock, sales, employees or accounting records.
    pending = list(selected.values())
    while pending:
        obj = pending.pop()
        for field in obj._meta.fields:
            if not field.is_relation or not getattr(obj, field.attname, None):
                continue
            model = field.remote_field.model
            label = model._meta.label_lower
            key = (label, getattr(obj, field.attname))
            if key not in selected and label in LABELS:
                related = model.objects.filter(pk=key[1]).first()
                if related:
                    selected[key] = related
                    pending.append(related)
    rows = json.loads(serializers.serialize("json", selected.values()))
    for row in rows:
        if row["model"] == "accounts.user":
            row["fields"].update(
                is_superuser=False,
                is_staff=False,
                groups=[],
                user_permissions=[],
            )
            row["fields"]["password"] = "!desktop-no-cloud-password"
            row["fields"].pop("terms_accepted_ip", None)
        if row["model"] == "tenants.sellerprofile":
            row["fields"]["reviewed_by"] = None
    return {"protocol": PROTOCOL, "tenant_id": tenant.pk, "revision": snapshot_revision, "rows": rows}


@transaction.atomic
def import_snapshot(snapshot):
    from django.conf import settings

    if not getattr(settings, "DESKTOP_MODE", False):
        raise RuntimeError("Snapshot import is restricted to the isolated desktop database")
    if snapshot.get("protocol") != PROTOCOL or any(row["model"] not in LABELS for row in snapshot["rows"]):
        raise ValueError("Dastur va server versiyalari mos emas.")
    from .models import LocalOperation, LocalState

    if LocalOperation.objects.exclude(status="done").exists():
        raise ValueError("Yuborilmagan operatsiyalar bor; mahalliy baza almashtirilmadi.")
    aliases = {}
    for result in LocalOperation.objects.filter(status="done").values_list("result", flat=True):
        aliases.update(result.get("id_map", {}))
    # Deferrable FKs allow cyclic sale/stock/accounting references to be restored
    # atomically, without business signals or deletion of the durable outbox.
    with connection.cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL DEFERRED")
        for label in reversed(LABELS):
            model = apps.get_model(label)
            for field in model._meta.local_many_to_many:
                # Identifiers come exclusively from the static model allow-list.
                cursor.execute(f"DELETE FROM {connection.ops.quote_name(field.remote_field.through._meta.db_table)}")  # noqa: S608
            cursor.execute(f"DELETE FROM {connection.ops.quote_name(model._meta.db_table)}")  # noqa: S608
        for item in serializers.deserialize("json", json.dumps(snapshot["rows"]), handle_forward_references=True):
            item.save()
        # One global sequence keeps local IDs unambiguous across all model types.
        cursor.execute("CREATE SEQUENCE IF NOT EXISTS desktop_object_id_seq START WITH %s", [LOCAL_ID_START])
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
        for label in LABELS:
            model = apps.get_model(label)
            if model._meta.pk.get_internal_type() in {"AutoField", "BigAutoField", "SmallAutoField"}:
                table = connection.ops.quote_name(model._meta.db_table)
                column = connection.ops.quote_name(model._meta.pk.column)
                cursor.execute(f"ALTER TABLE {table} ALTER COLUMN {column} DROP IDENTITY IF EXISTS")
                cursor.execute(
                    f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT nextval('desktop_object_id_seq')"
                )
        cursor.execute("SET CONSTRAINTS ALL DEFERRED")
    LocalState.objects.update_or_create(key="aliases", defaults={"value": aliases})
