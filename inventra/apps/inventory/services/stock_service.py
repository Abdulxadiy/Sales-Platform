from decimal import Decimal
from django.db import transaction
from apps.inventory.models import Stock, StockMovement


class StockServiceError(Exception):
    """
    Raised for invalid Stock/StockMovement operations (e.g .
    insufficient quantity, wrong tenant).
    """


_FIXED_DIRECTION_BY_TYPE = {
    StockMovement.TYPE_KIRIM: StockMovement.DIRECTION_IN,
    StockMovement.TYPE_SOTUV: StockMovement.DIRECTION_OUT,
    StockMovement.TYPE_MIJOZ_QAYTARDI: StockMovement.DIRECTION_IN,
    StockMovement.TYPE_YETKAZIB_BERUVCHIGA_QAYTARISH: StockMovement.DIRECTION_OUT,
    StockMovement.TYPE_ISROFGARCHILIK: StockMovement.DIRECTION_OUT,
}


class StockService:
    @staticmethod
    def _get_or_create_locked_stock(tenant, product_variant):
        """Lazily create the Stock row on first-ever movement (catalog
        never creates it -- see Stock's docstring), and lock it for the
        rest of this transaction so two concurrent movements against
        the same variant can never race each other's balance check."""
        stock, _ = Stock.objects.get_or_create(
            tenant=tenant, product_variant=product_variant, defaults={"quantity": Decimal("0")}
        )
        # get_or_create() doesn't lock on the "got" path -- re-fetch
        # with select_for_update() to guarantee the lock either way.
        stock = Stock.objects.select_for_update().get(pk=stock.pk)
        return stock

    @classmethod
    @transaction.atomic
    def _apply_movement(
            cls, *, tenant, product_variant, type: str, quantity: Decimal,
            direction: str, created_by, cost_price: Decimal=None, note: str="") -> StockMovement:
        if product_variant.tenant_id != tenant.id:
            raise StockServiceError("product_variant must belong to the same tenant.")
        if quantity <= 0:
            raise StockServiceError("quantity must be positive.")

        stock = cls._get_or_create_locked_stock(tenant, product_variant)

        if direction == StockMovement.DIRECTION_OUT:
            if stock.quantity < quantity:
                raise StockServiceError(
                    f"Not enough stock: {stock.quantity} available, {quantity} requested."
                )
            stock.quantity -= quantity
        else:
            stock.quantity += quantity

        if type == StockMovement.TYPE_KIRIM:
            stock.last_cost_price = cost_price
        stock.save(update_fields=["quantity", "last_cost_price", "updated_at"])

        return StockMovement.objects.create(
            tenant=tenant,
            product_variant=product_variant,
            type=type,
            direction=direction,
            quantity=quantity,
            cost_price=cost_price if type == StockMovement.TYPE_KIRIM else None,
            note=note,
            created_by=created_by,
        )
    # -- Public, explicit-verb API -- one method per real-world action,
    # mirroring EmployeeService.hire()/fire() rather than one generic
    # "record_movement(type=...)" entry point. --

    @classmethod
    def  intake(cls, *, tenant, product_variant, quantity, cost_price, created_by, note="") -> StockMovement:
        """A purchase/restock -- the only movement type that carries a
        cost_price, and the only one gated by `add_stock_intake` rather
        than `adjust_stock` (see api/v1/inventory/views)."""
        if cost_price is None:
            raise StockServiceError("cost_price is required for an intake.")
        return cls._apply_movement(
            tenant=tenant, product_variant=product_variant, type=StockMovement.TYPE_KIRIM,
            quantity=quantity, direction=_FIXED_DIRECTION_BY_TYPE[StockMovement.TYPE_KIRIM],
            created_by=created_by, cost_price=cost_price, note=note,
        )
    @classmethod
    def customer_return(cls, *, tenant, product_variant, quantity, created_by, note="") -> StockMovement:
        return cls._apply_movement(
            tenant=tenant, product_variant=product_variant, type=StockMovement.TYPE_MIJOZ_QAYTARDI,
            quantity=quantity, direction=_FIXED_DIRECTION_BY_TYPE[StockMovement.TYPE_MIJOZ_QAYTARDI],
            created_by=created_by, note=note,
        )

    @classmethod
    def supplier_return(cls, *, tenant, product_variant, quantity, created_by, note="") -> StockMovement:
        return cls._apply_movement(
            tenant=tenant, product_variant=product_variant,
            type=StockMovement.TYPE_YETKAZIB_BERUVCHIGA_QAYTARISH, quantity=quantity,
            direction=_FIXED_DIRECTION_BY_TYPE[StockMovement.TYPE_YETKAZIB_BERUVCHIGA_QAYTARISH],
            created_by=created_by, note=note,
        )

    @classmethod
    def write_off(cls, *, tenant, product_variant, quantity, created_by, note="") -> StockMovement:
        """Spoilage/damage/expiry -- goods that leave the shop without
        being sold or returned anywhere."""
        return cls._apply_movement(
            tenant=tenant, product_variant=product_variant, type=StockMovement.TYPE_ISROFGARCHILIK,
            quantity=quantity, direction=_FIXED_DIRECTION_BY_TYPE[StockMovement.TYPE_ISROFGARCHILIK],
            created_by=created_by, note=note,
        )

    @classmethod
    def adjust(cls, *, tenant, product_variant, quantity, direction, created_by, note="") -> StockMovement:
        """An inventory-count correction -- the one type without a fixed
        direction; the caller (a stocktake) says which way it goes."""
        if direction not in (StockMovement.DIRECTION_IN, StockMovement.DIRECTION_OUT):
            raise StockServiceError("direction must be 'in' or 'out' for an adjustment.")
        return cls._apply_movement(
            tenant=tenant, product_variant=product_variant, type=StockMovement.TYPE_TUZATISH,
            quantity=quantity, direction=direction, created_by=created_by, note=note,
        )

    # `sell()` is deliberately not implemented yet -- that's the `sales`
    # app's job once it exists (9-bosqich, band 3). It will call
    # `_apply_movement(type=StockMovement.TYPE_SOTUV, direction="out", ...)`
    # directly rather than through a public StockService method, since a
    # sale is a `sales`-app concept with its own transaction (payment,
    # receipt, etc.) that inventory shouldn't need to know about.
