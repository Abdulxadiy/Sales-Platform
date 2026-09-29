from decimal import Decimal
import pytest
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from apps.catalog.services import ProductService
from apps.inventory.services import StockService
from apps.sales.models import Sale, SaleItem, Counterparty
from tests.factories import (
    TenantFactory,
    OwnerFactory,
    StaffFactory,
    EmployeeFactory,
    CategoryFactory,
)

pytestmark = pytest.mark.django_db

INTERNAL_TOKEN = "test-internal-token-12345"


@pytest.fixture(autouse=True)
def set_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_SERVICE_TOKEN", INTERNAL_TOKEN)


@pytest.fixture
def internal_client():
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Internal {INTERNAL_TOKEN}")
    return client


def test_internal_service_authentication():
    client = APIClient()
    url = "/api/v1/internal/shop/tenants/1/products/"

    # No token -> 403
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # Wrong token -> 403
    client.credentials(HTTP_AUTHORIZATION="Internal wrong-token")
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_shop_tenant_products_list_and_detail(internal_client, tenant, owner):
    cat = CategoryFactory(tenant=tenant, name="Books")
    p1 = ProductService.create(
        tenant=tenant,
        name="Python Book",
        category=cat,
        price_partner=Decimal("50000"),
        price_min=Decimal("60000"),
        price_recommended=Decimal("80000"),
    )
    v1 = p1.variants.first()
    # Give stock to v1
    StockService.intake(
        tenant=tenant,
        product_variant=v1,
        quantity=Decimal("15.000"),
        cost_price=Decimal("45000"),
        created_by=owner,
    )

    # 1. List products
    resp = internal_client.get(f"/api/v1/internal/shop/tenants/{tenant.id}/products/")
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.data) == 1
    item = resp.data[0]
    assert item["product_name"] == "Python Book"
    assert item["price"] == "80000.00"
    assert item["stock_quantity"] == "15.000"

    # 2. Detail view
    detail_resp = internal_client.get(f"/api/v1/internal/shop/tenants/{tenant.id}/products/{v1.id}/")
    assert detail_resp.status_code == status.HTTP_200_OK
    assert detail_resp.data["id"] == v1.id
    assert detail_resp.data["price"] == "80000.00"


def test_shop_order_deduct_success_and_failure(internal_client, tenant, owner):
    cat = CategoryFactory(tenant=tenant)
    p = ProductService.create(
        tenant=tenant,
        name="Smart Watch",
        category=cat,
        price_partner=Decimal("150000"),
        price_min=Decimal("180000"),
        price_recommended=Decimal("220000"),
    )
    variant = p.variants.first()
    StockService.intake(
        tenant=tenant,
        product_variant=variant,
        quantity=Decimal("5.000"),
        cost_price=Decimal("140000"),
        created_by=owner,
    )

    deduct_url = f"/api/v1/internal/shop/tenants/{tenant.id}/order-deduct/"

    # 1. Successful deduction
    payload = {
        "order_id": "SHOP-1001",
        "customer_phone": "+998901112233",
        "customer_name": "Islom Karimov",
        "payment_type": "card",
        "items": [
            {
                "product_variant_id": variant.id,
                "quantity": "2.000",
                "unit_price": "220000.00",
            }
        ],
    }

    resp = internal_client.post(deduct_url, payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.data["status"] == "success"
    assert resp.data["order_id"] == "SHOP-1001"

    # Verify stock decreased: 5 - 2 = 3
    variant.stock.refresh_from_db()
    assert variant.stock.quantity == Decimal("3.000")

    # Verify counterparty created
    cp = Counterparty.objects.filter(tenant=tenant, phone_number="+998901112233").first()
    assert cp is not None

    # 2. Failure: Insufficient stock (requesting 10 when only 3 remain)
    fail_payload = {
        "order_id": "SHOP-1002",
        "customer_phone": "+998901112233",
        "payment_type": "card",
        "items": [
            {
                "product_variant_id": variant.id,
                "quantity": "10.000",
                "unit_price": "220000.00",
            }
        ],
    }
    fail_resp = internal_client.post(deduct_url, fail_payload, format="json")
    assert fail_resp.status_code == status.HTTP_400_BAD_REQUEST
    assert fail_resp.data["error"]["code"] == "order_deduct_failed"
