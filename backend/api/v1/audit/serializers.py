from rest_framework import serializers

from apps.core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True, default=None)
    actor_phone = serializers.CharField(source="actor.phone_number", read_only=True, default=None)
    actor_name = serializers.CharField(source="actor.first_name", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "actor",
            "actor_phone",
            "actor_name",
            "action",
            "target_model",
            "target_id",
            "changes",
            "description",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields
