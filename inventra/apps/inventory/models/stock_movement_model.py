from django.db import models
from apps.core.models import BaseModel


class StockMovement(BaseModel):
    TYPE_KIRIM = "kirim"
    TYPE_SOTUV = "sotuv"
    TYPE_MIJOZ_QAYTARDI = "mijoz_qaytardi"
    TYPE_YETKAZIB_BERUVCHIGA_QAYTARISH = "yetkazib_beruvchiga_qaytarish"
    TYPE_ISROFGARCHILIK = "isrofgarchilik"
    TYPE_TUZATISH = "tuzatish"

    TYPE_CHOICES = [
        (TYPE_KIRIM, "Kirim"),
        (TYPE_SOTUV, "Sotuv"),
        (TYPE_MIJOZ_QAYTARDI, "Mijoz qaytardi"),
        (TYPE_YETKAZIB_BERUVCHIGA_QAYTARISH, "Yetkazib beruvchiga qaytarish"),
        (TYPE_ISROFGARCHILIK, "Isrofgarchilik"),
        (TYPE_TUZATISH, "Tuzatish"),
    ]

    DIRECTION_IN = "in"
    DIRECTION_OUT = "out"
    DIRECTION_CHOICES = [
        (DIRECTION_IN, "Kirim"),
        (DIRECTION_OUT, "Chiqim"),
    ]

    product_variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    direction = models.CharField(max_length=3, choices=DIRECTION_CHOICES)

    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    note = models.TextField(blank=True)

    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="stock_movements"
    )


    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="stock_movement_quantity_positive"
            ),
        ]
        ordering = ["-created_at"]


    def __str__(self):
        sign = "+" if self.direction == self.DIRECTION_IN else "-"
        return f"{self.product_variant} | {sign}{self.quantity} ({self.type})"