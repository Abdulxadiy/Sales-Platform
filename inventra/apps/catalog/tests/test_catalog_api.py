from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.permissions.models import Permission
from tests.factories import CategoryFactory, EmployeeFactory, StaffFactory, TenantFactory

pytestmark = pytest.mark.django_db

CATEGORIES_URL = "/api/v1/catalog/categories/"
PRODUCTS_URL = "/api/v1/catalog/products/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_with_permission(tenant):
    """A staff member with an active Employee record in `tenant`, granted
    every catalog permission -- the common case most tests want."""
    user = StaffFactory()
    employee = EmployeeFactory(user=user, tenant=tenant, is_active=True)
    employee.permissions.set(Permission.objects.filter(category="catalog"))
    return user


class TestPlatformAdminIsBlocked:
    def test_platform_admin_cannot_list_categories(self, api_client, platform_admin):
        api_client.force_authenticate(user=platform_admin)
        response = api_client.get(CATEGORIES_URL)
        assert response.status_code == 403

    def test_platform_admin_cannot_create_a_product(self, api_client, platform_admin):
        api_client.force_authenticate(user=platform_admin)
        response = api_client.post(PRODUCTS_URL, {"name": "X"})
        assert response.status_code == 403


class TestPermissionEnforcement:
    def test_staff_with_no_permission_at_all_is_denied(self, api_client, tenant):
        user = StaffFactory()
        EmployeeFactory(user=user, tenant=tenant, is_active=True)  # no permissions granted
        api_client.force_authenticate(user=user)

        response = api_client.get(CATEGORIES_URL)
        assert response.status_code == 403

    def test_view_permission_does_not_grant_add(self, api_client, tenant):
        user = StaffFactory()
        employee = EmployeeFactory(user=user, tenant=tenant, is_active=True)
        employee.permissions.add(
            Permission.objects.get(category="catalog", codename="view_category")
        )
        api_client.force_authenticate(user=user)

        get_response = api_client.get(CATEGORIES_URL)
        post_response = api_client.post(CATEGORIES_URL, {"name": "Ichimliklar"})

        assert get_response.status_code == 200
        assert post_response.status_code == 403

    def test_owner_bypasses_permission_grants_entirely(self, api_client, owner, tenant):
        # Owner never needs an explicit Permission row -- PermissionService
        # grants them everything within their own tenant automatically.
        api_client.force_authenticate(user=owner)
        response = api_client.post(CATEGORIES_URL, {"name": "Ichimliklar"})
        assert response.status_code == 201


class TestTenantIsolation:
    def test_owner_cannot_see_another_tenants_categories(self, api_client, owner, tenant):
        other_tenant = TenantFactory()
        CategoryFactory(tenant=other_tenant, name="Boshqa do'kon kategoriyasi")
        CategoryFactory(tenant=tenant, name="Mening kategoriyam")

        api_client.force_authenticate(user=owner)
        response = api_client.get(CATEGORIES_URL)

        names = [c["name"] for c in response.data]
        assert "Mening kategoriyam" in names
        assert "Boshqa do'kon kategoriyasi" not in names

    def test_fetching_another_tenants_category_by_id_is_404_not_403(self, api_client, owner, tenant):
        # Must not leak existence -- see CategoryDetailView docstring.
        other_tenant = TenantFactory()
        foreign_category = CategoryFactory(tenant=other_tenant)

        api_client.force_authenticate(user=owner)
        response = api_client.get(f"{CATEGORIES_URL}{foreign_category.id}/")
        assert response.status_code == 404


class TestCategoryCreateFlow:
    def test_kod_is_not_accepted_from_the_client(self, api_client, staff_with_permission):
        api_client.force_authenticate(user=staff_with_permission)
        response = api_client.post(CATEGORIES_URL, {"name": "Ichimliklar", "kod": "99"})
        assert response.status_code == 201
        # System-assigned, ignores whatever the client sent.
        assert response.data["kod"] == "01"


class TestProductCreateFlow:
    def test_creating_a_product_returns_its_mandatory_first_variant(self, api_client, staff_with_permission, tenant):
        category = CategoryFactory(tenant=tenant, kod="32")
        api_client.force_authenticate(user=staff_with_permission)

        response = api_client.post(PRODUCTS_URL, {
            "name": "Non",
            "category_id": category.id,
            "price_partner": "2000",
            "price_min": "2500",
            "price_recommended": "3000",
        })

        assert response.status_code == 201
        assert len(response.data["variants"]) == 1
        assert response.data["variants"][0]["name"] == "Standart"
        assert response.data["variants"][0]["code"] == "32/2"

    def test_archive_cascades_through_the_api(self, api_client, staff_with_permission, tenant):
        category = CategoryFactory(tenant=tenant, kod="32")
        api_client.force_authenticate(user=staff_with_permission)
        create_response = api_client.post(PRODUCTS_URL, {
            "name": "Non", "category_id": category.id,
            "price_partner": "2000", "price_min": "2500", "price_recommended": "3000",
        })
        product_id = create_response.data["id"]

        archive_response = api_client.post(f"{PRODUCTS_URL}{product_id}/archive/")

        assert archive_response.status_code == 200
        assert archive_response.data["is_active"] is False
        assert archive_response.data["variants"][0]["is_active"] is False
