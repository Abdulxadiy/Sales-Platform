from django.db import models
from apps.core.models import BaseModel


class StockTransfer(BaseModel):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Kutilmoqda"),
        (STATUS_ACCEPTED, "Qabul qilingan"),
        (STATUS_REJECTED, "Rad etilgan"),
    ]

    transfer_number = models.CharField(max_length=32)
    from_branch = models.ForeignKey(
        "tenants.Branch", on_delete=models.PROTECT, related_name="transfers_out"
    )
    to_branch = models.ForeignKey(
        "tenants.Branch", on_delete=models.PROTECT, related_name="transfers_in"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    sent_by = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="sent_transfers"
    )
    sent_at = models.DateTimeField(auto_now_add=True)

    resolved_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.PROTECT, related_name="resolved_transfers"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    note = models.TextField(blank=True, default="")
    reject_reason = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Transfer #{self.transfer_number} ({self.from_branch} -> {self.to_branch}) [{self.status}]"


class StockTransferItem(BaseModel):
    transfer = models.ForeignKey(
        StockTransfer, on_delete=models.CASCADE, related_name="items"
    )
    product_variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.PROTECT, related_name="transfer_items"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="transfer_item_quantity_positive"
            )
        ]

    def __str__(self):
        return f"{self.product_variant} x {self.quantity}"
