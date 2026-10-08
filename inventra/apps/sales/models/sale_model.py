from decimal import Decimal
from django.db import models
from apps.core.models import BaseModel


class Sale(BaseModel):
    CURRENCY_UZS = 'UZS'
    CURRENCY_USD = 'USD'
    CURRENCY_CHOICES = [
        (CURRENCY_UZS, 'UZS'),
        (CURRENCY_USD, 'USD'),
    ]

    PAYMENT_CASH = 'cash'
    PAYMENT_CARD = 'card'
    PAYMENT_DEBT = 'debt'
    PAYMENT_CHOICES = [
        (PAYMENT_CASH, 'Naqd'),
        (PAYMENT_CARD, 'Karta'),
        (PAYMENT_DEBT, 'Nasiya'),
    ]

    STATUS_COMPLETED = 'completed'
    STATUS_PARTIALLY_VOIDED = 'partially_voided'
    STATUS_VOIDED = 'voided'
    STATUS_B2B_PENDING = 'b2b_pending'
    STATUS_B2B_PARTIALLY_ACCEPTED = 'b2b_partially_accepted'
    STATUS_B2B_ACCEPTED = 'b2b_accepted'
    STATUS_B2B_REJECTED = 'b2b_rejected'
    STATUS_CHOICES = [
        (STATUS_COMPLETED, 'Tugallangan'),
        (STATUS_PARTIALLY_VOIDED, 'Qisman bekor qilingan'),
        (STATUS_VOIDED, 'Bekor qilingan'),
        (STATUS_B2B_PENDING, 'B2B Kutilmoqda'),
        (STATUS_B2B_PARTIALLY_ACCEPTED, 'B2B Qisman qabul qilingan'),
        (STATUS_B2B_ACCEPTED, 'B2B Qabul qilingan'),
        (STATUS_B2B_REJECTED, 'B2B Rad etilgan'),
    ]

    receipt_number = models.CharField(max_length=32)
    branch = models.ForeignKey(
        'tenants.Branch',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='sales',
    )
    sold_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='sales'
    )
    counterparty = models.ForeignKey(
        'sales.Counterparty',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='sales',
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=CURRENCY_UZS)
    is_partner_sale = models.BooleanField(default=False)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    payment_type = models.CharField(max_length=10, choices=PAYMENT_CHOICES, default=PAYMENT_CASH)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_COMPLETED)

    b2b_target_tenant = models.ForeignKey(
        'tenants.Tenant',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='incoming_b2b_sales',
    )
    b2b_expires_at = models.DateTimeField(null=True, blank=True)
    b2b_reject_reason = models.TextField(blank=True)

    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        'accounts.User',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='voided_sales',
    )
    void_reason = models.TextField(blank=True)

    idempotency_key = models.CharField(max_length=64, blank=True, null=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'receipt_number'],
                name='unique_sale_receipt_number_per_tenant',
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.receipt_number} ({self.total_amount} {self.currency})"
