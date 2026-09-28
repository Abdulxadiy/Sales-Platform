from decimal import Decimal
from django.db import models
from apps.core.models import BaseModel


class DebtPayment(BaseModel):
    CURRENCY_UZS = 'UZS'
    CURRENCY_USD = 'USD'
    CURRENCY_CHOICES = [
        (CURRENCY_UZS, 'UZS'),
        (CURRENCY_USD, 'USD'),
    ]

    counterparty = models.ForeignKey(
        'sales.Counterparty',
        on_delete=models.PROTECT,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=CURRENCY_UZS)
    paid_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='recorded_debt_payments',
    )
    is_correction = models.BooleanField(default=False)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ['-paid_at']

    def __str__(self):
        corr = ' [Korrektirovka]' if self.is_correction else ''
        return f"{self.counterparty.name} | {self.amount} {self.currency}{corr}"
