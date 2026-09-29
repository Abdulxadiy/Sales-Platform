from django.db import models


class BaseModel(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditAction(models.TextChoices):
    PRICE_CHANGE = "price_change", "Price Change"
    EMPLOYEE_HIRE = "employee_hire", "Employee Hire"
    EMPLOYEE_FIRE = "employee_fire", "Employee Fire"
    OWNER_TRANSFER = "owner_transfer", "Owner Transfer"
    VOID_SALE = "void_sale", "Void Sale"
    STOCK_ADJUSTMENT = "stock_adjustment", "Stock Adjustment"
    CASH_DISCREPANCY = "cash_discrepancy", "Cash Discrepancy"
    LOGIN_ATTEMPT = "login_attempt", "Login Attempt"
    PASSWORD_RESET = "password_reset", "Password Reset"


class ImmutableAuditLogQuerySet(models.QuerySet):
    def delete(self):
        from django.core.exceptions import ValidationError
        raise ValidationError("AuditLog entries cannot be deleted.")

    def update(self, **kwargs):
        from django.core.exceptions import ValidationError
        raise ValidationError("AuditLog entries cannot be updated.")


class AuditLog(models.Model):
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        db_index=True,
    )
    actor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(
        max_length=50,
        choices=AuditAction.choices,
        db_index=True,
    )
    target_model = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = ImmutableAuditLogQuerySet.as_manager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'action', '-created_at']),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            from django.core.exceptions import ValidationError
            raise ValidationError("AuditLog entries are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        from django.core.exceptions import ValidationError
        raise ValidationError("AuditLog entries are append-only and cannot be deleted.")

    def __str__(self):
        return f"[{self.created_at}] {self.action} by {self.actor_id or 'System'} (Tenant: {self.tenant_id})"