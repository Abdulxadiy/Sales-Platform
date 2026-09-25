from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.permissions.models import Permission
from tests.factories import EmployeeFactory, ProductVariantFactory, StaffFactory, TenantFactory

pytestmark = pytest.mark.django_db

STOCK_URL = "/api/v1/inventory/stock/"
INTAKE_URL = "/api/v1/inventory/intake/"
ADJUST_URL = "/api/v1/inventory/adjust/"
WRITE_OFF_URL = "/api/v1/inventory/write-off/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_with_full_inventory_access(tenant):
    user = StaffFactory()
    employee = EmployeeFactory(user=user, tenant=tenant, is_active=True)
    employee.permissions.set(Permission.objects.filter(category="inventory"))
    return user


@pytest.fixture
def staff_with_adjust_only(tenant):
    """Can record returns/write-offs/corrections, but never an intake --
    the exact separation this permission split exists for (2026-09)."""
    user = StaffFactory()
    employee = EmployeeFactory(user=user, tenant=tenant, is_active=True)
    employee.permissions.add(Permission.objects.get(category="inventory", codename="adjust_stock"))
    return user


class TestPlatformAdminIsBlocked:
    def test_platform_admin_cannot_view_stock(self, api_client, platform_admin):
        api_client.force_authenticate(user=platform_admin)
        response = api_client.get(STOCK_URL)
        assert response.status_code == 403


class TestIntakeVsAdjustPermissionSplit:
    def test_adjust_only_staff_cannot_record_an_intake(self, api_client, staff_with_adjust_only, tenant):
        variant = ProductVariantFactory(tenant=tenant)
        api_client.force_authenticate(user=staff_with_adjust_only)

        response = api_client.post(INTAKE_URL, {
            "product_variant_id": variant.id, "quantity": "10", "cost_price": "5000",
        })
        assert response.status_code == 403

    def test_adjust_only_staff_can_record_a_write_off(self, api_client, staff_with_adjust_only, staff_with_full_inventory_access, tenant):
        variant = ProductVariantFactory(tenant=tenant)
        # Seed some stock first, as a fully-permissioned staff member.
        api_client.force_authenticate(user=staff_with_full_inventory_access)
        api_client.post(INTAKE_URL, {"product_variant_id": variant.id, "quantity": "10", "cost_price": "5000"})

        api_client.force_authenticate(user=staff_with_adjust_only)
        response = api_client.post(WRITE_OFF_URL, {"product_variant_id": variant.id, "quantity": "2"})

        assert response.status_code == 201

    def test_full_access_staff_can_do_both(self, api_client, staff_with_full_inventory_access, tenant):
        variant = ProductVariantFactory(tenant=tenant)
        api_client.force_authenticate(user=staff_with_full_inventory_access)

        intake_response = api_client.post(INTAKE_URL, {
            "product_variant_id": variant.id, "quantity": "10", "cost_price": "5000",
        })
        assert intake_response.status_code == 201


class TestNegativeStockBlockedThroughTheAPI:
    def test_write_off_more_than_available_returns_400(self, api_client, staff_with_full_inventory_access, tenant):
        variant = ProductVariantFactory(tenant=tenant)
        api_client.force_authenticate(user=staff_with_full_inventory_access)
        api_client.post(INTAKE_URL, {"product_variant_id": variant.id, "quantity": "3", "cost_price": "1000"})

        response = api_client.post(WRITE_OFF_URL, {"product_variant_id": variant.id, "quantity": "5"})

        assert response.status_code == 400


class TestTenantIsolation:
    def test_owner_cannot_see_another_tenants_stock(self, api_client, owner, tenant):
        other_tenant = TenantFactory()
        other_variant = ProductVariantFactory(tenant=other_tenant)
        mine = ProductVariantFactory(tenant=tenant)

        # Give both tenants some stock.
        staff_a = StaffFactory()
        EmployeeFactory(user=staff_a, tenant=other_tenant, is_active=True)
        from apps.inventory.services import StockService
        StockService.intake(tenant=other_tenant, product_variant=other_variant, quantity=Decimal("9"), cost_price=Decimal("1"), created_by=staff_a)
        StockService.intake(tenant=tenant, product_variant=mine, quantity=Decimal("4"), cost_price=Decimal("1"), created_by=owner)

        api_client.force_authenticate(user=owner)
        response = api_client.get(STOCK_URL)

        variant_ids = [row["product_variant"] for row in response.data]
        assert mine.id in variant_ids
        assert other_variant.id not in variant_ids

    def test_intake_into_another_tenants_variant_is_rejected(self, api_client, staff_with_full_inventory_access):
        foreign_variant = ProductVariantFactory()  # different tenant entirely
        api_client.force_authenticate(user=staff_with_full_inventory_access)

        response = api_client.post(INTAKE_URL, {
            "product_variant_id": foreign_variant.id, "quantity": "1", "cost_price": "1",
        })
        assert response.status_code == 400
        # Validates that tenant isolation is caught at the serializer level.
        assert "product_variant_id" in response.data
        assert "Product variant does not belong to your tenant." in str(response.data["product_variant_id"])

    def test_write_off_into_another_tenants_variant_is_rejected_at_serializer(self, api_client, staff_with_full_inventory_access):
        foreign_variant = ProductVariantFactory()
        api_client.force_authenticate(user=staff_with_full_inventory_access)

        response = api_client.post(WRITE_OFF_URL, {
            "product_variant_id": foreign_variant.id, "quantity": "1",
        })
        assert response.status_code == 400
        assert "product_variant_id" in response.data
        assert "Product variant does not belong to your tenant." in str(response.data["product_variant_id"])



class TestStockDetailForAFreshVariant:
    def test_variant_with_no_movements_yet_shows_zero_not_404(self, api_client, staff_with_full_inventory_access, tenant):
        variant = ProductVariantFactory(tenant=tenant)
        api_client.force_authenticate(user=staff_with_full_inventory_access)

        response = api_client.get(f"{STOCK_URL}{variant.id}/")

        assert response.status_code == 200
        assert response.data["quantity"] == "0.000"
