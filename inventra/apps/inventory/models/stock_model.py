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
    branch = models.ForeignKey(
        "tenants.Branch", on_delete=models.CASCADE, related_name="stocks", null=True, blank=True
    )
    product_variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.CASCADE, related_name="stocks"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal('0'))
    last_cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    # Branch-specific prices
    custom_price_recommended = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Filial uchun maxsus tavsiya etilgan sotuv narxi",
    )
    custom_price_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Filial uchun maxsus minimal narx",
    )
    custom_price_partner = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Filial uchun maxsus hamkor narxi",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "product_variant"],
                name="unique_stock_per_branch_variant",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=0), name="stock_quantity_never_negative"
            ),
        ]

    def __str__(self):
        return f"{self.product_variant} ({self.branch.name}) -- {self.quantity}"

    @property
    def effective_price_recommended(self):
        if self.custom_price_recommended is not None:
            return self.custom_price_recommended
        return self.product_variant.price_recommended

    @property
    def effective_price_min(self):
        if self.custom_price_min is not None:
            return self.custom_price_min
        return self.product_variant.price_min

    @property
    def effective_price_partner(self):
        if self.custom_price_partner is not None:
            return self.custom_price_partner
        return self.product_variant.price_partner