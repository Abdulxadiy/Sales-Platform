import uuid

from django.db import models


class SyncDevice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.BigIntegerField()
    tenant_id = models.BigIntegerField()
    name = models.CharField(max_length=100)
    token_version = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    lease_until = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)


class SyncReceipt(models.Model):
    device = models.ForeignKey(SyncDevice, on_delete=models.PROTECT)
    operation_id = models.UUIDField()
    fingerprint = models.CharField(max_length=64)
    result = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["device", "operation_id"], name="sync_receipt_device_operation")]


class LocalOperation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.BigAutoField(unique=True)
    user_id = models.BigIntegerField()
    tenant_id = models.BigIntegerField()
    title = models.CharField(max_length=200)
    payload = models.JSONField()
    dependencies = models.JSONField(default=list)
    resources = models.JSONField(default=list)
    status = models.CharField(max_length=20, default="waiting", db_index=True)
    priority = models.PositiveBigIntegerField(default=0)
    attempts = models.PositiveIntegerField(default=0)
    next_attempt_at = models.DateTimeField(null=True)
    error = models.TextField(blank=True)
    result = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True)

    class Meta:
        ordering = ["sequence"]


class LocalState(models.Model):
    key = models.CharField(max_length=80, primary_key=True)
    value = models.JSONField(default=dict)
