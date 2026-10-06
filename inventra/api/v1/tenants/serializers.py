"""Serializers for tenant creation and management."""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant

User = get_user_model()


class TenantCreateSerializer(serializers.ModelSerializer):
    """Validate input for creating a tenant with its owner."""

    owner_phone_number = serializers.CharField(max_length=20, required=False, write_only=True)
    # Required e-mail address for the owner to send the password setup magic link.
    owner_email = serializers.EmailField(required=False, allow_blank=False, write_only=True)
    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='owner', required=False, write_only=True
    )

    class Meta:
        model = Tenant
        fields = [
            "id", "name",
            "owner_phone_number", "owner_email", "owner_id",
            "description", "is_active", "created_at",
        ]
        read_only_fields = ["id", "is_active", "created_at"]

    def validate(self, attrs):
        if not attrs.get("owner_phone_number") and not attrs.get("owner"):
            raise serializers.ValidationError(
                "Either owner_phone_number or owner_id must be provided."
            )
        owner_email = attrs.get("owner_email")
        owner_user = attrs.get("owner")
        if not owner_email and not (owner_user and owner_user.email):
            raise serializers.ValidationError(
                {"owner_email": "Do‘kon egasining email manzili majburiy (parol o‘rnatish xabari yuborilishi uchun)."}
            )
        return attrs


class TenantAdminSerializer(serializers.ModelSerializer):
    """Full view for platform_admin. name/description/usd_rate/settings editable via PATCH;
    owner and is_active are changed only through their dedicated endpoints."""

    owner_details = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id", "name", "owner", "owner_details", "description", "is_active",
            "usd_rate", "daily_report_time", "daily_report_target", "shift_report_target",
            "telegram_group_id", "notify_web_reports", "notify_on_sale", "notify_on_debt",
            "receipt_header", "receipt_footer", "receipt_phone", "created_at"
        ]
        read_only_fields = ["id", "owner", "is_active", "created_at"]

    def get_owner_details(self, obj):
        if obj.owner:
            return {
                "id": obj.owner.id,
                "phone_number": obj.owner.phone_number,
                "contact_phone": obj.owner.contact_phone,
                "email": obj.owner.email,
                "first_name": obj.owner.first_name,
                "last_name": obj.owner.last_name,
                "username": obj.owner.username,
            }
        return None


class TenantOwnerSerializer(serializers.ModelSerializer):
    """View for the tenant's own owner. Sees everything, edits settings and description."""

    owner_details = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id", "name", "owner", "owner_details", "description", "is_active",
            "usd_rate", "daily_report_time", "daily_report_target", "shift_report_target",
            "telegram_group_id", "notify_web_reports", "notify_on_sale", "notify_on_debt",
            "receipt_header", "receipt_footer", "receipt_phone", "created_at"
        ]
        read_only_fields = ["id", "name", "owner", "is_active", "created_at"]

    def get_owner_details(self, obj):
        if obj.owner:
            return {
                "id": obj.owner.id,
                "phone_number": obj.owner.phone_number,
                "contact_phone": obj.owner.contact_phone,
                "email": obj.owner.email,
                "first_name": obj.owner.first_name,
                "last_name": obj.owner.last_name,
                "username": obj.owner.username,
            }
        return None


class TenantStaffSerializer(serializers.ModelSerializer):
    """Read-only view for staff."""

    class Meta:
        model = Tenant
        fields = [
            "id", "name", "owner", "description", "is_active",
            "usd_rate", "receipt_header", "receipt_footer", "receipt_phone"
        ]
        read_only_fields = fields


class TenantChangeOwnerSerializer(serializers.Serializer):
    """Validates input for the change-owner endpoint."""
    new_owner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )
    new_owner_phone_number = serializers.CharField(
        max_length=20,
        required=False,
    )
    new_owner_email = serializers.EmailField(
        required=False,
        allow_blank=False,
    )

    def validate(self, attrs):
        new_owner_id = attrs.get('new_owner_id')
        new_phone = attrs.get('new_owner_phone_number')
        new_email = attrs.get('new_owner_email')

        if not new_owner_id and not new_phone:
            raise serializers.ValidationError(
                "Yangi do‘kon egasining ID raqami yoki telefon raqami kiritilishi shart."
            )
        if new_phone and not new_email:
            existing = User.objects.filter(phone_number=new_phone).first()
            if not existing or not existing.email:
                raise serializers.ValidationError(
                    {"new_owner_email": "Yangi egasining email manzili majburiy (parol o‘rnatish xabari yuborilishi uchun)."}
                )
        if new_owner_id and not new_owner_id.email and not new_email:
            raise serializers.ValidationError(
                {"new_owner_email": "Ushbu foydalanuvchida email mavjud emas. Yangi egasining email manzili kiritilishi shart."}
            )
        return attrs
