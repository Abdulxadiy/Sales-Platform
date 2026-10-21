import json
from datetime import timedelta
from uuid import uuid4

import pytest
from django.core import signing
from django.test import override_settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from apps.desktop_sync.cloud import SyncConflict, apply_operation, rewrite
from apps.desktop_sync.local import enqueue, next_operation, ordered_operations, prioritize
from apps.desktop_sync.models import LocalOperation, LocalState, SyncDevice, SyncReceipt
from apps.desktop_sync.protocol import LOCAL_ID_START, allowed, record_changes
from apps.desktop_sync.snapshots import export_snapshot, import_snapshot
from tests.factories import CounterpartyFactory, EmployeeFactory, ProductVariantFactory, StaffFactory, TenantFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def device(owner, tenant):
    return SyncDevice.objects.create(user_id=owner.pk, tenant_id=tenant.pk, name="Test desktop",
                                     token_version=owner.token_version, lease_until=timezone.now() + timedelta(days=7))


def command(device, path="sales/counterparties/", body=None, **extra):
    ticket = signing.dumps({"device_id": str(device.pk), "user_id": device.user_id,
                            "token_version": device.token_version}, salt="ilbi-offline-actor", compress=True)
    return {"id": str(uuid4()), "path": path, "method": "POST", "body": body or {"name": "Offline mijoz"},
            "created": [], "dependencies": [], "actor_ticket": ticket, "occurred_at": timezone.now().isoformat(), **extra}


def local_row(tenant, owner, **values):
    return LocalOperation.objects.create(user_id=owner.pk, tenant_id=tenant.pk, title="Savdo", payload={}, **values)


def test_lost_ack_replay_is_exactly_once(owner, tenant, device):
    payload = command(device, created=[{"model": "sales.counterparty", "id": LOCAL_ID_START, "fields": {}}])
    first = apply_operation(owner, device.pk, payload)
    second = apply_operation(owner, device.pk, payload)
    assert first == second
    from apps.sales.models import Counterparty
    assert Counterparty.objects.filter(tenant=tenant, name="Offline mijoz").count() == 1
    assert SyncReceipt.objects.filter(device=device).count() == 1
    assert first["id_map"][str(LOCAL_ID_START)] < LOCAL_ID_START


def test_changed_duplicate_is_rejected(owner, device):
    payload = command(device)
    apply_operation(owner, device.pk, payload)
    payload["body"]["name"] = "Boshqa mijoz"
    with pytest.raises(SyncConflict):
        apply_operation(owner, device.pk, payload)


def test_dependency_and_created_id_remapping(owner, tenant, device):
    first = command(device, created=[{"model": "sales.counterparty", "id": LOCAL_ID_START, "fields": {}}])
    second = command(device, path=f"sales/counterparties/{LOCAL_ID_START}/", method="PATCH",
                     body={"name": "Yangi ism"}, dependencies=[first["id"]])
    with pytest.raises(SyncConflict):
        apply_operation(owner, device.pk, second)
    result = apply_operation(owner, device.pk, first)
    apply_operation(owner, device.pk, second)
    from apps.sales.models import Counterparty
    assert Counterparty.objects.get(pk=result["id_map"][str(LOCAL_ID_START)]).name == "Yangi ism"


def test_web_edit_conflict_does_not_erase_data(owner, tenant, device):
    cp = CounterpartyFactory(tenant=tenant, name="Webdagi yangi ism")
    payload = command(device, path=f"sales/counterparties/{cp.pk}/", method="PATCH", body={"name": "Offline ism"},
                      preconditions=[{"model": "sales.counterparty", "id": cp.pk, "fields": {"name": "Eski ism"}}])
    with pytest.raises(SyncConflict):
        apply_operation(owner, device.pk, payload)
    cp.refresh_from_db()
    assert cp.name == "Webdagi yangi ism"
    assert not SyncReceipt.objects.filter(operation_id=payload["id"]).exists()


def test_device_and_tenant_isolation(owner, tenant, device):
    other = TenantFactory()
    with pytest.raises(PermissionDenied):
        apply_operation(other.owner, device.pk, command(device))
    assert not SyncReceipt.objects.exists()


def test_revoked_actor_is_rejected(owner, tenant, device):
    staff = StaffFactory()
    employee = EmployeeFactory(user=staff, tenant=tenant)
    payload = command(device)
    payload["actor_ticket"] = signing.dumps({"device_id": str(device.pk), "user_id": staff.pk,
                                              "token_version": staff.token_version}, salt="ilbi-offline-actor", compress=True)
    employee.is_active = False
    employee.save()
    with pytest.raises(PermissionDenied):
        apply_operation(owner, device.pk, payload)


def test_actor_permissions_are_not_replaced_by_owners(owner, tenant, device):
    staff = StaffFactory()
    EmployeeFactory(user=staff, tenant=tenant)
    payload = command(device)
    payload["actor_ticket"] = signing.dumps({"device_id": str(device.pk), "user_id": staff.pk,
                                              "token_version": staff.token_version}, salt="ilbi-offline-actor", compress=True)
    with pytest.raises(SyncConflict):
        apply_operation(owner, device.pk, payload)
    assert not SyncReceipt.objects.exists()


def test_priority_preserves_active_and_fifo(owner, tenant):
    active = local_row(tenant, owner, status="active")
    normal = local_row(tenant, owner)
    urgent1 = local_row(tenant, owner)
    urgent2 = local_row(tenant, owner)
    prioritize(urgent1.id)
    prioritize(urgent2.id)
    result = ordered_operations(LocalOperation.objects.all())
    assert [row.id for row in result] == [active.id, urgent1.id, urgent2.id, normal.id]
    active.refresh_from_db()
    assert active.status == "active" and active.payload == {}


def test_priority_brings_dependency_first(owner, tenant):
    unrelated = local_row(tenant, owner)
    parent = local_row(tenant, owner)
    child = local_row(tenant, owner, dependencies=[str(parent.id)])
    prioritize(child.id)
    assert [row.id for row in ordered_operations(LocalOperation.objects.all())] == [parent.id, child.id, unrelated.id]
    assert next_operation().id == parent.id
    parent.status = "error"
    parent.save()
    assert next_operation().id == unrelated.id


def test_shared_stock_dependency_is_automatic(owner, tenant):
    first = enqueue(user_id=owner.pk, tenant_id=tenant.pk, payload={}, resources={"inventory.stock:1"}, references=set(), title="Savdo")
    second = enqueue(user_id=owner.pk, tenant_id=tenant.pk, payload={}, resources={"inventory.stock:1"}, references=set(), title="Qaytarish")
    third = enqueue(user_id=owner.pk, tenant_id=tenant.pk, payload={}, resources={"catalog.product:2"}, references=set(), title="Tahrir")
    assert second.dependencies == [str(first.id)]
    assert third.dependencies == []


def test_snapshot_excludes_passwords_and_unrelated_stores(owner, tenant):
    other = TenantFactory()
    foreign_variant = ProductVariantFactory(product__category__tenant=other)
    local_variant = ProductVariantFactory(product__category__tenant=tenant)
    snapshot = export_snapshot(tenant)
    objects = {(row["model"], row["pk"]) for row in snapshot["rows"]}
    assert ("catalog.productvariant", local_variant.pk) in objects
    assert ("catalog.productvariant", foreign_variant.pk) not in objects
    assert ("tenants.tenant", other.pk) not in objects
    for row in snapshot["rows"]:
        if row["model"] == "accounts.user":
            assert row["fields"]["password"].startswith("!")
            assert not row["fields"]["is_superuser"]


def test_snapshot_import_cannot_touch_cloud(owner, tenant):
    with pytest.raises(RuntimeError):
        import_snapshot(export_snapshot(tenant))


def test_snapshot_import_retains_queue_and_reserved_ids(owner, tenant):
    snapshot = export_snapshot(tenant)
    row = local_row(tenant, owner)
    with override_settings(DESKTOP_MODE=True):
        with pytest.raises(ValueError):
            import_snapshot(snapshot)
        row.status = "done"
        row.save()
        import_snapshot(snapshot)
    assert LocalOperation.objects.filter(id=row.id, status="done").exists()
    from apps.sales.models import Counterparty
    new = Counterparty.objects.create(tenant_id=tenant.pk, name="Local")
    assert new.pk >= LOCAL_ID_START


def test_forbidden_replay_routes():
    for path in ["auth/change-password/", "internal/shop/orders/", "platform/accounts/", "sales/b2b/1/accept/", "../tenants/1/"]:
        assert not allowed("POST", path)
    assert allowed("POST", "catalog/products/1000000000000/variants/")


def test_id_rewrite_preserves_money_and_barcode():
    result = rewrite({"category": LOCAL_ID_START, "amount": LOCAL_ID_START, "barcode": str(LOCAL_ID_START),
                      "items": [{"product_variant_id": LOCAL_ID_START}]}, {str(LOCAL_ID_START): 17})
    assert result == {"category": 17, "amount": LOCAL_ID_START, "barcode": str(LOCAL_ID_START), "items": [{"product_variant_id": 17}]}


def test_one_primary_per_store_but_independent_stores_can_enroll(owner, tenant):
    client = APIClient()
    client.force_authenticate(owner)
    first = client.post("/api/v1/sync/devices/", {"protocol": 1, "tenant_id": tenant.pk}, format="json")
    assert first.status_code == 200, first.data
    assert client.post("/api/v1/sync/devices/", {"protocol": 1, "tenant_id": tenant.pk}, format="json").status_code == 400


def test_cash_income_replay_keeps_historical_time(owner, tenant, device):
    from apps.cashbox.models import CashIncome
    instant = timezone.now() - timedelta(minutes=1)
    device.created_at = instant - timedelta(minutes=1)
    device.save(update_fields=["created_at"])
    payload = command(device, path="cashbox/income/", body={"amount": "15000", "currency": "UZS", "source": "Offline kirim"},
                      occurred_at=instant.isoformat())
    apply_operation(owner, device.pk, payload)
    income = CashIncome.objects.get(tenant=tenant)
    assert income.created_at == instant
    assert str(income.amount) == "15000.00"
