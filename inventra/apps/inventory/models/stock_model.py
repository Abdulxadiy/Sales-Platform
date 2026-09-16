"""Stock -- the materialized "how much is there right now" balance for
a ProductVariant. Never written to directly: StockService is the only
code allowed to change `quantity`, always in the same transaction as
the StockMovement row that explains why (see stock_movement_model.py).
See Architectures/inventra-yol-xaritasi.md, 9-bosqich (inventory),
for the full design rationale."""

from decimal import Decimal
from django.db import models
from apps.core.models import BaseModel


class Stock(BaseModel):
    product_variant = models.OneToOneField(
        "catalogue.ProductVariant", on_delete=models.CASCADE, related_name="stock"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal('0'))
    last_cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="stock_quantity_never_negative"
            ),
        ]


    def __str__(self):
        return f"{self.product_variant} -- {self.quantity}"