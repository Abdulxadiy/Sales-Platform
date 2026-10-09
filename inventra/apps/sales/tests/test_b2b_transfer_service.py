from datetime import timedelta
from decimal import Decimal
import pytest
from django.utils import timezone

from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.services import StockService
from apps.sales.models import Sale, SaleItem, Notification
from apps.sales.services import SaleService, B2BTransferService, B2BTransferServiceError
from tests.factories import (
    TenantFactory,
    OwnerFactory,
    StaffFactory,
    CategoryFactory,
    ProductFactory,
    ProductVariantFactory,
    CounterpartyFactory,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def b2b_setup(tenant, owner):
    # Tenant A (sender)
    cat_a = CategoryFactory(tenant=tenant, currency="UZS")
    prod_a = ProductFactory(tenant=tenant, category=cat_a, name="Futbolka")
    var_a = ProductVariantFactory(
        tenant=tenant,
        product=prod_a,
        name="Qora L",
        price_partner=Decimal("50000.00"),
    )
    StockService.intake(
        tenant=tenant,
        product_variant=var_a,
        quantity=Decimal("20.000"),
        cost_price=Decimal("40000.00"),
        created_by=owner,
    )

    # Tenant B (receiver)
    b_owner = OwnerFactory()
    b_tenant = TenantFactory(owner=b_owner)
    cat_b = CategoryFactory(tenant=b_tenant, currency="UZS", name="Kiyimlar")

    # Counterparty in A pointing to B
    cp_b = CounterpartyFactory(tenant=tenant, target_tenant=b_tenant)

    # Send B2B sale
    sales = SaleService.create_sale(
        tenant=tenant,
        user=owner,
        items_data=[{"product_variant_id": var_a.id, "quantity": "10", "unit_price": "50000.00"}],
        payment_type="debt",
        counterparty=cp_b,
    )
    b2b_sale = sales[0]

    return {
        "tenant_a": tenant,
        "owner_a": owner,
        "variant_a": var_a,
        "tenant_b": b_tenant,
        "owner_b": b_owner,
        "category_b": cat_b,
        "b2b_sale": b2b_sale,
    }


class TestB2BAcceptTransfer:
    def test_accept_transfer_with_category_selection(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        owner_b = b2b_setup["owner_b"]
        tenant_b = b2b_setup["tenant_b"]
        cat_b = b2b_setup["category_b"]
        item = b2b_sale.items.first()

        accepted_sale = B2BTransferService.accept_transfer(
            sale=b2b_sale,
            accepting_user=owner_b,
            items_payload=[
                {
                    "sale_item_id": item.id,
                    "accepted_quantity": Decimal("10.000"),
                    "target_category_id": cat_b.id,
                }
            ],
        )

        assert accepted_sale.status == Sale.STATUS_B2B_ACCEPTED
        item.refresh_from_db()
        assert item.status == SaleItem.STATUS_B2B_ACCEPTED
        assert item.b2b_accepted_quantity == Decimal("10.000")
        assert item.b2b_rejected_quantity == Decimal("0.000")

        # Product & Variant created in B
        b_product = Product.objects.filter(tenant=tenant_b, name="Futbolka").first()
        assert b_product is not None
        assert b_product.category == cat_b

        b_variant = ProductVariant.objects.filter(tenant=tenant_b, product=b_product).first()
        assert b_variant is not None
        assert b_variant.price_partner == Decimal("0.00")
        assert b_variant.price_recommended == Decimal("0.00")

        # Stock intake in B
        b_variant.stock.refresh_from_db()
        assert b_variant.stock.quantity == Decimal("10.000")
        assert b_variant.stock.last_cost_price == Decimal("50000.00")

        # Notification sent to A
        notif = Notification.objects.filter(
            tenant=b2b_setup["tenant_a"],
            recipient=b2b_setup["owner_a"],
            type=Notification.TYPE_B2B_ACCEPTED,
        ).first()
        assert notif is not None
        assert "B2B transfer qabul qilindi" in notif.title

    def test_accept_transfer_with_existing_variant(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        owner_b = b2b_setup["owner_b"]
        tenant_b = b2b_setup["tenant_b"]
        cat_b = b2b_setup["category_b"]
        item = b2b_sale.items.first()

        # Existing variant in B
        b_prod = ProductFactory(tenant=tenant_b, category=cat_b)
        b_var = ProductVariantFactory(tenant=tenant_b, product=b_prod)

        B2BTransferService.accept_transfer(
            sale=b2b_sale,
            accepting_user=owner_b,
            items_payload=[
                {
                    "sale_item_id": item.id,
                    "accepted_quantity": Decimal("10.000"),
                    "target_variant_id": b_var.id,
                }
            ],
        )

        b_var.stock.refresh_from_db()
        assert b_var.stock.quantity == Decimal("10.000")

    def test_accept_transfer_partial_quantity(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        owner_b = b2b_setup["owner_b"]
        cat_b = b2b_setup["category_b"]
        item = b2b_sale.items.first()

        # Accept 6 out of 10
        accepted_sale = B2BTransferService.accept_transfer(
            sale=b2b_sale,
            accepting_user=owner_b,
            items_payload=[
                {
                    "sale_item_id": item.id,
                    "accepted_quantity": Decimal("6.000"),
                    "target_category_id": cat_b.id,
                }
            ],
        )

        assert accepted_sale.status == Sale.STATUS_B2B_PARTIALLY_ACCEPTED
        item.refresh_from_db()
        assert item.b2b_accepted_quantity == Decimal("6.000")
        assert item.b2b_rejected_quantity == Decimal("4.000")

    def test_accept_with_mismatched_currency_fails(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        owner_b = b2b_setup["owner_b"]
        tenant_b = b2b_setup["tenant_b"]
        item = b2b_sale.items.first()

        # USD category in B while sale is UZS
        usd_cat_b = CategoryFactory(tenant=tenant_b, currency="USD")

        with pytest.raises(B2BTransferServiceError, match="valyutasi transfer valyutasiga mos kelmaydi"):
            B2BTransferService.accept_transfer(
                sale=b2b_sale,
                accepting_user=owner_b,
                items_payload=[
                    {
                        "sale_item_id": item.id,
                        "accepted_quantity": Decimal("10.000"),
                        "target_category_id": usd_cat_b.id,
                    }
                ],
            )

    def test_accept_by_unauthorized_user_fails(self, b2b_setup, staff):
        b2b_sale = b2b_setup["b2b_sale"]
        item = b2b_sale.items.first()
        cat_b = b2b_setup["category_b"]

        with pytest.raises(B2BTransferServiceError, match="Faqat qabul qiluvchi do'kon"):
            B2BTransferService.accept_transfer(
                sale=b2b_sale,
                accepting_user=staff,
                items_payload=[
                    {
                        "sale_item_id": item.id,
                        "accepted_quantity": Decimal("10.000"),
                        "target_category_id": cat_b.id,
                    }
                ],
            )

    def test_accept_expired_transfer_fails(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        owner_b = b2b_setup["owner_b"]
        cat_b = b2b_setup["category_b"]
        item = b2b_sale.items.first()

        # Simulate expiration
        b2b_sale.b2b_expires_at = timezone.now() - timedelta(minutes=5)
        b2b_sale.save(update_fields=["b2b_expires_at"])

        with pytest.raises(B2BTransferServiceError, match="muddati tugagan"):
            B2BTransferService.accept_transfer(
                sale=b2b_sale,
                accepting_user=owner_b,
                items_payload=[
                    {
                        "sale_item_id": item.id,
                        "accepted_quantity": Decimal("10.000"),
                        "target_category_id": cat_b.id,
                    }
                ],
            )

    def test_auto_expire_transfers(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        b2b_sale.b2b_expires_at = timezone.now() - timedelta(hours=1)
        b2b_sale.save(update_fields=["b2b_expires_at"])

        expired_count = B2BTransferService.auto_expire_transfers()
        assert expired_count == 1

        b2b_sale.refresh_from_db()
        assert b2b_sale.status == Sale.STATUS_B2B_REJECTED
        assert "Muddati o'tib ketgan" in b2b_sale.b2b_reject_reason



class TestB2BRejectTransfer:
    def test_reject_transfer_with_reason(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        owner_b = b2b_setup["owner_b"]

        rejected_sale = B2BTransferService.reject_transfer(
            sale=b2b_sale,
            rejecting_user=owner_b,
            reason="Tovarlar sifatsiz va narxi qimmat",
        )

        assert rejected_sale.status == Sale.STATUS_B2B_REJECTED
        assert rejected_sale.b2b_reject_reason == "Tovarlar sifatsiz va narxi qimmat"

        # Stock is returned to tenant A
        var_a = b2b_setup["variant_a"]
        var_a.stock.refresh_from_db()
        assert var_a.stock.quantity == Decimal("20.000")

        # Notification sent to A
        notif = Notification.objects.filter(
            tenant=b2b_setup["tenant_a"],
            recipient=b2b_setup["owner_a"],
            type=Notification.TYPE_B2B_REJECTED,
        ).first()
        assert notif is not None
        assert "rad etildi" in notif.title
        assert "Tovarlar sifatsiz" in notif.message

    def test_reject_without_reason_fails(self, b2b_setup):
        b2b_sale = b2b_setup["b2b_sale"]
        owner_b = b2b_setup["owner_b"]

        with pytest.raises(B2BTransferServiceError, match="sababi kiritilishi shart"):
            B2BTransferService.reject_transfer(
                sale=b2b_sale,
                rejecting_user=owner_b,
                reason="   ",
            )
