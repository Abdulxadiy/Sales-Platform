from decimal import Decimal
from django.db import models
from apps.core.models import BaseModel


class SaleItem(BaseModel):
    STATUS_ACTIVE = 'active'
    STATUS_PARTIALLY_VOIDED = 'partially_voided'
    STATUS_VOIDED = 'voided'
    STATUS_B2B_ACCEPTED = 'b2b_accepted'
    STATUS_B2B_REJECTED = 'b2b_rejected'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Faol'),
        (STATUS_PARTIALLY_VOIDED, 'Qisman bekor qilingan'),
        (STATUS_VOIDED, 'Bekor qilingan'),
        (STATUS_B2B_ACCEPTED, 'B2B Qabul qilingan'),
        (STATUS_B2B_REJECTED, 'B2B Rad etilgan'),
    ]

    sale = models.ForeignKey(
        'sales.Sale', on_delete=models.CASCADE, related_name='items'
    )
    product_variant = models.ForeignKey(
        'catalog.ProductVariant', on_delete=models.PROTECT, related_name='sale_items'
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    original_partner_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    total_price = models.DecimalField(max_digits=14, decimal_places=2)

    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    voided_quantity = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal('0.000')
    )
    b2b_accepted_quantity = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal('0.000')
    )
    b2b_rejected_quantity = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal('0.000')
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name='sale_item_quantity_positive',
            )
        ]

    def __str__(self):
        return f"{self.product_variant} x {self.quantity} @ {self.unit_price}"
